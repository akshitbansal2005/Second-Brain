/**
 * controllers/document.controller.js
 *
 * Handles document upload, processing pipeline, list, and delete.
 *
 * Upload pipeline:
 *   multer → extractText → chunkText → embedBatch → upsertVectors → save to MongoDB
 */

const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const { extractText, chunkText, estimateTokens, summarizeText } = require('../services/document.service');
const { embedBatch } = require('../services/embedding.service');
const { upsertVectors, deleteVectors } = require('../services/pinecone.service');

/**
 * POST /api/documents/upload
 * Accepts a single file (pdf, txt, docx) via multipart form-data.
 */
const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { originalname, mimetype, buffer, size } = req.file;

  // Determine file type from mime or extension
  const ext = originalname.split('.').pop().toLowerCase();
  const allowedTypes = ['pdf', 'txt', 'docx'];
  if (!allowedTypes.includes(ext)) {
    return res.status(400).json({ error: 'Unsupported file type. Use PDF, TXT, or DOCX.' });
  }

  // Create a DB record immediately with status "processing"
  const doc = await Document.create({
    userId: req.user._id,
    name: originalname,
    fileType: ext,
    fileSize: size,
    status: 'processing',
  });

  // Run the pipeline asynchronously so we can respond immediately
  processDocument(doc, buffer, ext, req.user._id.toString()).catch(async (err) => {
    console.error(`[Document Processing Error] ${originalname}:`, err.message);
    await Document.findByIdAndUpdate(doc._id, {
      status: 'failed',
      errorMessage: err.message,
    });
  });

  res.status(202).json({
    message: 'File received. Processing started.',
    document: {
      id: doc._id,
      name: doc.name,
      status: doc.status,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
    },
  });
};

/**
 * Internal processing pipeline (runs asynchronously after response).
 */
const processDocument = async (doc, buffer, fileType, userId) => {
  // ── 1. Extract text from file ─────────────────────────────────────────────
  const rawText = await extractText(buffer, fileType);
  if (!rawText || rawText.trim().length < 50) {
    throw new Error('Could not extract meaningful text from file.');
  }

  // ── 2. Generate summary (non-blocking – failure is acceptable) ───────────
  const summary = await summarizeText(rawText);

  // ── 3. Chunk the text ─────────────────────────────────────────────────────
  const textChunks = chunkText(rawText);

  // ── 4. Generate embeddings for all chunks (batched) ───────────────────────
  const embeddings = await embedBatch(textChunks);

  // ── 5. Prepare Pinecone vectors ───────────────────────────────────────────
  const pineconeChunks = textChunks.map((text, i) => ({
    id: uuidv4(),
    embedding: embeddings[i],
    documentId: doc._id.toString(),
    documentName: doc.name,
    chunkIndex: i,
    text,
  }));

  // ── 5. Upsert into Pinecone ───────────────────────────────────────────────
  await upsertVectors(userId, pineconeChunks);

  // ── 6. Save chunk metadata + summary to MongoDB ───────────────────────────
  const chunkDocs = pineconeChunks.map((pc) => ({
    chunkIndex: pc.chunkIndex,
    text: pc.text,
    tokenCount: estimateTokens(pc.text),
    pineconeId: pc.id,
  }));

  await Document.findByIdAndUpdate(doc._id, {
    status: 'ready',
    totalChunks: textChunks.length,
    summary,
    chunks: chunkDocs,
  });

  console.log(`✅ Document "${doc.name}" processed: ${textChunks.length} chunks | summary: ${summary ? 'yes' : 'none'}`);
};

/**
 * GET /api/documents
 * List all documents for the authenticated user.
 */
const getDocuments = async (req, res) => {
  const documents = await Document.find({ userId: req.user._id })
    .select('-chunks') // Don't return chunks array (too large)
    .sort({ createdAt: -1 });

  res.json({ documents });
};

/**
 * GET /api/documents/:id
 * Get a single document with status.
 */
const getDocument = async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id }).select('-chunks');
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  res.json({ document: doc });
};

/**
 * DELETE /api/documents/:id
 * Remove a document from MongoDB and Pinecone.
 */
const deleteDocument = async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  // Delete vectors from Pinecone
  const pineconeIds = doc.chunks.map((c) => c.pineconeId);
  await deleteVectors(req.user._id.toString(), pineconeIds);

  // Remove from MongoDB
  await doc.deleteOne();

  res.json({ message: 'Document deleted successfully.' });
};

module.exports = { uploadDocument, getDocuments, getDocument, deleteDocument };
