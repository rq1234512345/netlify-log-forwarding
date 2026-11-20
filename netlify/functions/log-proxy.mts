import type { Config } from '@netlify/functions';
import { forwardLogs } from '../lib/forward.ts';

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { ...headers, Allow: 'POST' } });
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return new Response('Forbidden', { status: 403, headers });
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return new Response('Expected application/json', { status: 415, headers });
  }
  const apiKey = Netlify.env.get('LOG_API_KEY');
  if (!apiKey) return new Response('Log forwarding is not configured', { status: 503, headers });
  // Read incrementally, so oversized requests cannot allocate an unbounded body.
  const reader = request.body?.getReader();
  if (!reader) return new Response('Missing body', { status: 400, headers });
  let body = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 60000) {
      await reader.cancel();
      return new Response('Batch too large', { status: 413, headers });
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  let entries: unknown;
  try { entries = JSON.parse(body); } catch { return new Response('Invalid JSON', { status: 400, headers }); }
  if (!Array.isArray(entries) || !entries.length || entries.length > 100 || !entries.every(entry =>
    entry && entry.type === 'client_navigation' && typeof entry.path === 'string' &&
    typeof entry.timestamp === 'string' && typeof entry.url === 'string' &&
    entry.path.length <= 4096 && Number.isFinite(Date.parse(entry.timestamp)) &&
    (() => { try { return new URL(entry.url).origin === new URL(request.url).origin; } catch { return false; } })()
  )) return new Response('Invalid navigation batch', { status: 400, headers });
  try {
    const response = await forwardLogs(entries, apiKey);
    await response.body?.cancel();
    return new Response(null, { status: response.ok ? 204 : 502, headers });
  } catch {
    return new Response('Log endpoint unavailable', { status: 502, headers });
  }
};

export const config: Config = { path: '/api/access-log' };
