/**
 * controllers/chat.controller.js
 *
 * Manages chat sessions and the streaming RAG query endpoint.
 */

const Chat = require('../models/Chat');
const { ragQuery } = require('../services/rag.service');

/**
 * POST /api/chat/send
 *
 * Creates or continues a chat session.
 * Streams the AI response back via Server-Sent Events (SSE).
 *
 * Body: { message, chatId? }
 */
const sendMessage = async (req, res) => {
  const { message, chatId } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  // ── Get or create a chat session ────────────────────────────────────────
  let chat;
  if (chatId) {
    chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Chat session not found.' });
  } else {
    chat = await Chat.create({ userId: req.user._id, messages: [] });
  }

  // Add user message to history
  chat.messages.push({ role: 'user', content: message });

  // Auto-generate title from first message
  if (chat.messages.length === 1) {
    chat.generateTitle();
  }

  await chat.save();

  // Build conversation history (exclude the message we just added — it's in the prompt)
  const conversationHistory = chat.messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // ── Start streaming RAG response ─────────────────────────────────────────
  // ragQuery sets the SSE headers and streams directly to res
  // We listen for the 'done' signal to save the assistant message

  let assistantContent = '';
  let sources = [];

  // Intercept the stream by wrapping res.write
  const originalWrite = res.write.bind(res);
  res.write = (data) => {
    // Parse SSE data to capture the final response for DB storage
    try {
      const jsonStr = data.replace(/^data: /, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.type === 'done') {
        assistantContent = parsed.fullResponse;
        sources = parsed.sources;
        // Inject chatId so the frontend can track this conversation
        parsed.chatId = chat._id;
        data = `data: ${JSON.stringify(parsed)}\n\n`;
      }
    } catch (_) {}
    return originalWrite(data);
  };

  const originalEnd = res.end.bind(res);
  res.end = async (...args) => {
    // Save assistant response to DB after stream ends
    if (assistantContent) {
      chat.messages.push({
        role: 'assistant',
        content: assistantContent,
        sources,
      });
      await chat.save().catch((err) =>
        console.error('[Chat Save Error]', err.message)
      );
    }
    return originalEnd(...args);
  };

  // Also emit the chatId so the frontend can associate subsequent messages
  // We do this before ragQuery sets SSE headers
  await ragQuery(req.user._id.toString(), message, conversationHistory, res);
};

/**
 * GET /api/chat
 * List all chat sessions for the user (titles only).
 */
const getChats = async (req, res) => {
  const chats = await Chat.find({ userId: req.user._id, isActive: true })
    .select('title createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json({ chats });
};

/**
 * GET /api/chat/:id
 * Get a full chat session with messages.
 */
const getChat = async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });
  res.json({ chat });
};

/**
 * DELETE /api/chat/:id
 */
const deleteChat = async (req, res) => {
  const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });
  res.json({ message: 'Chat deleted.' });
};

/**
 * POST /api/chat/new
 * Create a new empty chat session.
 */
const createChat = async (req, res) => {
  const chat = await Chat.create({ userId: req.user._id, messages: [] });
  res.status(201).json({ chat });
};

module.exports = { sendMessage, getChats, getChat, deleteChat, createChat };
