// Central configuration for API and WebSocket endpoints
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (isLocal ? 'http://localhost:3001' : 'https://hospital-management-system-z8ay.onrender.com');
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BACKEND_URL}/api`;
