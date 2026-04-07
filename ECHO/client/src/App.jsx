import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import VolunteerPage from './pages/VolunteerPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#faf6ef',
            color: '#3c3224',
            borderRadius: '12px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '14px',
            border: '1px solid rgba(196, 164, 97, 0.2)',
          },
          success: { iconTheme: { primary: '#6b8e4e', secondary: '#faf6ef' } },
          error: { iconTheme: { primary: '#ba1a1a', secondary: '#faf6ef' } },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/volunteer" element={<VolunteerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
