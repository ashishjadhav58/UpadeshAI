const mongoose = require('mongoose');

/**
 * Explicit RAG feedback rows (thumbs up/down) for offline analysis.
 * Also mirrored to logs/feedback.jsonl by the feedback route.
 */
const feedbackSchema = new mongoose.Schema({
  messageId: { type: String, index: true },
  sessionId: { type: String, index: true },
  rating: {
    type: Number,
    enum: [1, -1], // 1 = thumbs up, -1 = thumbs down
    required: true,
  },
  query: { type: String, default: '' },
  response: { type: String, default: '' },
  sources: [
    {
      id: Number,
      reference: String,
      chapter: Number,
      verse: Number,
      score: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', feedbackSchema);
