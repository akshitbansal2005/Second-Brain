/**
 * hooks/useDocumentPolling.js
 *
 * Polls a document's processing status every N seconds until it
 * reaches 'ready' or 'failed', then clears itself.
 *
 * Usage:
 *   useDocumentPolling(docId, onStatusChange)
 */

import { useEffect, useRef } from 'react';
import api from '../services/api';

const POLL_INTERVAL_MS = 3000;

export default function useDocumentPolling(docId, onStatusChange) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    const poll = async () => {
      try {
        const res = await api.get(`/documents/${docId}`);
        const { status, totalChunks, errorMessage } = res.data.document;

        onStatusChange(docId, { status, totalChunks, errorMessage });

        if (status === 'ready' || status === 'failed') {
          clearInterval(intervalRef.current);
        }
      } catch {
        clearInterval(intervalRef.current);
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [docId]);
}
