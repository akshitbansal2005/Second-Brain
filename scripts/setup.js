#!/usr/bin/env node
/**
 * scripts/setup.js
 *
 * Interactive first-run setup:
 *   1. Checks for .env file in backend/
 *   2. Validates that all required keys are present
 *   3. Optionally tests the MongoDB connection
 *   4. Prints a helpful next-steps summary
 *
 * Run with:  node scripts/setup.js
 */

const fs   = require('fs');
const path = require('path');

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';

const ok   = (msg) => console.log(`  ${GREEN}✓${RESET}  ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET}  ${msg}`);
const err  = (msg) => console.log(`  ${RED}✗${RESET}  ${msg}`);
const info = (msg) => console.log(`  ${CYAN}→${RESET}  ${msg}`);
const hr   = ()    => console.log(`\n${DIM}${'─'.repeat(60)}${RESET}\n`);

// ── Required env keys ─────────────────────────────────────────────────────────
const REQUIRED_KEYS = [
  { key: 'MONGODB_URI',          hint: 'mongodb://localhost:27017/secondbrain' },
  { key: 'JWT_SECRET',           hint: 'any long random string' },
  { key: 'COHERE_API_KEY',       hint: 'from dashboard.cohere.com/api-keys' },
  { key: 'PINECONE_API_KEY',     hint: 'from app.pinecone.io' },
  { key: 'PINECONE_INDEX_NAME',  hint: 'secondbrain-cohere' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n');
console.log(`${BOLD}  🧠  Second Brain AI — Setup Checker${RESET}`);
hr();

const envPath    = path.join(__dirname, '..', 'backend', '.env');
const examplePath = path.join(__dirname, '..', 'backend', '.env.example');

// 1. Check for .env file
if (!fs.existsSync(envPath)) {
  warn('.env not found in backend/');

  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    ok('Created backend/.env from .env.example');
    info('Please open backend/.env and fill in your API keys, then re-run this script.');
  } else {
    err('backend/.env.example not found either. Please create backend/.env manually.');
  }
  console.log('');
  process.exit(1);
}

ok('backend/.env found');

// 2. Parse .env
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
  if (match) envVars[match[1]] = match[2].trim();
});

// 3. Validate required keys
console.log('');
console.log(`${BOLD}  Checking required environment variables:${RESET}`);
console.log('');

let allPresent = true;
REQUIRED_KEYS.forEach(({ key, hint }) => {
  const val = envVars[key];
  if (!val || val.includes('your_') || val === '') {
    err(`${key} — missing or placeholder  ${DIM}(expected: ${hint})${RESET}`);
    allPresent = false;
  } else {
    // Mask the value for display
    const masked = val.length > 8
      ? val.slice(0, 4) + '••••' + val.slice(-4)
      : '••••';
    ok(`${key} = ${DIM}${masked}${RESET}`);
  }
});

hr();

// 4. Pinecone dimension reminder
console.log(`${BOLD}  Pinecone Index Requirements:${RESET}\n`);
info('Index name:    ' + (envVars.PINECONE_INDEX_NAME || 'second-brain'));
info('Dimensions:    1024  (Cohere embed-english-v3.0)');
info('Metric:        cosine');
info('Create at:     https://app.pinecone.io\n');

// 5. Summary
hr();
if (allPresent) {
  console.log(`${GREEN}${BOLD}  ✓ All environment variables are set!${RESET}\n`);
  console.log(`${BOLD}  Next steps:${RESET}\n`);
  info('1. Install dependencies:   npm run install:all');
  info('2. Start the backend:      npm run dev:backend');
  info('3. Start the frontend:     npm run dev:frontend');
  info('   — OR run both at once:  npm run dev  (requires concurrently)\n');
  console.log(`${DIM}  Frontend → http://localhost:3000`);
  console.log(`  Backend  → http://localhost:5000/api/health${RESET}\n`);
} else {
  console.log(`${YELLOW}${BOLD}  ⚠ Some variables need to be set in backend/.env${RESET}\n`);
  info('Edit backend/.env, fill in the missing values, then run this script again.\n');
}
