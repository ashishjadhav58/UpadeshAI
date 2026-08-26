const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  shloka: {
    id: Number,
    chapter: Number,
    verse: Number,
    reference: String,
    sanskrit: String,
    transliteration: String,
    translation: String,
    meaning: String,
    explanation: String,
    verseNumber: Number,
  },
  // Provenance: retrieved verses that informed this answer
  sources: [
    {
      id: Number,
      reference: String,
      chapter: Number,
      verse: Number,
      verseNumber: Number,
      translation: String,
      score: Number,
      role: String,
    },
  ],
  messageId: { type: String },
  feedback: { type: Number, enum: [1, -1, null], default: null },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
