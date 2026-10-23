import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createServer,type Server} from 'node:net';
import type {IncomingMessage} from 'node:http';
import {consumeRestrictedResponse,configuredProxy,connectTunnel,restrictedHttpsTransport,RESEARCH_AGENT}
 from '../src/approved_web_reader.js';

/** A minimal IncomingMessage stand-in: a byte stream with a status and headers. */
function response(status:number,headers:Record<string,string>,chunks:string[]=[]):IncomingMessage{
 const s=Object.assign(new PassThrough(),{statusCode:status,headers}) as unknown as IncomingMessage&PassThrough;
 setImmediate(()=>{for(const c of chunks)s.write(Buffer.from(c));s.end();});
 return s;
}
const URL0='https://example.org/page';

test('transport response: 200 identity body is returned with headers and the final URL',async()=>{
 const r=await consumeRestrictedResponse(response(200,{'content-type':'text/html','etag':'"v1"','last-modified':'Mon, 01 Jan 2026 00:00:00 GMT','date':'Tue, 02 Jan 2026 00:00:00 GMT','retry-after':'120'},['<p>a','bc</p>']),URL0,1000);
 assert.equal(r.status,200);assert.equal(r.body,'<p>abc</p>');assert.equal(r.finalUrl,URL0);
 assert.equal(r.contentType,'text/html');assert.equal(r.etag,'"v1"');assert.equal(r.lastModified,'Mon, 01 Jan 2026 00:00:00 GMT');
 assert.equal(r.date,'Tue, 02 Jan 2026 00:00:00 GMT');assert.equal(r.retryAfter,'120');
 assert.ok(Buffer.isBuffer(r.rawBytes));
});
test('transport response: explicit identity encoding is accepted; missing headers become empty strings',async()=>{
 const r=await consumeRestrictedResponse(response(404,{'content-encoding':'identity'},['x']),URL0,10);
 assert.equal(r.status,404);assert.equal(r.contentType,'');assert.equal(r.etag,'');assert.equal(r.lastModified,'');
 assert.equal(r.date,null);assert.equal(r.retryAfter,null);
});
test('transport response: redirects are refused and the target is reported, never followed',async()=>{
 for(const status of [301,302,307,308]){
  await assert.rejects(consumeRestrictedResponse(response(status,{location:'https://other.example/x'}),URL0,10),
   (e:Error&{redirectStatus?:number;redirectLocation?:string|null})=>e.message==='Redirect denied'&&
    e.redirectStatus===status&&e.redirectLocation==='https://other.example/x');
 }
 await assert.rejects(consumeRestrictedResponse(response(303,{}),URL0,10),
  (e:Error&{redirectLocation?:string|null})=>e.message==='Redirect denied'&&e.redirectLocation===null);
});
test('transport response: overlong redirect location is truncated to 2000 characters',async()=>{
 await assert.rejects(consumeRestrictedResponse(response(302,{location:'https://a.example/'+'x'.repeat(5000)}),URL0,10),
  (e:Error&{redirectLocation?:string})=>e.redirectLocation?.length===2000);
});
test('transport response: compressed responses are refused',async()=>{
 for(const enc of ['gzip','br','deflate'])
  await assert.rejects(consumeRestrictedResponse(response(200,{'content-encoding':enc},['x']),URL0,10),/Encoded response denied/);
});
test('transport response: declared length above the cap is refused before reading',async()=>{
 await assert.rejects(consumeRestrictedResponse(response(200,{'content-length':'11'},['x']),URL0,10),/Byte cap exceeded/);
});
test('transport response: streamed bytes above the cap are refused even without a length header',async()=>{
 await assert.rejects(consumeRestrictedResponse(response(200,{},['12345','67890','1']),URL0,10),/Byte cap exceeded/);
});
test('transport response: exactly the cap is accepted',async()=>{
 const r=await consumeRestrictedResponse(response(200,{'content-length':'10'},['12345','67890']),URL0,10);
 assert.equal(r.body,'1234567890');
});

test('transport get: invalid byte caps and unsafe URLs fail before any network access',async()=>{
 await assert.rejects(restrictedHttpsTransport.get('https://example.org/',RESEARCH_AGENT,0),/Invalid byte cap/);
 await assert.rejects(restrictedHttpsTransport.get('https://example.org/',RESEARCH_AGENT,40_000_001),/Invalid byte cap/);
 await assert.rejects(restrictedHttpsTransport.get('http://example.org/',RESEARCH_AGENT,10));
});

function withEnv(env:Record<string,string|undefined>,fn:()=>void){
 const keys=['HTTPS_PROXY','https_proxy','NO_PROXY','no_proxy'];const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 for(const k of keys)delete process.env[k];
 for(const [k,v] of Object.entries(env))if(v!==undefined)process.env[k]=v;
 try{fn();}finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
}
test('proxy selection: none configured means direct connection',()=>{
 withEnv({},()=>assert.equal(configuredProxy('example.org'),null));
});
test('proxy selection: HTTPS_PROXY (or lowercase) is used for hosts not excluded',()=>{
 withEnv({HTTPS_PROXY:'http://proxy.local:3128'},()=>assert.equal(configuredProxy('example.org')?.host,'proxy.local:3128'));
 withEnv({https_proxy:'http://p2.local:8080'},()=>assert.equal(configuredProxy('example.org')?.host,'p2.local:8080'));
});
test('proxy selection: NO_PROXY exact, dotted suffix, wildcard and "*" bypass the proxy; others do not',()=>{
 withEnv({HTTPS_PROXY:'http://proxy.local:3128',NO_PROXY:'internal.example, .corp.example,*.lan'},()=>{
  assert.equal(configuredProxy('internal.example'),null);
  assert.equal(configuredProxy('a.internal.example'),null);
  assert.equal(configuredProxy('corp.example'),null);
  assert.equal(configuredProxy('x.corp.example'),null);
  assert.equal(configuredProxy('box.lan'),null);
  assert.notEqual(configuredProxy('notinternal.example'),null);
 });
 withEnv({HTTPS_PROXY:'http://proxy.local:3128',no_proxy:'*'},()=>assert.equal(configuredProxy('anything.example'),null));
});
test('proxy selection: non-http proxy schemes are refused',()=>{
 withEnv({HTTPS_PROXY:'https://proxy.local:3128'},()=>assert.throws(()=>configuredProxy('example.org'),/Unsupported HTTPS_PROXY scheme/));
 withEnv({HTTPS_PROXY:'socks5://proxy.local:1080'},()=>assert.throws(()=>configuredProxy('example.org'),/Unsupported HTTPS_PROXY scheme/));
});

/** A local fake proxy: answers CONNECT with the given status and records the request head. */
async function fakeProxy(status:number):Promise<{server:Server;port:number;heads:string[]}>{
 const heads:string[]=[];
 const server=createServer(sock=>{let buf='';sock.on('data',d=>{buf+=d.toString('latin1');
  if(buf.includes('\r\n\r\n')){heads.push(buf);sock.write(`HTTP/1.1 ${status} X\r\n\r\n`);if(status!==200)sock.end();}});
  sock.on('error',()=>{});});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 return {server,port:(server.address() as {port:number}).port,heads};
}
test('proxy tunnel: CONNECT host:443 succeeds on 200 and sends decoded basic credentials',async()=>{
 const p=await fakeProxy(200);
 try{
  const sock=await connectTunnel(new URL(`http://us%40er:p%3Ass@127.0.0.1:${p.port}`),'origin.example');
  sock.destroy();
  const head=p.heads[0];
  assert.match(head,/^CONNECT origin\.example:443 HTTP\/1\.1\r\n/);
  assert.match(head,/\r\nHost: origin\.example:443\r\n/i);
  assert.ok(head.includes('Proxy-Authorization: Basic '+Buffer.from('us@er:p:ss').toString('base64')));
 }finally{p.server.close();}
});
test('proxy tunnel: no credentials means no Proxy-Authorization header',async()=>{
 const p=await fakeProxy(200);
 try{(await connectTunnel(new URL(`http://127.0.0.1:${p.port}`),'origin.example')).destroy();
  assert.ok(!/Proxy-Authorization/i.test(p.heads[0]));}finally{p.server.close();}
});
test('proxy tunnel: a refused CONNECT rejects and never yields a socket',async()=>{
 const p=await fakeProxy(403);
 try{await assert.rejects(connectTunnel(new URL(`http://127.0.0.1:${p.port}`),'origin.example'),/Proxy CONNECT refused: 403/);}
 finally{p.server.close();}
});
test('proxy tunnel: an unreachable proxy rejects',async()=>{
 const p=await fakeProxy(200);const port=p.port;await new Promise<void>(r=>p.server.close(()=>r()));
 await assert.rejects(connectTunnel(new URL(`http://127.0.0.1:${port}`),'origin.example'));
});
