import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Signup from '../../Signup';

function completeForm(screen) {
  fireEvent.changeText(screen.getByLabelText('Username'), 'cleanup-member');
  fireEvent.changeText(screen.getByLabelText('Email address'), 'member@cleanup.test');
  fireEvent.changeText(screen.getByLabelText('County / location'), 'Central County');
  fireEvent.changeText(screen.getByLabelText('Phone number'), '+211 922 000 000');
  fireEvent.changeText(screen.getByLabelText('Password'), 'long-password');
  fireEvent.changeText(screen.getByLabelText('Confirm password'), 'long-password');
}

describe('Signup', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('requires every profile and password field', () => {
    const screen = render(<Signup onSignup={jest.fn()} onSwitchToLogin={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Create account'));

    expect(screen.getByText('Please complete every field.')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits location before phone data and reports success', async () => {
    const onSignup = jest.fn();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        user: { username: 'cleanup-member', role: 'user' },
      }),
    });
    const screen = render(<Signup onSignup={onSignup} onSwitchToLogin={jest.fn()} />);
    completeForm(screen);

    fireEvent.press(screen.getByLabelText('Create account'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload).toEqual(expect.objectContaining({
      location: 'Central County',
      phone: '+211 922 000 000',
      email: 'member@cleanup.test',
    }));
    expect(screen.getByText('Account created! Taking you to login...')).toBeTruthy();
    await waitFor(
      () => expect(onSignup).toHaveBeenCalledWith('cleanup-member', 'user'),
      { timeout: 2000 }
    );
  });

  it('rejects invalid email before contacting the API', () => {
    const screen = render(<Signup onSignup={jest.fn()} onSwitchToLogin={jest.fn()} />);
    completeForm(screen);
    fireEvent.changeText(screen.getByLabelText('Email address'), 'not-an-email');

    fireEvent.press(screen.getByLabelText('Create account'));

    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
