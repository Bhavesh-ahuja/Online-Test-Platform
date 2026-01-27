// src/utils/authFetch.js
import { API_BASE_URL } from "../../config";

/**
 * Authenticated fetch wrapper that adds JWT token to requests.
 * Does NOT auto-logout on 401 - components should handle auth failures themselves.
 */
export async function authFetch(path, options = {}) {
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
