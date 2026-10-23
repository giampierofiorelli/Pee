/**
 * Phase 69 — approved-source page reader, isolated from production ranking.
 * Access authorization, source content licence and website robots are distinct checks.
 * No general spider, no bypass, no third-party content archive.
 */
import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {request as httpRequest,type IncomingMessage} from 'node:http';
import {connect as tlsConnect} from 'node:tls';
import type {Socket} from 'node:net';
import type {WebCandidate,WebSourcePolicy,EvidenceAcquisitionPlan,EvidenceQueueItem,EvidenceProcessingResult} from './web_evidence_acquisition.js';
import {quarantineRetrievedEvidence,planWebEvidenceAcquisition} from './web_evidence_acquisition.js';

export const RESEARCH_AGENT='ProductEvidenceResearchBot';
/** Upper bound for one transiently read HTML page. Current retail/editorial pages are often 1-2MB. */
export const PAGE_MAX_BYTES=3_000_000;
export interface SourceResponse {
  status:number;
  finalUrl:string;
  contentType:string;
  body:string;
  /** Optional exact HTTP response bytes; provided by the built-in transport or an explicitly injected test transport;
   * the mere presence of this property is not an origin authentication.
   * Never include this buffer in a serializable research result. */
  rawBytes?:Uint8Array;
  /** Present only for source metadata, not a claims verification signal. */
  etag?:string|null;
  lastModified?:string|null;
  /** Phase264: the server's Date and Retry-After headers, for clock checks and provider back-off instructions. */
  date?:string|null;
  retryAfter?:string|null;
}
export interface SourceTransport { get(url:string,agent:string,maxBytes:number):Promise<SourceResponse>; }
export interface TransientWebClaim {criterionId:string;valueText:string;anchorText:string;}
export type ReadOutcome={status:'blocked';reasons:string[];url:string} |
 {status:'quarantined';url:string;robotsChecked:true;evidence:EvidenceProcessingResult;httpStatus:200;};

/** DNS pinning for the built-in transport; deliberately IPv4-only and fail-closed. */
export function publicIPv4(address:string):boolean {
 const parts=address.split('.');
 if(parts.length!==4||parts.some(x=>!/^\d{1,3}$/.test(x)||Number(x)>255))return false;
 const [a,b,c,d]=parts.map(Number);
 if(a===0||a===10||a===127||a>=224||a===169&&b===254||
  a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||
  a===198&&(b===18||b===19)||a===192&&b===0||a===192&&b===88&&c===99||
  a===192&&b===0&&c===2||a===198&&b===51&&c===100||
  a===203&&b===0&&c===113||a===169&&b===253||a===255)return false;
 // no special-casing 8.8.8.8 etc as privileged hosts
 return !(a===0&&b===0&&c===0&&d===0);
}
function secureUrl(raw:string):URL {
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.username||u.password||
   (u.port&&u.port!=='443')||!/^[a-z0-9.-]+$/.test(u.hostname)||
   !u.hostname.includes('.')||u.hostname.endsWith('.')||
   /(?:^|\.)(?:localhost|internal|test|invalid|example)$/.test(u.hostname))throw Error('URL denied');
 if(!/^[\x20-\x7e]+$/.test(u.pathname+u.search))throw Error('Ambiguous URL encoding');
 if(/%2f|%5c|%2e|%00/i.test(u.pathname))throw Error('Ambiguous URL encoding');
 return u;
}

/** HTTPS_PROXY from the environment, if any. Only plain http:// proxies (CONNECT over TCP) are supported. */
export function configuredProxy(hostname:string):URL|null{
 const raw=process.env.HTTPS_PROXY??process.env.https_proxy;
 if(!raw)return null;
 const noProxy=(process.env.NO_PROXY??process.env.no_proxy??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(noProxy.some(e=>e==='*'||hostname===e.replace(/^\*?\./,'')||hostname.endsWith('.'+e.replace(/^\*?\./,''))))return null;
 const proxy=new URL(raw);
 if(proxy.protocol!=='http:')throw Error('Unsupported HTTPS_PROXY scheme');
 return proxy;
}
/** Opens a CONNECT tunnel to host:443 through the proxy and resolves with the raw tunnelled socket. */
export function connectTunnel(proxy:URL,hostname:string):Promise<Socket>{
 return new Promise((resolve,reject)=>{
  const headers:Record<string,string>={Host:`${hostname}:443`};
  if(proxy.username)headers['Proxy-Authorization']='Basic '+Buffer.from(
   `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64');
  const req=httpRequest({host:proxy.hostname,port:Number(proxy.port||80),method:'CONNECT',
   path:`${hostname}:443`,headers,agent:false,timeout:8000});
  req.on('connect',(res,socket)=>{
   if(res.statusCode!==200){socket.destroy();reject(Error(`Proxy CONNECT refused: ${res.statusCode}`));return;}
   resolve(socket);
  });
  req.on('timeout',()=>req.destroy(Error('Proxy CONNECT timeout')));
  req.on('error',reject);req.end();
 });
}

/** Response policy of the built-in transport: no redirects, identity encoding only, byte cap enforced on the
 * declared length and on the streamed bytes. Exported so the refusals can be tested without network access. */
export function consumeRestrictedResponse(res:IncomingMessage,finalUrl:string,maxBytes:number):Promise<SourceResponse>{
 return new Promise((resolve,reject)=>{
  // Redirects are never followed here. The target is reported so a caller can apply its own policy
  // (same-site only, robots re-check, counted as a new request) and issue a separate request.
  if((res.statusCode??0)>=300&& (res.statusCode??0)<400){res.resume();
   const e=Object.assign(Error('Redirect denied'),{redirectStatus:res.statusCode,redirectLocation:typeof res.headers.location==='string'?res.headers.location.slice(0,2000):null});
   reject(e);return;}
  if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){
    res.resume();reject(Error('Encoded response denied'));return;
  }
  const sizeHeader=Number(res.headers['content-length']??0);
  if(sizeHeader>maxBytes){res.destroy();reject(Error('Byte cap exceeded'));return;}
  let used=0;const chunks:Buffer[]=[];
  res.on('data',(chunk:Buffer)=>{
   used+=chunk.length;
   if(used>maxBytes){res.destroy(Error('Byte cap exceeded'));return;}
   chunks.push(chunk);
  });
  res.on('end',()=>{const rawBytes=Buffer.concat(chunks);resolve({status:res.statusCode??0,finalUrl,
   contentType:String(res.headers['content-type']??''),rawBytes,body:rawBytes.toString('utf8'),
   etag:String(res.headers.etag??''),lastModified:String(res.headers['last-modified']??''),
   date:typeof res.headers.date==='string'?res.headers.date:null,retryAfter:typeof res.headers['retry-after']==='string'?res.headers['retry-after']:null});});
  res.on('error',reject);
 });
}

/** Real network implementation. Refuses redirects, private DNS answers, compression and oversize responses.
 *
 * When HTTPS_PROXY is set (and the host is not excluded by NO_PROXY) the request is tunnelled through the
 * proxy with HTTP CONNECT. TLS is still negotiated end-to-end inside the tunnel against the origin hostname,
 * with certificate verification on (default CA store plus NODE_EXTRA_CA_CERTS, which Node loads at startup).
 * HTTPS-only, no redirects, the byte cap and identity-only encoding apply unchanged on both paths.
 *
 * LIMITATION: in proxy mode, private-IP pinning CANNOT be enforced. The local DNS lookup and publicIPv4()
 * check below still run, but the proxy resolves the hostname itself and may connect to a different address
 * (DNS rebinding, split-horizon DNS, or a proxy that can reach internal networks). The guarantee that the
 * bytes came from a public IPv4 address only holds on the direct path, where the socket is pinned to the
 * checked address. In proxy mode that guarantee rests on the proxy's own egress policy.
 */
export const restrictedHttpsTransport:SourceTransport={
 async get(raw,agent,maxBytes){
  const url=secureUrl(raw);
  // 40MB matches the largest caller bound (Phase228 PDF manuals); each caller passes its own smaller cap.
  if(maxBytes<1||maxBytes>40_000_000)throw Error('Invalid byte cap');
  const answers=await lookup(url.hostname,{family:4,all:true,verbatim:true});
  if(answers.length===0||answers.some(a=>!publicIPv4(a.address)))throw Error('No safe public IPv4 address');
  const pinned=answers[0].address;
  const proxy=configuredProxy(url.hostname);
  const tunnel=proxy?await connectTunnel(proxy,url.hostname):null;
  return new Promise((resolve,reject)=>{
   const req=request(url,{method:'GET',headers:{'User-Agent':agent,'Accept':'text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.8,application/vnd.openxmlformats-officedocument.wordprocessingml.document;q=0.8','Accept-Encoding':'identity'},
    timeout:8000,rejectUnauthorized:true,
    ...(tunnel
     // TLS inside the CONNECT tunnel; SNI and certificate checks use the origin hostname, not the proxy.
     // `agent` must stay undefined here: with agent:false Node builds a fresh Agent that ignores
     // createConnection and silently dials the origin directly instead of using the tunnel.
     ?{createConnection:()=>tlsConnect({socket:tunnel,servername:url.hostname,rejectUnauthorized:true})}
     // Direct path: pin the socket to the checked address. Node >=20 calls lookup with {all:true}
     // (autoSelectFamily), which expects an address array, so answer in whichever form was asked for.
     :{lookup:((_hostname:string,options:{all?:boolean},cb:(...a:unknown[])=>void)=>
       options?.all?cb(null,[{address:pinned,family:4}]):cb(null,pinned,4)) as never,agent:false})},res=>{consumeRestrictedResponse(res,url.toString(),maxBytes).then(resolve,reject);});
   req.on('timeout',()=>req.destroy(Error('Timeout')));
   req.on('error',e=>{tunnel?.destroy();reject(e);});req.end();
  });
 }
};

/** Conservative robots subset. Unknown syntax or absent matching group is denied, not silently allowed. */
export function robotsDecision(body:string,pathname:string,agent=RESEARCH_AGENT):'allow'|'deny'|'unknown'{
 if(body.length>512000||!/^\/[a-zA-Z0-9._~!$&'()*+,;=:@%/?-]*$/.test(pathname)||
  /%2f|%5c|%2e|%00/i.test(pathname))return 'unknown';
 type Group={agents:string[];rules:{kind:'allow'|'disallow';pattern:string}[]};
 const groups:Group[]=[];let current:Group|null=null;let rulesStarted=false;
 for(const line of body.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const s=line.split('#')[0].trim();if(!s)continue;
  const match=/^([a-z-]+)\s*:\s*(.*)$/i.exec(s);
  if(!match)continue;
  const key=match[1].toLowerCase(),value=match[2].trim();
  if(key==='user-agent'){
   if(!current||rulesStarted){current={agents:[],rules:[]};groups.push(current);rulesStarted=false;}
   current.agents.push(value.toLowerCase());
  }else if(key==='allow'||key==='disallow'){
   if(!current||!current.agents.length)continue;
   rulesStarted=true;
   // RFC 9309 path patterns start with '/'; a leading '*' (e.g. "Disallow: */embed/") is the
   // widely used wildcard form. Anything else is still treated as unparseable and fails closed.
   if(value&&(!/^[/*]/.test(value)||/\s/.test(value)))return 'unknown';
   if(value)current.rules.push({kind:key,pattern:value});
  }
 }
 const lower=agent.toLowerCase();
 const named=groups.filter(g=>g.agents.some(a=>a!=='*'&&lower.includes(a)));
 const matched=named.length?named:groups.filter(g=>g.agents.includes('*'));
 if(!matched.length)return 'unknown';
 const candidates=matched.flatMap(g=>g.rules).flatMap(rule=>{
  const raw=rule.pattern;
  // '$' is only special at the end of a pattern (end-of-URL anchor); elsewhere it is literal.
  const anchored=raw.endsWith('$'),body=anchored?raw.slice(0,-1):raw;
  const escaped=body.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
  try {
   const regex=new RegExp('^'+escaped+(anchored?'$':''));
   return regex.test(pathname)?[{...rule,length:raw.replace(/[\*$]/g,'').length}]:[];
  }catch{return [];}
 });
 if(candidates.length===0)return 'allow';
 candidates.sort((a,b)=>b.length-a.length||(a.kind==='allow'?-1:1));
 return candidates[0].kind==='allow'?'allow':'deny';
}

export async function readApprovedSource(args:{
 plan:EvidenceAcquisitionPlan;
 queueItem:EvidenceQueueItem;
 candidate:WebCandidate;
 policy:WebSourcePolicy;
 checkedAt:string;
 transport?:SourceTransport;
 /** Runs synchronously in the local research process while approved bytes are ephemeral.
  * Do not use a remotely hosted AI model here without a separately approved remote_ai_transfer operation.
  * Must not persist, log, forward, or return page text. Invalid extraction aborts acquisition. */
 transientClaimExtractor?:(body:string)=>readonly TransientWebClaim[]|Promise<readonly TransientWebClaim[]>;
 /** Privileged ephemeral complete-byte hook, after research quarantine passes. */
 onQuarantinedDocument?:(document:{url:string;completeBytes:Uint8Array;
  contentType:string;etag:string|null;lastModified:string|null})=>void|Promise<void>;
}):Promise<ReadOutcome>{
 const {plan,queueItem,candidate,policy,checkedAt}=args;
 const fail=(reason:string):ReadOutcome=>({status:'blocked',reasons:[reason],url:candidate.url});
 const now=Date.parse(checkedAt);
 if(!Number.isFinite(now)||!Number.isFinite(Date.parse(plan.asOf))||
  Math.abs(now-Date.parse(plan.asOf))>3600000)return fail('clock_or_policy_snapshot_outdated');
 const verify=planWebEvidenceAcquisition({exactVariantId:plan.exactVariantId,
  userQuestion:'Independent empirical research on this exact product and use case',asOf:checkedAt,
  maxDaysSinceCheck:7,candidates:[candidate],policies:[policy],existing:[]});
 const recalculated=verify.items[0];
 if(plan.approvalBySoftware!==false||plan.rankingEligible!==false||plan.publicationReady!==false||
    queueItem.action!=='retrieve_for_research'||recalculated.action!=='retrieve_for_research'||
    queueItem.canonicalUrl!==recalculated.canonicalUrl||queueItem.candidateId!==candidate.id||
    !queueItem.plannedOperations.includes('page_retrieval'))return fail('plan_or_rights_not_authorized');
 let url:URL;try{url=secureUrl(recalculated.canonicalUrl!);}catch{return fail('unsafe_url');}
 // Robots is an access rule, not copyright permission. Recheck it live for *each* retrieval.
 const transport=args.transport??restrictedHttpsTransport;
 let robots:SourceResponse;
 try{robots=await transport.get(`https://${url.hostname}/robots.txt`,RESEARCH_AGENT,512000);}
 catch{return fail('robots_fetch_failed');}
 if(robots.status!==200||robots.finalUrl!==`https://${url.hostname}/robots.txt`||
   !/^text\/plain(?:\s*;|\s*$)/i.test(robots.contentType))return fail('robots_not_valid');
 const robotRule=robotsDecision(robots.body,url.pathname+url.search);
 if(robotRule!=='allow')return fail(robotRule==='deny'?'robots_disallow':'robots_unknown');
 let page:SourceResponse;
 try{page=await transport.get(url.toString(),RESEARCH_AGENT,1_000_000);}
 catch{return fail('network_or_response_rejected');}
 // Content is exposed only to an optional LOCAL transient parser after rights and robots checks.
 let claims:readonly TransientWebClaim[]=[];
 try {
  if(args.transientClaimExtractor){
   claims=await args.transientClaimExtractor(page.body);
   if(!Array.isArray(claims)||claims.length>50)return fail('invalid_or_oversized_transient_claims');
  }
 }catch{return fail('transient_extractor_rejected_source');}
 const evidence=quarantineRetrievedEvidence({plan,queueItem,candidate,policy,
  retrieved:{finalUrl:page.finalUrl,body:page.body,httpStatus:page.status,contentType:page.contentType},claims});
 if(evidence.status!=='quarantined_human_method_and_rights_review')return fail(evidence.reasons[0]??'quarantine_denied');
 if(args.onQuarantinedDocument){
  // The existing reader's digest is over decoded text, not necessarily original bytes.
  // Strict UTF-8 round trip refuses corrupted/ambiguous response bodies for custody.
  const raw=page.rawBytes;
  if(!(raw instanceof Uint8Array)||raw.byteLength<10||raw.byteLength>1_000_000||
   !Buffer.from(page.body,'utf8').equals(Buffer.from(raw)))return fail('complete_byte_capture_unavailable');
  const temporary=Uint8Array.from(raw);
  try{await args.onQuarantinedDocument({url:url.toString(),completeBytes:temporary,
    contentType:page.contentType,etag:page.etag??null,lastModified:page.lastModified??null});}
  catch{return fail('controlled_capture_callback_failed');}
  finally{temporary.fill(0);}
 }
 return {status:'quarantined',url:url.toString(),robotsChecked:true,evidence,httpStatus:200};
}
