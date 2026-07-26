import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiFetch,
  apiUrl,
  clearAuthSession,
  getStoredUser,
  setAuthSession,
} from '../../apiConfig';

describe('authenticated API session', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('stores and clears a complete token pair', async () => {
    await setAuthSession({
      user: { username: 'member', role: 'user' },
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
    });

    expect(await getStoredUser()).toEqual({ username: 'member', role: 'user' });
    expect(await AsyncStorage.getItem('cityCleanup.accessToken')).toBe('access-token');

    await clearAuthSession();
    expect(await getStoredUser()).toBeNull();
  });

  it('refreshes an expired access token and retries once', async () => {
    await setAuthSession({
      user: { username: 'member', role: 'user' },
      tokens: { accessToken: 'expired', refreshToken: 'refresh-token' },
    });
    global.fetch
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { username: 'member', role: 'user' },
          tokens: { accessToken: 'renewed', refreshToken: 'rotated' },
        }),
      })
      .mockResolvedValueOnce({ status: 200, ok: true });

    const response = await apiFetch(apiUrl('posts'));

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer renewed');
    expect(await AsyncStorage.getItem('cityCleanup.refreshToken')).toBe('rotated');
  });

  it('removes corrupt stored user data', async () => {
    await AsyncStorage.multiSet([
      ['user', '{invalid'],
      ['cityCleanup.accessToken', 'access'],
      ['cityCleanup.refreshToken', 'refresh'],
    ]);

    expect(await getStoredUser()).toBeNull();
    expect(await AsyncStorage.getItem('cityCleanup.accessToken')).toBeNull();
  });
});
