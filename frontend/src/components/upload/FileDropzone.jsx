/**
 * components/upload/FileDropzone.jsx
 * Drag-and-drop file upload zone using react-dropzone.
 */

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export default function FileDropzone({ onDrop, isUploading }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    disabled: isUploading,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-150',
        isDragActive
          ? 'border-accent-500 bg-accent-600/5'
          : 'border-surface-700 hover:border-surface-600 hover:bg-surface-900/50',
        isUploading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-2.5">
        <div className={clsx(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
          isDragActive ? 'bg-accent-600/10' : 'bg-surface-800'
        )}>
          {isUploading
            ? <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
            : <Upload className={clsx('w-5 h-5', isDragActive ? 'text-accent-400' : 'text-surface-500')} />
          }
        </div>

        <div>
          <p className="text-sm font-medium text-surface-300">
            {isDragActive
              ? 'Drop files here'
              : isUploading
              ? 'Processing…'
              : 'Drop files here or click to browse'
            }
          </p>
          <p className="text-2xs text-surface-600 mt-1">
            PDF, TXT, DOCX · Max 20 MB
          </p>
        </div>
      </div>
    </div>
  );
}
