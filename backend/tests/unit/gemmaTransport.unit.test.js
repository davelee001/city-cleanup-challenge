const http = require('http');
const transport = require('../../src/services/gemmaTransport');

it('honors an explicit abort deadline while waiting for response headers', async () => {
  const server = http.createServer((request, response) => {
    const timer = setTimeout(() => response.end('{}'), 500);
    request.on('close', () => clearTimeout(timer));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await expect(transport.fetch(`http://127.0.0.1:${server.address().port}`, { signal: AbortSignal.timeout(100) }))
      .rejects.toMatchObject({ name: 'AbortError' });
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
