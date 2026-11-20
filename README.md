# Netlify Access Log Forwarding

A deployable access-log pipeline with a static integration guide. Requests are captured by an Edge Function, buffered as JSON objects in Netlify Blobs, and forwarded every minute to `https://stream.getlimy.ai`. A same-origin function handles React SPA navigation batches without exposing credentials.

## Technologies

TypeScript, Netlify Edge Functions, Netlify Blobs, Scheduled Functions, a React hook, and a static HTML/CSS/JavaScript documentation site. No frontend build step is required.

## Setup

Install dependencies with `npm install`. Configure `LOG_API_KEY` through Netlify's secret environment-variable UI in the deploy contexts that need forwarding. Never prefix the variable for browser exposure or add it to source control. The secret needs runtime access for Functions, not access in browser assets.

Deploy through the connected Netlify repository. The publish directory is `public`. Scheduled functions run only on the published production deploy, not on branch deploys or deploy previews. Edge requests on previews also write to the site-level buffer and are identifiable by `deploy_id`; the production schedule drains that shared buffer. Configure production with the key even if testing client forwarding on a preview.

For local development use the Netlify CLI: `netlify dev --port 8889`. This serves the static guide and emulates the platform features. Scheduled execution is not automatic locally; use `netlify functions:invoke flush-access-logs` for a deliberate flush against your configured destination. No commands send example traffic to the upstream endpoint automatically.

## Integration

Copy `netlify/edge-functions/access-log.ts`, `netlify/functions/flush-access-logs.mts`, `netlify/functions/log-proxy.mts`, and `netlify/lib/forward.ts` to another site. Merge `netlify.toml` routing and dependencies into that project. The user-specified proxy is a Netlify Function to keep the integration portable. Change the destination in the shared server-only `netlify/lib/forward.ts` if needed. Redirects are refused to prevent credential forwarding to another host.

For a React SPA, copy `src/hooks/useAccessLog.ts` and call `useAccessLog(pathname + search)` once inside the router root. The initial document load is captured at the edge. Subsequent location changes are batched at 100 events or every 60 seconds. The integration guide itself is a static document and does not mount the React hook.

## Delivery and limitations

The worker paginates buffered objects, sends at most 100 entries per request, and stops starting work after 17 seconds to reserve time within the scheduled runtime. Failed deliveries remain in Blobs for another run. Only objects included in successful responses are deleted. Storage errors are reported without log bodies or credentials. The edge excludes static assets, internal platform routes, and the proxy to avoid recording logging requests.

Delivery is at least once: timeouts after upstream acceptance, overlapping invocations, eventual-consistency reads, or cleanup failures can produce duplicates. Deduplicate server events by `request_id` at the destination. Blobs visibility may delay a record by another scheduling cycle. Backlogs have no automatic expiry; monitor storage and endpoint availability. Browser navigation logging is best effort: its bounded memory queue does not persist across reloads, beacon acceptance does not guarantee delivery, and abrupt tab closure can lose events. The proxy enforces JSON, size and schema limits, and rejects cross-origin browser requests; it is a public ingestion route, not a user authentication mechanism.

Logs include IP addresses and full URLs/query strings. Adjust capture fields to your privacy needs and avoid sensitive URL parameters. Platform quotas and billing vary by plan; consult current Netlify pricing rather than relying on historical free-tier allowances.

## Validation

Files were reviewed without starting a server or running local builds or tests. The Netlify deployment pipeline performs build validation.
