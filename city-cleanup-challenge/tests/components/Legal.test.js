import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Legal from '../../Legal';

describe('legal and support center', () => {
  it('shows privacy, retention, safe-use, reward, and support information', () => {
    render(<Legal onClose={jest.fn()} />);

    expect(screen.getByText('Privacy, terms, and support')).toBeTruthy();
    expect(screen.getByText('Privacy')).toBeTruthy();
    expect(screen.getByText('Retention and deletion')).toBeTruthy();
    expect(screen.getByText('Safe and eligible use')).toBeTruthy();
    expect(screen.getByText('CELO rewards')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();
  });

  it('returns to authentication', () => {
    const onClose = jest.fn();
    render(<Legal onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('Return to sign in'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
