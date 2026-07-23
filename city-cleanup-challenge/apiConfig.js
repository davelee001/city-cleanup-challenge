const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = (
  configuredApiUrl || 'http://localhost:3001/api/v1'
).replace(/\/+$/, '');

export const SOCIAL_API_BASE_URL = `${API_BASE_URL}/social`;

export function apiUrl(path = '') {
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

export function socialApiUrl(path = '') {
  return `${SOCIAL_API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}
