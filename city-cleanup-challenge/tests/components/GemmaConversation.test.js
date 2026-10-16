import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import GemmaConversation from '../../components/GemmaConversation';
import { streamEvidenceAnalysis } from '../../evidenceAnalysis';

jest.mock('../../evidenceAnalysis', () => ({ streamEvidenceAnalysis: jest.fn() }));
const submission = { id: 5, verification: { smartVerification: { status: 'pending' } } };
it('shows live progress, presents validated messages line by line, and cancels on leaving', async () => {
  let event;
  let signal;
  streamEvidenceAnalysis.mockImplementation((id, callback, cancel) => {
    event = callback; signal = cancel; return new Promise(() => {});
  });
  const onComplete = jest.fn();
  const view = render(<GemmaConversation submission={submission} onComplete={onComplete} />);
  await waitFor(() => expect(streamEvidenceAnalysis).toHaveBeenCalled());
  act(() => event({ type: 'generation', message: 'Generating assessment', characters: 15 }));
  expect(screen.getByText('Generating assessment (15 characters generated)')).toBeTruthy();
  act(() => { event({ type: 'finding', message: 'Validated cleanup comparison.' }); event({ type: 'result', analysis: { status: 'completed' } }); });
  await waitFor(() => expect(screen.getByText('Validated cleanup comparison.')).toBeTruthy());
  expect(onComplete).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(signal.aborted).toBe(true);
});
