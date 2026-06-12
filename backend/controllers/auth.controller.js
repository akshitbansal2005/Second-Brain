/**
 * controllers/auth.controller.js
 * Handles user registration and login.
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * Sign a JWT for the given user ID.
 */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const user = await User.create({ name, email, password });

  const token = signToken(user._id);

  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  // Explicitly select password (it's hidden by default)
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken(user._id);

  res.json({
    message: 'Login successful.',
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
};

module.exports = { register, login, getMe };
