import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import { forwardLogs } from '../lib/forward.ts';

export default async () => {
  const apiKey = Netlify.env.get('LOG_API_KEY');
  if (!apiKey) {
    console.error('LOG_API_KEY is not configured; retaining buffered logs');
    return;
  }
  const started = Date.now();
  const store = getStore('access-logs');
  try {
    for await (const page of store.list({ paginate: true })) {
      for (let offset = 0; offset < page.blobs.length; offset += 100) {
        // Leave time for the final delivery and cleanup within the 30-second limit.
        if (Date.now() - started > 17000) return;
        const results = await Promise.all(page.blobs.slice(offset, offset + 100).map(async ({ key }) => ({
          key, data: await store.get(key, { type: 'json' }),
        })));
        const entries = results.filter(entry => entry.data !== null);
        if (!entries.length) continue;
        const response = await forwardLogs(entries.map(entry => entry.data), apiKey);
        if (!response.ok) {
          console.error(`Log delivery failed with status ${response.status}; retaining batch`);
          await response.body?.cancel();
          return;
        }
        await response.body?.cancel();
        // Delete exactly the successfully delivered objects, never the whole listing.
        const deleted = await Promise.allSettled(entries.map(entry => store.delete(entry.key)));
        if (deleted.some(result => result.status === 'rejected')) {
          console.error('Some delivered entries could not be deleted; duplicates may be retried');
          return;
        }
        console.log(`Flushed ${entries.length} access log entries`);
      }
    }
  } catch {
    console.error('Access log flush interrupted; unsent entries remain buffered');
  }
};

export const config: Config = { schedule: '* * * * *' };
