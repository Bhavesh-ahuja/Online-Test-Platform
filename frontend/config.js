// frontend/src/config.js

// We use the environment variable VITE_API_URL if it exists (set during build or in .env).
// Otherwise, we fall back to localhost for local development.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";