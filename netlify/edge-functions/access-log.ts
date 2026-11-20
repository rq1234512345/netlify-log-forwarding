import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  const startTime = Date.now();
  const response = await context.next();
  const url = new URL(request.url);
  const entry = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    path: url.pathname,
    query: url.search,
    status_code: response.status,
    duration_ms: Date.now() - startTime,
    client_ip: context.ip,
    user_agent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    content_type: response.headers.get('content-type'),
    country: context.geo.country?.code,
    city: context.geo.city,
    region: context.server.region,
    request_id: context.requestId,
    site: context.site.name,
    deploy_id: context.deploy.id,
  };
  context.waitUntil((async () => {
    try {
      await getStore('access-logs').setJSON(`${Date.now()}-${crypto.randomUUID()}`, entry);
    } catch {
      console.error('Failed to buffer access log');
    }
  })());
  return response;
};
