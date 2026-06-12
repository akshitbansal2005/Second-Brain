/**
 * services/embedding.service.js
 *
 * Handles embeddings via Cohere AI (free tier).
 * Model: embed-english-v3.0 → 1024 dimensions
 */

const { CohereClient } = require('cohere-ai');

let cohere = null;

if (process.env.COHERE_API_KEY) {
  cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
} else {
  console.log('⚠️  Cohere key missing — running without AI features');
}

const EMBEDDING_MODEL = 'embed-english-v3.0';

/**
 * Generate an embedding vector for a single text string.
 * @param {string} text
 * @returns {Promise<number[]>} — 1024-dimension float array
 */
const embedText = async (text) => {
  if (!cohere) throw new Error('Cohere API key not configured');

  const response = await cohere.embed({
    model: EMBEDDING_MODEL,
    texts: [text.trim()],
    inputType: 'search_query',
    embeddingTypes: ['float'],
  });

  return response.embeddings.float[0];
};

/**
 * Batch-embed multiple text strings.
 * Cohere allows up to 96 texts per request.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
const embedBatch = async (texts) => {
  if (!cohere) throw new Error('Cohere API key not configured');

  const BATCH_SIZE = 90;
  const embeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.trim());

    const response = await cohere.embed({
      model: EMBEDDING_MODEL,
      texts: batch,
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });

    embeddings.push(...response.embeddings.float);
  }

  return embeddings;
};

module.exports = { embedText, embedBatch };
