import { io } from 'socket.io-client';

const rawSocketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = rawSocketUrl.startsWith('http') ? rawSocketUrl : 'https://' + rawSocketUrl;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
