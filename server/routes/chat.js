const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Chat = require('../models/Chat');
const vectorStore = require('../../lib/vectorStore');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/message', optionalAuth, async (req, res) => {
  try {
    const { message, sessionId, stream } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const currentSessionId = sessionId || uuidv4();

    await vectorStore.initialize();

    const relevantVerses = await vectorStore.searchSimilarVerses(message, 5);

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { stream: responseStream, topVerse } = await vectorStore.generateResponse(
        message,
        relevantVerses,
        true
      );

      let fullResponse = '';

      // Send initial metadata
      res.write(`data: ${JSON.stringify({ 
        type: 'start', 
        sessionId: currentSessionId,
        topVerse 
      })}\n\n`);

      // Stream chunks
      for await (const chunk of responseStream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        res.write(`data: ${JSON.stringify({ 
          type: 'chunk', 
          text: chunkText 
        })}\n\n`);
      }

      // Send end signal
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();

      // Save to database after streaming
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
        content: fullResponse,
        shloka: topVerse,
      });

      await chat.save();

    } else {
      // Non-streaming response (original behavior)
      const { response, topVerse } = await vectorStore.generateResponse(
        message,
        relevantVerses,
        false
      );

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
      });

      await chat.save();

      res.json({
        sessionId: currentSessionId,
        response,
        shloka: topVerse,
        relevantVerses: relevantVerses.map(v => ({
          verseNumber: v.verse.verseNumber,
          score: v.score,
        })),
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
    if (!req.user) {
      return res.json([]);
    }

    const chats = await Chat.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('sessionId createdAt updatedAt messages')
      .limit(20);

    const sessions = chats.map(chat => ({
      sessionId: chat.sessionId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.content.substring(0, 100),
    }));

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
