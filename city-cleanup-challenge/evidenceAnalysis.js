import { API_BASE_URL, apiFetch } from './apiConfig';

export async function streamEvidenceAnalysis(id, onEvent, signal) {
  const response = await apiFetch(`${API_BASE_URL}/evidence/submissions/${id}/analyze`, { method: 'POST', signal });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Unable to open Gemma analysis.');
  }
  const consume = (line) => { if (line.trim()) onEvent(JSON.parse(line)); };
  if (!response.body?.getReader) {
    (await response.text()).split('\n').forEach(consume);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
  } finally { reader.releaseLock(); }
}
