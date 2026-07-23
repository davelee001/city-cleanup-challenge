import AsyncStorage from '@react-native-async-storage/async-storage';

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

const ACCESS_TOKEN_KEY = 'cityCleanup.accessToken';
const REFRESH_TOKEN_KEY = 'cityCleanup.refreshToken';
let refreshPromise = null;

export async function setAuthSession(session) {
  const { accessToken, refreshToken } = session.tokens || {};
  if (!accessToken || !refreshToken) {
    throw new Error('Login response did not include a complete token pair');
  }
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
    ['user', JSON.stringify(session.user)],
  ]);
}

export async function clearAuthSession() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, 'user']);
}

export async function getStoredUser() {
  const storedUser = await AsyncStorage.getItem('user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    await clearAuthSession();
    return null;
  }
}

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      await clearAuthSession();
      return null;
    }
    await setAuthSession(data);
    return data.tokens.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiFetch(resource, options = {}, allowRefresh = true) {
  const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const headers = { ...(options.headers || {}) };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete headers.Authorization;
  }

  const response = await fetch(resource, { ...options, headers });
  const isAuthEndpoint = String(resource).includes('/login')
    || String(resource).includes('/signup')
    || String(resource).includes('/auth/');

  if (response.status !== 401 || !allowRefresh || isAuthEndpoint) {
    return response;
  }

  const refreshedAccessToken = await refreshAuthSession();
  if (!refreshedAccessToken) return response;

  return fetch(resource, {
    ...options,
    headers: { ...headers, Authorization: `Bearer ${refreshedAccessToken}` },
  });
}

export async function logoutAuthSession() {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    await clearAuthSession();
  }
}
