import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SmartVerification from '../../components/SmartVerification';

const findings = {
  assessment: 'Less visible litter; disposal cannot be confirmed.',
  wasteCategories: ['plastic'], cleanupEvidence: 'visible_improvement', sameScene: 'likely',
  visualDifferences: ['Fewer wrappers visible.'], environmentalConcerns: [],
  limitations: ['Weight cannot be inferred.'], recommendations: ['Leave sharps to trained services.'],
};

it('shows observations, limits, and human oversight without decision controls', () => {
  render(<SmartVerification analysis={{ status: 'completed', model: 'gemma3:4b', findings }} />);
  expect(screen.getByText(findings.assessment)).toBeTruthy();
  expect(screen.getByText('Visible categories: plastic')).toBeTruthy();
  expect(screen.getByText(/Weight cannot be inferred/)).toBeTruthy();
  expect(screen.getByText(/Leave sharps/)).toBeTruthy();
  expect(screen.getByText(/Human decision required/)).toBeTruthy();
  expect(screen.queryByText('Approve')).toBeNull();
});

it.each(['disabled', 'unavailable', 'skipped', 'pending'])('explains %s status', (status) => {
  render(<SmartVerification analysis={{ status }} />);
  expect(screen.getByText('Gemma Smart Verification')).toBeTruthy();
  expect(screen.getByText(/AI findings are advisory/)).toBeTruthy();
});

it('supports older submissions without AI results', () => {
  const view = render(<SmartVerification />);
  expect(view.toJSON()).toBeNull();
});

it('explains rejected output quality without displaying untrusted findings', () => {
  render(<SmartVerification analysis={{ status: 'unavailable', qualityFlags: ['repeated_findings'], findings: { assessment: 'Unsupported content' } }} />);
  expect(screen.getByText(/repeated findings/)).toBeTruthy();
  expect(screen.queryByText('Unsupported content')).toBeNull();
});
