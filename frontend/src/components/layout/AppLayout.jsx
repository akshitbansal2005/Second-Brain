/**
 * components/layout/AppLayout.jsx
 * The main shell: sidebar + main content area.
 */

import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatWindow from '../chat/ChatWindow';
import DocumentsPanel from '../upload/DocumentsPanel';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatWindow />} />
          <Route path="/documents" element={<DocumentsPanel />} />
        </Routes>
      </main>
    </div>
  );
}
