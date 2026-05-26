export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export function getRelativeDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDate() {
  return getRelativeDate(0);
}
