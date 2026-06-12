/**
 * utils/formatters.js — Small utility functions used across the UI.
 */

/**
 * Format a file size in bytes to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format a date to a relative string (e.g. "2 hours ago").
 * Falls back to locale date string for older dates.
 * @param {string|Date} date
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1)    return 'just now';
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffHours < 24)  return `${diffHours}h ago`;
  if (diffDays < 7)    return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Truncate a string to a max length with an ellipsis.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export const truncate = (str, max = 80) =>
  str && str.length > max ? str.slice(0, max).trimEnd() + '…' : str;

/**
 * Map a file extension to a display label.
 * @param {string} ext
 * @returns {string}
 */
export const fileTypeLabel = (ext) =>
  ({ pdf: 'PDF', txt: 'Text', docx: 'Word' }[ext?.toLowerCase()] ?? ext?.toUpperCase() ?? '—');
