// Separate direct Pages WebSocket echo test, independent of the game Worker.
export function onRequestGet({ request }) {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Connect to /echo using wss://', { status: 426 });
  }
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  server.addEventListener('message', (event) => {
    if (event.data === 'ping') server.send('pong');
    else server.send('echo');
  });
  return new Response(null, { status: 101, webSocket: client });
}
