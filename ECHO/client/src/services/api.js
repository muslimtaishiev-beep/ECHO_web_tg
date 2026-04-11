const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export const api = {
  async register(username, password, displayName, firstName, lastName, phone, telegramId) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName, firstName, lastName, phone, telegramId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }
    return res.json();
  },

  async login(username, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    return res.json();
  },

  async getMe(token) {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  async getQueue(token) {
    const res = await fetch(`${API_URL}/chat/queue`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch queue');
    return res.json();
  },

  async getMessages(token, roomId) {
    const res = await fetch(`${API_URL}/chat/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async getVolunteerRooms(token, volunteerId) {
    const res = await fetch(`${API_URL}/chat/rooms/${volunteerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch rooms');
    return res.json();
  },
};
