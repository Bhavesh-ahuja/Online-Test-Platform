// src/utils/authFetch.js
import { API_BASE_URL } from "../config";

let isRedirecting = false;

export async function authFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });

  // 🔴 Centralized auth failure detection
  if ((response.status === 401 || response.status === 403) && !isRedirecting) {
    isRedirecting = true;

    // Graceful: allow current promise chain to continue
    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login?reason=session_expired";

    }, 0);
  }

  return response;
}
