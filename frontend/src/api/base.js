export const API_BASE = 'http://localhost:5000/api';

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function apiErrorMessage(payload, fallback) {
  // v2 returns { error: { code, message, details? } }
  const msg = payload?.error?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

