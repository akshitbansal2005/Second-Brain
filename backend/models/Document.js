/**
 * models/Document.js — Stores metadata for uploaded files.
 * The actual text chunks and embeddings live in Pinecone;
 * MongoDB keeps the human-readable metadata for references.
 */

const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  tokenCount: { type: Number, default: 0 },
  pineconeId: { type: String, required: true }, // ID stored in Pinecone
});

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'txt', 'docx'],
      required: true,
    },
    fileSize: {
      type: Number, // bytes
      required: true,
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    chunks: [chunkSchema],
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    errorMessage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
