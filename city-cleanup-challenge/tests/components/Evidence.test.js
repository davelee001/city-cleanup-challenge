import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Evidence from '../../Evidence';
import { apiFetch } from '../../apiConfig';

jest.mock('../../apiConfig', () => ({ API_BASE_URL: 'http://localhost:3000/api/v1', apiFetch: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-location', () => ({}));
jest.mock('../../evidenceAnalysis', () => ({ streamEvidenceAnalysis: jest.fn(() => new Promise(() => {})) }));

const submission = {
  id: 1, username: 'member', wasteCategory: 'plastic', status: 'manual_review',
  createdAt: '2026-10-16T13:00:00Z', images: { before: '/before', after: '/after' },
  verification: { smartVerification: { status: 'pending' } },
};
const originalReader = global.FileReader;
let smartVerification;
beforeEach(() => {
  smartVerification = { status: 'pending' };
  global.FileReader = class { readyState = 0; };
  apiFetch.mockImplementation(async (url) => url.includes('/evidence/submissions')
    ? { ok: true, json: async () => ({ success: true, submissions: [{ ...submission, verification: { smartVerification } }] }) }
    : { ok: false });
});
afterEach(() => { global.FileReader = originalReader; });

it('shows only the personal workflow even when the submitter is an admin', async () => {
  render(<Evidence userRole="admin" />);
  await waitFor(() => expect(screen.getByText('Gemma live analysis')).toBeTruthy());
  expect(apiFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/evidence/submissions?scope=mine&latest=true');
  expect(screen.getByText('New cleanup submission')).toBeTruthy();
  expect(screen.getByText('Your latest submission')).toBeTruthy();
  expect(screen.getByText('Images received. Please wait for Gemma verification and human approval.')).toBeTruthy();
  expect(screen.getByText('Human review starts after Gemma analysis finishes.')).toBeTruthy();
  expect(screen.queryByText('Approve')).toBeNull();
  expect(screen.queryByText('Submitted by member')).toBeNull();
});

it('keeps the stored records and human decision controls on the admin page', async () => {
  smartVerification = { status: 'completed', model: 'gemma3:4b', findings: require('../../../backend/tests/fixtures/gemma-cleanup.sample.json') };
  render(<Evidence userRole="admin" storedData />);
  await waitFor(() => expect(screen.getByText('Approve')).toBeTruthy());
  expect(apiFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/evidence/submissions');
  expect(screen.getByText('Stored evidence')).toBeTruthy();
  expect(screen.queryByText('New cleanup submission')).toBeNull();
  expect(screen.getByText('Submitted by member')).toBeTruthy();
  expect(screen.getByText('Reject')).toBeTruthy();
});

it('withholds human decision controls while Gemma is processing', async () => {
  render(<Evidence userRole="admin" storedData />);
  await waitFor(() => expect(screen.getByText('Gemma Smart Verification')).toBeTruthy());
  expect(screen.queryByText('Approve')).toBeNull();
  expect(screen.queryByText('Reject')).toBeNull();
  expect(screen.getByText('Human review starts after Gemma analysis finishes.')).toBeTruthy();
});

it('separates pending, approved, paid, and rejected records into admin sections', async () => {
  const items = [
    { ...submission, id: 1, username: 'pending-member' },
    { ...submission, id: 2, username: 'approved-member', status: 'approved' },
    { ...submission, id: 3, username: 'paid-member', status: 'paid' },
    { ...submission, id: 4, username: 'rejected-member', status: 'rejected' },
  ];
  apiFetch.mockImplementation(async (url) => url.includes('/evidence/submissions')
    ? { ok: true, json: async () => ({ success: true, submissions: items }) } : { ok: false });
  render(<Evidence userRole="admin" storedData />);
  await waitFor(() => expect(screen.getByText('Pending (1)')).toBeTruthy());
  expect(screen.getByText('Submitted by pending-member')).toBeTruthy();
  expect(screen.queryByText('Submitted by approved-member')).toBeNull();
  fireEvent.press(screen.getByText('Approved (2)'));
  expect(screen.getByText('Submitted by approved-member')).toBeTruthy();
  expect(screen.getByText('Submitted by paid-member')).toBeTruthy();
  expect(screen.queryByText('Submitted by pending-member')).toBeNull();
  expect(screen.queryByText('Approve')).toBeNull();
  fireEvent.press(screen.getByText('Rejected (1)'));
  expect(screen.getByText('Submitted by rejected-member')).toBeTruthy();
  expect(screen.queryByText('Submitted by approved-member')).toBeNull();
});

it.each(['Approved', 'Rejected'])('opens the %s section directly from an admin home card', async (section) => {
  render(<Evidence userRole="admin" storedData initialSection={section} />);
  await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  expect(screen.getByText(`No ${section.toLowerCase()} submissions.`)).toBeTruthy();
  expect(screen.queryByText('New cleanup submission')).toBeNull();
});
