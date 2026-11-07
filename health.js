// Cloudflare Pages Function: forwards the existing game Worker's /health
// over a PRIVATE Service Binding (no public workers.dev request).
export async function onRequestGet({ env }) {
  if (!env.GAME || typeof env.GAME.fetch !== 'function') {
    return Response.json({
      ok: false,
      relay: 'chuiniubi-pages-relay',
      error: 'GAME_SERVICE_BINDING_MISSING',
      message: '请在 Pages 项目 Settings → Bindings 添加 Service binding：GAME → my-chuiniubi-room，然后重新部署。'
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const upstream = await env.GAME.fetch('https://game.internal/health');
    // Health check responses are ordinary HTTP responses, never WebSocket upgrades.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Chuiniubi-Relay': 'pages-service-binding'
      }
    });
  } catch (error) {
    console.error('Game health check service binding error', String(error));
    return Response.json({ ok: false, error: 'GAME_SERVICE_UNAVAILABLE', message: 'Pages 已打开，但无法通过 Service Binding 调用游戏 Worker。' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
