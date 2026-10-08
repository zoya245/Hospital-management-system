// Central configuration for API and WebSocket endpoints
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// In local dev use port 3001. When deployed in production (e.g. Vercel multi-services), use the current origin.
const defaultBackend = isLocal 
  ? 'http://localhost:3001' 
  : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://hospital-management-system-z8ay.onrender.com');

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || defaultBackend;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BACKEND_URL}/api`;
