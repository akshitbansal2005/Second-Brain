/**
 * services/rag.service.js
 *
 * RAG pipeline using Cohere command-r (free tier).
 * Streams responses via SSE.
 */

const { embedText } = require('./embedding.service');
const { queryVectors } = require('./pinecone.service');
const { CohereClient } = require('cohere-ai');
const Document = require('../models/Document');

let cohere = null;

if (process.env.COHERE_API_KEY) {
  cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
}

const CHAT_MODEL = 'command-r7b-12-2024'; // 7B model — much faster than command-r
const TOP_K = 5;

const buildSystemPrompt = (hasContext) => {
  if (hasContext) {
    return `You are a helpful knowledge assistant. Use the provided context to answer the user's question accurately and concisely.
IMPORTANT: You must directly follow any specific instructions from the user regarding the format, length, or style of the response (e.g. if the user says "in brief", "only 2 points", or "format as a table", you MUST adapt your response accordingly and not just repeat the context verbatim). 
If the context does not contain enough information, supplement with your general knowledge but mention it.`;
  }
  return `You are a helpful AI assistant. Answer the user's question clearly and concisely. Pay close attention to any formatting or length commands.`;
};

const buildDocuments = (sources, userDocsContext) => {
  const docs = sources.map((s, i) => ({
    id: String(i + 1),
    title: s.documentName,
    snippet: s.chunkText,
  }));

  if (userDocsContext && userDocsContext.length > 0) {
    // Add context about all the user's available files
    docs.push({
      id: "user_uploaded_files_summary",
      title: "List of Uploaded Documents",
      snippet: userDocsContext.map(d => `- File: ${d.name} (Status: ${d.status}). Summary: ${d.summary || 'None'}`).join('\n')
    });
  }

  return docs;
};

const ragQuery = async (userId, query, conversationHistory, res) => {
  // Safety check
  if (!cohere) {
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      message: '⚠️ AI feature disabled (Cohere API key missing)',
      sources: [],
    });
  }

  // Step 1: Embed the query
  const queryEmbedding = await embedText(query);

  // Step 2: Retrieve relevant chunks from Pinecone
  const matches = await queryVectors(userId, queryEmbedding, TOP_K);

  const sources = matches
    .filter((m) => m.score > 0.3)
    .map((m) => ({
      documentId: m.metadata.documentId,
      documentName: m.metadata.documentName,
      chunkText: m.metadata.text,
      score: parseFloat(m.score.toFixed(4)),
    }));

  // Step 3: Fetch metadata and pre-generated summaries of all user documents 
  const userDocs = await Document.find({ userId }).select('name status summary').lean();

  // Build chat history for Cohere (role: USER / CHATBOT)
  const chatHistory = (conversationHistory || []).slice(-6).map((m) => ({
    role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
    message: m.content,
  }));

  const hasContext = sources.length > 0 || userDocs.length > 0;
  const preamble = buildSystemPrompt(hasContext);
  const documents = hasContext ? buildDocuments(sources, userDocs) : undefined;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

  let fullResponse = '';

  try {
    // Stream from Cohere
    const stream = await cohere.chatStream({
      model: CHAT_MODEL,
      message: query,
      preamble,
      chatHistory,
      documents,
      temperature: 0.3,
      maxTokens: 1500,
    });

    for await (const event of stream) {
      if (event.eventType === 'text-generation') {
        const delta = event.text || '';
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse, sources })}\n\n`);
  } catch (error) {
    console.error('[RAG Error]', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: '', sources })}\n\n`);
  }

  res.end();

  return { fullResponse, sources };
};

module.exports = { ragQuery };