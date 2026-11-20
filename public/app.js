const examples = {
  edge: { file: 'netlify/edge-functions/access-log.ts', caption: 'Runs close to every visitor', code: `import { getStore } from '@netlify/blobs';

export default async (request, context) => {
  const start = Date.now();
  const response = await context.next();

  context.waitUntil(
    getStore('access-logs').setJSON(
      crypto.randomUUID(), {
        timestamp: new Date().toISOString(),
        path: new URL(request.url).pathname,
        method: request.method,
        status_code: response.status,
        duration_ms: Date.now() - start,
        request_id: context.requestId,
      }
    ).catch(() => console.error('Buffer failed'))
  );
  return response;
};
// Simplified excerpt. Full implementation in the repo.` },
  flush: { file: 'netlify/functions/flush-access-logs.mts', caption: 'Production schedule · every minute', code: `import { getStore } from '@netlify/blobs';
import { forwardLogs } from '../lib/forward.ts';

export default async () => {
  const apiKey = Netlify.env.get('LOG_API_KEY');
  if (!apiKey) return;

  const store = getStore('access-logs');
  // Read in bounded batches of 100 events.
  // Send with x-api-key via server-only transport.
  // Delete only after a successful response.
  // Retain failed batches for the next run.
};

export const config = {
  schedule: '* * * * *',
};
// See the repository for the complete handler.` },
  client: { file: 'src/hooks/useAccessLog.ts', caption: 'Router integration · mount once at the app root', code: `import { useLocation } from 'react-router-dom';
import { useAccessLog } from './hooks/useAccessLog';

export function NavigationLogger() {
  const { pathname, search } = useLocation();
  useAccessLog(pathname + search);
  return null;
}

// The hook batches route changes every 60 seconds
// or after 100 events, whichever comes first.
// On page hide, sendBeacon sends to:
//   POST /api/access-log
// The proxy adds x-api-key on the server.
// Initial page requests are captured at the edge.` }
};
let current = 'edge';
const code = document.getElementById('code');
function selectTab(tab) {
  current = tab;
  code.textContent = examples[tab].code;
  document.getElementById('filename').textContent = examples[tab].file;
  document.getElementById('code-caption').textContent = examples[tab].caption;
  document.querySelectorAll('.step').forEach(button => { const selected = button.dataset.tab === tab; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
}
document.querySelectorAll('.step').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));
let toastTimer;
async function copy(value) {
  const toast = document.getElementById('toast');
  try { await navigator.clipboard.writeText(value); toast.textContent = 'Copied to clipboard'; }
  catch { toast.textContent = 'Copy unavailable. Select the code to copy it manually.'; }
  toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}
document.getElementById('copy-code').addEventListener('click', () => copy(examples[current].code));
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => copy(button.dataset.copy)));
const serverPayload = [{ timestamp: '2026-11-20T12:04:18.312Z', method: 'GET', url: 'https://yoursite.netlify.app/pricing', path: '/pricing', query: '', status_code: 200, duration_ms: 45, client_ip: '192.0.2.42', user_agent: 'Mozilla/5.0…', referer: null, content_type: 'text/html', country: 'US', city: 'San Francisco', region: 'us-east-2', request_id: '01JD4G7Y2…', site: 'your-site', deploy_id: '6b00bebacd…' }];
const clientPayload = [{ timestamp: '2026-11-20T12:04:22.684Z', type: 'client_navigation', method: 'GET', url: 'https://yoursite.netlify.app/about', path: '/about', query: '', user_agent: 'Mozilla/5.0…', referer: 'https://yoursite.netlify.app/pricing' }];
let client = false;
function showPayload() { document.getElementById('payload-code').textContent = JSON.stringify(client ? clientPayload : serverPayload, null, 2); document.getElementById('payload-toggle').textContent = client ? 'Show server payload ↔' : 'Show client payload ↔'; }
document.getElementById('payload-toggle').addEventListener('click', () => { client = !client; showPayload(); });
document.getElementById('copy-payload').addEventListener('click', () => copy(document.getElementById('payload-code').textContent));
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('.side').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`)); });
}, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
selectTab('edge'); showPayload();
