# Architecture

This project is a portable Netlify access-log forwarding implementation and a static documentation site. The user's explicit architecture uses a conventional proxy Function rather than a Netlify Server. There is no framework, scaffold, or frontend build command.

- `public/`: published site, hand-written HTML/CSS and browser JavaScript. Code examples are explicitly excerpts, not the runtime implementations. UI interactions include copy controls, setup step selection, payload switching, and section tracking.
- `netlify/edge-functions/access-log.ts`: response metadata collection and asynchronous JSON buffering in the `access-logs` site-level Blobs store.
- `netlify/functions/flush-access-logs.mts`: production minute schedule; paginated, bounded delivery with delete-after-success semantics.
- `netlify/functions/log-proxy.mts`: same-origin JSON client ingestion at `/api/access-log`.
- `netlify/lib/forward.ts`: server-only destination and transport, including x-api-key injection and timeout.
- `src/hooks/useAccessLog.ts`: optional React integration; intentionally not loaded by the static guide.
- `netlify.toml`: publish directory and edge exclusions. Edge binding is defined only here to avoid duplicate invocation.

Use `.mts` for Node Functions and `.ts` for Edge Functions. Use the Netlify runtime environment API for secrets. Never introduce secret browser configuration or print request bodies, credentials, or raw upstream errors. The required secret is `LOG_API_KEY`.

Blobs is intentionally used as the requested temporary delivery buffer, not a database. It is shared between deploys. Do not add a relational database just for this log spool. Failed batches remain buffered; successful batches delete exactly the objects transmitted. Delivery is at least once and browser tracking is best effort. Preserve byte limits, origin checks, pagination, bounded batch sizes, and timeout budgets.

Maintain the restrained green documentation layout, responsive sidebar behavior, accessible focus states, and reduced-motion support. Do not add fake live telemetry. Keep example payloads clearly labeled illustrative. Consult current plan documentation before publishing quota claims.

The platform validates builds after changes. Do not run local build, development-server, or test commands during automated editing runs. Read changed files to review them. Do not commit or create pull requests directly.
