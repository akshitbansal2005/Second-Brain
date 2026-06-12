/**
 * components/upload/DocumentCard.jsx
 * Displays a single document in the library with status badge and delete button.
 */

import React from 'react';
import { FileText, Trash2, CheckCircle2, Loader2, XCircle, Layers } from 'lucide-react';
import clsx from 'clsx';

const STATUS_CONFIG = {
  ready: {
    label: 'Ready',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    icon: Loader2,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    icon: XCircle,
  },
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentCard({ doc, onDelete }) {
  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.processing;
  const StatusIcon = status.icon;

  return (
    <div className="p-3.5 flex items-start gap-3.5 group rounded-lg bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors animate-fade-in">
      {/* File type icon */}
      <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-surface-500" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-surface-200 truncate">{doc.name}</p>

          {/* Delete button */}
          {doc.status !== 'processing' && (
            <button
              onClick={() => onDelete(doc._id, doc.name)}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-md
                         text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
          {/* Status badge */}
          <span className={clsx(
            'flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full font-medium',
            status.bg, status.color
          )}>
            <StatusIcon className={clsx('w-3 h-3', doc.status === 'processing' && 'animate-spin')} />
            {status.label}
          </span>

          {/* Chunks */}
          {doc.totalChunks > 0 && (
            <span className="flex items-center gap-1 text-2xs text-surface-600">
              <Layers className="w-3 h-3" />
              {doc.totalChunks} chunks
            </span>
          )}

          {/* File size */}
          <span className="text-2xs text-surface-600">{formatSize(doc.fileSize)}</span>

          {/* File type */}
          <span className="text-2xs text-surface-600 uppercase font-medium">{doc.fileType}</span>
        </div>

        {/* Failed error message */}
        {doc.status === 'failed' && doc.errorMessage && (
          <p className="text-2xs text-red-400 mt-1.5">{doc.errorMessage}</p>
        )}
      </div>
    </div>
  );
}
