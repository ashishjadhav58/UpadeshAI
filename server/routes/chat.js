const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Chat = require('../models/Chat');
const vectorStore = require('../../lib/vectorStore');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/** Compact provenance list for API + UI (chapter.verse citations). */
function toSourcesPayload(relevantVerses) {
  return (relevantVerses || []).map((v, i) => ({
    id: v.verse.id,
    reference: v.verse.reference,
    chapter: v.verse.chapter,
    verse: v.verse.verse,
    verseNumber: v.verse.verseNumber,
    translation: v.verse.translation,
    score: v.score,
    role: v.role || (i === 0 ? 'primary' : 'supporting'),
  }));
}

router.post('/message', optionalAuth, async (req, res) => {
  try {
    const { message, sessionId, stream } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const currentSessionId = sessionId || uuidv4();
    const assistantMessageId = uuidv4();

    await vectorStore.initialize();

    // Out-of-scope guardrail: refuse trivia/code/finance/etc. before retrieval
    const scope = await vectorStore.classifyScope(message);
    console.log('Scope check:', scope);
    if (!scope.inScope) {
      const outOfScope = vectorStore.outOfScopeMessage;
      let chat = await Chat.findOne({ sessionId: currentSessionId });
      if (!chat) {
        chat = new Chat({
          sessionId: currentSessionId,
          userId: req.user?._id,
          messages: [],
        });
      }
      chat.messages.push({ role: 'user', content: message });
      chat.messages.push({
        role: 'assistant',
        content: outOfScope,
        shloka: null,
        sources: [],
        messageId: assistantMessageId,
      });
      await chat.save();

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.write(
          `data: ${JSON.stringify({
            type: 'start',
            sessionId: currentSessionId,
            messageId: assistantMessageId,
            topVerse: null,
            sources: [],
            outOfScope: true,
          })}\n\n`
        );
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: outOfScope })}\n\n`);
        res.write(
          `data: ${JSON.stringify({
            type: 'end',
            outOfScope: true,
            sources: [],
            messageId: assistantMessageId,
          })}\n\n`
        );
        return res.end();
      }

      return res.json({
        sessionId: currentSessionId,
        messageId: assistantMessageId,
        response: outOfScope,
        shloka: null,
        sources: [],
        outOfScope: true,
        relevantVerses: [],
      });
    }

    const relevantVerses = await vectorStore.searchSimilarVerses(message, 5);
    const sources = toSourcesPayload(relevantVerses);

    // Low-confidence fallback: no matches cleared the cosine similarity threshold
    if (!relevantVerses.length) {
      const fallback = vectorStore.lowConfidenceFallback;
      let chat = await Chat.findOne({ sessionId: currentSessionId });
      if (!chat) {
        chat = new Chat({
          sessionId: currentSessionId,
          userId: req.user?._id,
          messages: [],
        });
      }
      chat.messages.push({ role: 'user', content: message });
      chat.messages.push({
        role: 'assistant',
        content: fallback,
        shloka: null,
        sources: [],
        messageId: assistantMessageId,
      });
      await chat.save();

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.write(
          `data: ${JSON.stringify({
            type: 'start',
            sessionId: currentSessionId,
            messageId: assistantMessageId,
            topVerse: null,
            sources: [],
            lowConfidence: true,
          })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({ type: 'chunk', text: fallback })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({
            type: 'end',
            lowConfidence: true,
            sources: [],
            messageId: assistantMessageId,
          })}\n\n`
        );
        return res.end();
      }

      return res.json({
        sessionId: currentSessionId,
        messageId: assistantMessageId,
        response: fallback,
        shloka: null,
        sources: [],
        lowConfidence: true,
        relevantVerses: [],
      });
    }

    if (stream) {
      // SSE: tokens as they arrive (Content-Type: text/event-stream)
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      const writeEvent = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      };

      try {
        const {
          stream: responseStream,
          topVerse,
          sources: usedSources,
          lowConfidence,
          response: fallbackText,
        } = await vectorStore.generateResponse(message, relevantVerses, true);

        const streamSources = usedSources || sources;

        if (lowConfidence || !responseStream) {
          const text = fallbackText || vectorStore.lowConfidenceFallback;
          writeEvent({
            type: 'start',
            sessionId: currentSessionId,
            messageId: assistantMessageId,
            topVerse: null,
            sources: [],
            lowConfidence: true,
          });
          writeEvent({ type: 'chunk', text });
          writeEvent({
            type: 'end',
            lowConfidence: true,
            sources: [],
            messageId: assistantMessageId,
          });

          let chatLc = await Chat.findOne({ sessionId: currentSessionId });
          if (!chatLc) {
            chatLc = new Chat({
              sessionId: currentSessionId,
              userId: req.user?._id,
              messages: [],
            });
          }
          chatLc.messages.push({ role: 'user', content: message });
          chatLc.messages.push({
            role: 'assistant',
            content: text,
            shloka: null,
            sources: [],
            messageId: assistantMessageId,
          });
          await chatLc.save();
          return res.end();
        }

        let fullResponse = '';

        // Metadata first so the UI can show citations while tokens stream
        writeEvent({
          type: 'start',
          sessionId: currentSessionId,
          messageId: assistantMessageId,
          topVerse,
          sources: streamSources,
        });

        for await (const chunk of responseStream) {
          const chunkText = chunk.text();
          if (!chunkText) continue;
          fullResponse += chunkText;
          writeEvent({ type: 'chunk', text: chunkText });
        }

        writeEvent({
          type: 'end',
          sources: streamSources,
          messageId: assistantMessageId,
        });
        res.end();

        let chat = await Chat.findOne({ sessionId: currentSessionId });
        if (!chat) {
          chat = new Chat({
            sessionId: currentSessionId,
            userId: req.user?._id,
            messages: [],
          });
        }

        chat.messages.push({ role: 'user', content: message });
        chat.messages.push({
          role: 'assistant',
          content: fullResponse,
          shloka: topVerse,
          sources: streamSources,
          messageId: assistantMessageId,
        });
        await chat.save();
      } catch (streamErr) {
        console.error('Stream error:', streamErr);
        writeEvent({ type: 'error', error: streamErr.message || 'Stream failed' });
        return res.end();
      }
    } else {
      // Non-streaming response
      const { response, topVerse, sources: usedSources, lowConfidence } =
        await vectorStore.generateResponse(message, relevantVerses, false);

      const responseSources = usedSources || sources;

      let chat = await Chat.findOne({ sessionId: currentSessionId });

      if (!chat) {
        chat = new Chat({
          sessionId: currentSessionId,
          userId: req.user?._id,
          messages: [],
        });
      }

      chat.messages.push({
        role: 'user',
        content: message,
      });

      chat.messages.push({
        role: 'assistant',
        content: response,
        shloka: topVerse,
        sources: responseSources,
        messageId: assistantMessageId,
      });

      await chat.save();

      res.json({
        sessionId: currentSessionId,
        messageId: assistantMessageId,
        response,
        shloka: topVerse,
        sources: responseSources,
        lowConfidence: Boolean(lowConfidence),
        relevantVerses: sources,
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:sessionId', optionalAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const chat = await Chat.findOne({ sessionId });

    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    if (chat.userId && req.user && chat.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', optionalAuth, async (req, res) => {
  try {
    // Anonymous: pass ?ids=session1,session2 from localStorage
    const idsParam = req.query.ids;
    if (idsParam) {
      const ids = String(idsParam)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 40);

      if (!ids.length) {
        return res.json([]);
      }

      const chats = await Chat.find({ sessionId: { $in: ids } })
        .sort({ updatedAt: -1 })
        .select('sessionId createdAt updatedAt messages')
        .limit(40);

      const sessions = chats.map((chat) => {
        const firstUser = chat.messages.find((m) => m.role === 'user');
        const last = chat.messages[chat.messages.length - 1];
        return {
          sessionId: chat.sessionId,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messageCount: chat.messages.length,
          title: (firstUser?.content || 'New chat').substring(0, 60),
          lastMessage: last?.content?.substring(0, 100) || '',
        };
      });

      return res.json(sessions);
    }

    if (!req.user) {
      return res.json([]);
    }

    const chats = await Chat.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('sessionId createdAt updatedAt messages')
      .limit(40);

    const sessions = chats.map((chat) => {
      const firstUser = chat.messages.find((m) => m.role === 'user');
      const last = chat.messages[chat.messages.length - 1];
      return {
        sessionId: chat.sessionId,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length,
        title: (firstUser?.content || 'New chat').substring(0, 60),
        lastMessage: last?.content?.substring(0, 100) || '',
      };
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
