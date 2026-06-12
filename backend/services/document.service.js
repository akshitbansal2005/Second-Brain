/**
 * services/document.service.js
 *
 * Handles:
 *   1. Text extraction from PDF / TXT / DOCX
 *   2. Splitting extracted text into overlapping chunks
 *   3. Generating a concise summary via Cohere
 *
 * Chunking strategy:
 *   - Target ~500 tokens per chunk (~2000 characters)
 *   - 10% overlap between chunks to preserve context at boundaries
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { CohereClient } = require('cohere-ai');

let cohere = null;
if (process.env.COHERE_API_KEY) {
  cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
}

const CHUNK_SIZE = 2000;     // characters (~500 tokens)
const CHUNK_OVERLAP = 200;   // characters of overlap

/**
 * Extract raw text from an uploaded file buffer.
 *
 * @param {Buffer} buffer — file contents
 * @param {string} fileType — 'pdf' | 'txt' | 'docx'
 * @returns {Promise<string>}
 */
const extractText = async (buffer, fileType) => {
  switch (fileType) {
    case 'pdf': {
      const data = await pdfParse(buffer);
      return data.text;
    }
    case 'txt': {
      return buffer.toString('utf-8');
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

/**
 * Split a long text string into overlapping chunks.
 *
 * Strategy:
 *   - Try to split on paragraph boundaries (double newlines)
 *   - Fall back to sentence boundaries (". ")
 *   - Hard-cut if no natural boundary found
 *
 * @param {string} text
 * @returns {string[]}
 */
const chunkText = (text) => {
  // Normalise whitespace
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (normalised.length <= CHUNK_SIZE) {
    return [normalised];
  }

  const chunks = [];
  let start = 0;

  while (start < normalised.length) {
    const end = start + CHUNK_SIZE;

    if (end >= normalised.length) {
      // Last chunk
      chunks.push(normalised.slice(start).trim());
      break;
    }

    // Look for a paragraph break near the end of the window
    let splitAt = normalised.lastIndexOf('\n\n', end);

    // Fall back to sentence boundary
    if (splitAt <= start) {
      splitAt = normalised.lastIndexOf('. ', end);
      if (splitAt > start) splitAt += 1; // include the period
    }

    // Hard cut if no boundary found
    if (splitAt <= start) {
      splitAt = end;
    }

    chunks.push(normalised.slice(start, splitAt).trim());
    start = splitAt - CHUNK_OVERLAP; // step back for overlap
    if (start < 0) start = 0;
  }

  // Remove empty chunks
  return chunks.filter((c) => c.length > 50);
};

/**
 * Estimate token count (rough: 1 token ≈ 4 chars)
 * @param {string} text
 * @returns {number}
 */
const estimateTokens = (text) => Math.ceil(text.length / 4);

/**
 * Generate a concise summary of the document text using Cohere.
 * Uses only the first 4000 characters to stay within token limits.
 *
 * @param {string} text — full extracted text
 * @returns {Promise<string>} — one-paragraph summary
 */
const summarizeText = async (text) => {
  if (!cohere) return '';

  // Truncate to first 4000 chars (~1000 tokens) to save API quota
  const excerpt = text.slice(0, 4000).trim();

  try {
    const response = await cohere.chat({
      model: 'command-r7b-12-2024',
      message: `Summarize the following document in 3-5 concise bullet points. Focus on the key topics, findings, or main ideas:\n\n${excerpt}`,
      temperature: 0.2,
      maxTokens: 400,
    });

    return response.text?.trim() || '';
  } catch (err) {
    console.error('[summarizeText] Failed to generate summary:', err.message);
    return '';
  }
};

module.exports = { extractText, chunkText, estimateTokens, summarizeText };
