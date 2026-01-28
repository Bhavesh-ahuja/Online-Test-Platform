// src/utils/authFetch.js
import { API_BASE_URL } from "../../config";

/**
 * Authenticated fetch wrapper that adds JWT token to requests.
 * Does NOT auto-logout on 401 - components should handle auth failures themselves.
 */
export async function authFetch(path, options = {}) {
  // Defensive check: ensure path is relative, not absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    console.error('[authFetch] ERROR: Path must be relative, not absolute URL. Received:', path);
    throw new Error('authFetch requires a relative path (e.g., "/api/tests"), not an absolute URL');
  }

  const token = localStorage.getItem("token");

  console.log('[authFetch] Path:', path);
  console.log('[authFetch] Token exists:', !!token);
  console.log('[authFetch] Token preview:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log('[authFetch] Headers:', headers);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  console.log('[authFetch] Response status:', response.status);

  return response;
}
