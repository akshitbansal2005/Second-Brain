const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const chatRoutes = require('./routes/chat.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Loaded PORT =', PORT);
console.log('Loaded MONGODB_URI =', process.env.MONGODB_URI ? 'present' : 'missing');

// trust proxy
app.set('trust proxy', 1);

// middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use(globalLimiter);

// routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.use(errorHandler);

async function connectMongo() {
  // Try the configured Atlas/remote URI first
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // fail fast if unreachable
      });
      console.log('✅ MongoDB connected (Atlas)');
      return;
    } catch (err) {
      console.warn('⚠️  Could not connect to MONGODB_URI:', err.message);
      console.log('   Falling back to in-memory MongoDB...');
    }
  }

  // Fallback: spin up an in-memory MongoDB for local development
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const memUri = mongoServer.getUri();
    await mongoose.connect(memUri);
    console.log('✅ MongoDB connected (in-memory — data will not persist between restarts)');
  } catch (memErr) {
    console.error('❌ Could not start in-memory MongoDB:', memErr.message);
    throw memErr;
  }
}

async function startServer() {
  try {
    await connectMongo();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;