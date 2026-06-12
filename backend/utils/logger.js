/**
 * utils/logger.js
 *
 * Tiny structured logger that prefixes messages with timestamps and level.
 * In production you'd swap this for Winston or Pino.
 */

const isDev = process.env.NODE_ENV !== 'production';

const ts = () => new Date().toISOString();

const logger = {
  info:  (...args) => console.log  (`[${ts()}] INFO `, ...args),
  warn:  (...args) => console.warn (`[${ts()}] WARN `, ...args),
  error: (...args) => console.error(`[${ts()}] ERROR`, ...args),
  debug: (...args) => { if (isDev) console.log(`[${ts()}] DEBUG`, ...args); },
};

module.exports = logger;
