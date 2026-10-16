import { streamEvidenceAnalysis } from '../../evidenceAnalysis';
import { apiFetch } from '../../apiConfig';

jest.mock('../../apiConfig', () => ({ API_BASE_URL: 'http://localhost:3000/api/v1', apiFetch: jest.fn() }));

it('delivers response lines in order using authenticated POST and forwards cancellation', async () => {
  const signal = new AbortController().signal;
  apiFetch.mockResolvedValue({ ok: true, text: async () => '{"type":"progress","message":"Preparing"}\n{"type":"result","analysis":{"status":"completed"}}\n' });
  const event = jest.fn();
  await streamEvidenceAnalysis(12, event, signal);
  expect(apiFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/evidence/submissions/12/analyze', { method: 'POST', signal });
  expect(event.mock.calls.map(([item]) => item.type)).toEqual(['progress', 'result']);
});

it('surfaces access and connection errors without claiming a completed analysis', async () => {
  apiFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Only the uploader can start analysis' }) });
  await expect(streamEvidenceAnalysis(12, jest.fn())).rejects.toThrow('Only the uploader');
});
