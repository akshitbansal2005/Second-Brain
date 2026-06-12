/**
 * App.js — Root component with routing.
 * Protected routes redirect to /login if not authenticated.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import AuthPage from './components/auth/AuthPage';
import AppLayout from './components/layout/AppLayout';

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return !token ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#171717',
            color: '#e5e5e5',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          success: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={<PublicRoute><AuthPage /></PublicRoute>}
        />
        <Route
          path="/*"
          element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}
