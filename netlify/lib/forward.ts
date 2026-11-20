/** Shared server-only transport. Never import into browser code. */
export async function forwardLogs(entries: unknown[], apiKey: string, timeout = 8000) {
  return fetch('https://stream.getlimy.ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'LimyAnalyticsNetlifyAccessLogs',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(entries),
    signal: AbortSignal.timeout(timeout),
    redirect: 'error',
  });
}
