import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Login from '../../Login';
import { apiFetch, setAuthSession } from '../../apiConfig';

jest.mock('../../apiConfig', () => ({
  API_BASE_URL: 'https://api.cleanup.test/api/v1',
  apiFetch: jest.fn(),
  setAuthSession: jest.fn(),
}));

describe('Login', () => {
  it('shows validation feedback when credentials are missing', () => {
    const screen = render(<Login onLogin={jest.fn()} onSwitchToSignup={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Please enter both your username and password.')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('stores a successful session and returns the user role', async () => {
    const onLogin = jest.fn();
    const session = {
      success: true,
      user: { username: 'cleanup-owner', role: 'admin' },
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
    };
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => session,
    });
    const screen = render(<Login onLogin={onLogin} onSwitchToSignup={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your username'), ' cleanup-owner ');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'safe-password');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(setAuthSession).toHaveBeenCalledWith(session));
    expect(onLogin).toHaveBeenCalledWith('cleanup-owner', 'admin');
    expect(apiFetch).toHaveBeenCalledWith(
      'https://api.cleanup.test/api/v1/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'cleanup-owner', password: 'safe-password' }),
      })
    );
  });

  it('shows a safe message when the API is unreachable', async () => {
    apiFetch.mockRejectedValue(new Error('network details'));
    const screen = render(<Login onLogin={jest.fn()} onSwitchToSignup={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your username'), 'member');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'safe-password');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('We could not reach the server. Please try again.')).toBeTruthy();
    });
  });
});
