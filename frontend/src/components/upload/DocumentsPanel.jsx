/**
 * components/upload/DocumentsPanel.jsx
 * Upload documents and view the knowledge base library.
 */

import React, { useEffect, useState } from 'react';
import { useDocStore } from '../../store';
import FileDropzone from './FileDropzone';
import DocumentCard from './DocumentCard';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function DocumentsPanel() {
  const { documents, isLoading, fetchDocuments, addDocument, updateDocument, removeDocument } = useDocStore();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (files) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      setIsUploading(true);
      try {
        const res = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const newDoc = res.data.document;
        addDocument(newDoc);
        toast.success(`"${file.name}" upload started`);

        // Poll for status every 3s until ready or failed
        pollDocumentStatus(newDoc.id);
      } catch (err) {
        toast.error(err.response?.data?.error || `Failed to upload ${file.name}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const pollDocumentStatus = (docId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/documents/${docId}`);
        const { status, totalChunks } = res.data.document;
        updateDocument(docId, { status, totalChunks });

        if (status === 'ready') {
          toast.success(`Document ready — ${totalChunks} chunks indexed`);
          clearInterval(interval);
        } else if (status === 'failed') {
          toast.error('Document processing failed');
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleDelete = async (id, name) => {
    try {
      await removeDocument(id);
      toast.success(`"${name}" deleted`);
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-surface-800 flex-shrink-0">
        <div>
          <h2 className="text-sm font-medium text-surface-200">Knowledge Base</h2>
          <p className="text-2xs text-surface-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} indexed
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Upload zone */}
        <FileDropzone onDrop={handleUpload} isUploading={isUploading} />

        {/* Documents list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-surface-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-surface-500 text-sm">No documents yet. Upload your first file above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-2xs font-medium text-surface-600 uppercase tracking-wider mb-3">Indexed Documents</h3>
            {documents.map((doc) => (
              <DocumentCard key={doc._id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
