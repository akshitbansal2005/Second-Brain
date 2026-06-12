/**
 * models/Chat.js — Stores chat sessions and message history per user.
 * Each chat session holds an ordered array of messages.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  // Which document chunks were used to answer this message
  sources: [
    {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      documentName: String,
      chunkText: String,
      score: Number, // relevance score from Pinecone
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
      trim: true,
    },
    messages: [messageSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate title from first user message
chatSchema.methods.generateTitle = function () {
  const firstUserMsg = this.messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    this.title = firstUserMsg.content.substring(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '');
  }
};

module.exports = mongoose.model('Chat', chatSchema);
