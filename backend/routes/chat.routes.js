/**
 * routes/chat.routes.js
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { sendMessage, getChats, getChat, deleteChat, createChat } = require('../controllers/chat.controller');

const router = express.Router();

// Rate limit chat to 60 messages per minute per user
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many messages. Please slow down.' },
});

router.use(protect);

router.post('/send', chatLimiter, asyncHandler(sendMessage));
router.post('/new', asyncHandler(createChat));
router.get('/', asyncHandler(getChats));
router.get('/:id', asyncHandler(getChat));
router.delete('/:id', asyncHandler(deleteChat));

module.exports = router;
