/**
 * services/pinecone.service.js
 *
 * Manages all Pinecone vector store operations:
 *   - Upsert (store) embeddings when documents are uploaded
 *   - Query (retrieve) the top-K most relevant chunks for a user query
 *   - Delete embeddings when a document is removed
 *
 * Each vector is stored with metadata so we can reconstruct source references.
 *
 * Pinecone namespace = userId, ensuring per-user isolation.
 */

const { Pinecone } = require('@pinecone-database/pinecone');

let pineconeIndex = null;

/**
 * Lazy-initialise the Pinecone client and index.
 */
const getPineconeIndex = async () => {
  if (pineconeIndex) return pineconeIndex;

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  pineconeIndex = pc.index(process.env.PINECONE_INDEX_NAME);
  return pineconeIndex;
};

/**
 * Upsert a batch of vectors into Pinecone.
 *
 * @param {string} userId — used as the namespace
 * @param {Array<{
 *   id: string,
 *   embedding: number[],
 *   documentId: string,
 *   documentName: string,
 *   chunkIndex: number,
 *   text: string
 * }>} chunks
 */
const upsertVectors = async (userId, chunks) => {
  const index = await getPineconeIndex();

  // Pinecone upsert accepts up to 100 vectors per call
  const BATCH_SIZE = 100;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE).map((chunk) => ({
      id: chunk.id,
      values: chunk.embedding,
      metadata: {
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text.substring(0, 1000), // Pinecone metadata limit
        userId,
      },
    }));

    await index.namespace(userId).upsert(batch);
  }
};

/**
 * Query Pinecone for the top-K most similar chunks to a query embedding.
 *
 * @param {string} userId
 * @param {number[]} queryEmbedding
 * @param {number} topK — default 5
 * @param {string|null} filterDocumentId — optionally restrict to one document
 * @returns {Promise<Array>} — array of Pinecone matches with metadata
 */
const queryVectors = async (userId, queryEmbedding, topK = 5, filterDocumentId = null) => {
  const index = await getPineconeIndex();

  const queryOptions = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };

  // Optional: filter to a specific document
  if (filterDocumentId) {
    queryOptions.filter = { documentId: { $eq: filterDocumentId } };
  }

  const result = await index.namespace(userId).query(queryOptions);
  return result.matches || [];
};

/**
 * Delete all vectors associated with a document.
 *
 * @param {string} userId
 * @param {string[]} pineconeIds — list of vector IDs to delete
 */
const deleteVectors = async (userId, pineconeIds) => {
  if (!pineconeIds || pineconeIds.length === 0) return;

  const index = await getPineconeIndex();
  await index.namespace(userId).deleteMany(pineconeIds);
};

module.exports = { upsertVectors, queryVectors, deleteVectors };
