const fs = require('fs');
const path = require('path');
const express = require('express');
const Feedback = require('../models/Feedback');
const Chat = require('../models/Chat');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'feedback.jsonl');

function appendFeedbackLog(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch (err) {
    console.error('Failed to write feedback.jsonl:', err.message);
  }
}

/**
 * POST /api/chat/feedback
 * Body: { messageId?, sessionId, rating: 1|-1, query, response, sources? }
 */
router.post('/feedback', optionalAuth, async (req, res) => {
  try {
    const { messageId, sessionId, rating, query, response, sources } = req.body;

    if (rating !== 1 && rating !== -1) {
      return res.status(400).json({ error: 'rating must be 1 (up) or -1 (down)' });
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const payload = {
      messageId: messageId || undefined,
      sessionId,
      rating,
      query: query || '',
      response: response || '',
      sources: Array.isArray(sources) ? sources : [],
      createdAt: new Date(),
    };

    const doc = await Feedback.create(payload);
    appendFeedbackLog({
      ...payload,
      _id: String(doc._id),
      createdAt: payload.createdAt.toISOString(),
    });

    // Best-effort: stamp rating onto the chat message if we have messageId
    if (messageId) {
      await Chat.updateOne(
        { sessionId, 'messages.messageId': messageId },
        { $set: { 'messages.$.feedback': rating } }
      );
    }

    res.json({
      ok: true,
      id: doc._id,
      rating,
      messageId: payload.messageId || null,
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
