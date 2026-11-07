import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as health } from '../functions/health.js';
import { onRequest as ws } from '../functions/ws.js';

test('Health: missing binding returns clear diagnostic rather than false success', async()=>{
  const res=await health({env:{}});
  assert.equal(res.status,503);
  const data=await res.json();
  assert.equal(data.error,'GAME_SERVICE_BINDING_MISSING');
});
test('Health: service binding calls internal Worker and forwards JSON',async()=>{
  let called;
  const res=await health({env:{GAME:{fetch:async u=>{called=u;return new Response(JSON.stringify({ok:true,version:'1.1-voice'}),{headers:{'content-type':'application/json'}})}}}});
  assert.equal(called,'https://game.internal/health');
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{ok:true,version:'1.1-voice'});
});
test('WS: non-upgrade GET returns 426, without calling bound Worker',async()=>{
  const request=new Request('https://relay.pages.dev/ws?room=ABC123',{method:'GET'});
  const res=await ws({request,env:{}});
  assert.equal(res.status,426);
});
test('WS: only /ws target forwarded; original query, websocket Upgrade kept',async()=>{
  let url,header;
  const upstreamResponse={status:101,webSocket:{test:true}};
  const request=new Request('https://relay.pages.dev/ws?room=ABC123&token=deadbeef&name=Joe',{headers:{Upgrade:'websocket'}});
  const res=await ws({request,env:{GAME:{fetch:async req=>{url=new URL(req.url);header=req.headers.get('Upgrade');return upstreamResponse;}}}});
  assert.equal(res,upstreamResponse);
  assert.equal(url.host,'game.internal');
  assert.equal(url.pathname,'/ws');
  assert.equal(url.searchParams.get('room'),'ABC123');
  assert.equal(url.searchParams.get('token'),'deadbeef');
  assert.equal(header,'websocket');
});
test('WS: missing binding returns 503',async()=>{
  const res=await ws({request:new Request('https://relay.pages.dev/ws?room=ABC123',{headers:{Upgrade:'websocket'}}),env:{}});
  assert.equal(res.status,503);
});
