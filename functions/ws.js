// Cloudflare Pages Function: transparently passes through the WebSocket upgrade.
// The original Cloudflare Worker remains authoritative for room state/rules.
export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('WebSocket Upgrade required', { status: 426 });
  }
  if (!env.GAME || typeof env.GAME.fetch !== 'function') {
    return new Response('Missing Service Binding: GAME → my-chuiniubi-room', { status: 503 });
  }

  // Keep the original /ws?room=...&token=...&name=... query string intact.
  // This must be a Service Binding fetch, NOT fetch("https://*.workers.dev").
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL('https://game.internal/ws');
  targetUrl.search = sourceUrl.search;
  const proxiedRequest = new Request(targetUrl.toString(), request);

  try {
    // Returning the 101 Response directly hands its WebSocket to the client.
    // Do not read, wrap, or clone a 101 Response.
    return await env.GAME.fetch(proxiedRequest);
  } catch (error) {
    // Never print connection URLs: they include the player's room and identity token.
    console.error('Game WebSocket Service Binding error', String(error));
    return new Response('Game WebSocket relay failed', { status: 502 });
  }
}
