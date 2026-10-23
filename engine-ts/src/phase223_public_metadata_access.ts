/** Phase223: bounded public METADATA discovery access (sitemap/feed only).
 * Public reading is not proof of a licence to archive, commercial-mine or
 * republish a page. Known terms/robots prohibition and refused rights block.
 * This predicate complements, not weakens, Phase75's legacy rights-qualified
 * evidence acquisition paths. Registry records are operational safeguards.
 */
import {RESEARCH_AGENT,robotsDecision,type SourceResponse} from './approved_web_reader.js';
import {safeMetadataUrl75} from './phase75_source_discovery.js';
import type {WebSourcePolicy} from './web_evidence_acquisition.js';
export function publicMetadataDiscoveryGate223(p:WebSourcePolicy|undefined,asOf:string):boolean{
 if(!p||typeof p.sourceId!=='string'||!p.sourceId||
  typeof asOf!=='string'||!Number.isFinite(Date.parse(asOf))||
  !safeMetadataUrl75(`https://${p.host}/`,p.host)||
  p.basis==='refused'||p.websiteTerms==='reviewed_prohibited'||p.robots==='disallowed')return false;
 // No fabricated rights review is required for merely attempting to access
 // public metadata. Older explicit prohibitions always override this mode.
 return true;
}
/** RFC9309 permits access if no robots group matches this crawler, or a
 * robots resource returns 404/410. Transport outages, 401/403 and server
 * errors remain conservatively blocked. No HTTP redirects are followed. */
export function publicRobotsDecision223(response:SourceResponse,url:string):'allow'|'deny'|'unknown'{
 const expected=new URL(url).origin+'/robots.txt';
 if(response.finalUrl!==expected)return 'unknown';
 if(response.status===404||response.status===410)return 'allow';
 if(response.status!==200||!/^text\/plain(?:\s*;|\s*$)/i.test(response.contentType))return 'unknown';
 const body=response.body;
 const path=new URL(url).pathname+new URL(url).search;
 const decision=robotsDecision(body,path);
 if(decision!=='unknown')return decision;
 if(body.length>512000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body))return 'unknown';
 // Only the well-formed 'no applicable group' situation can override legacy
 // conservative unknown. Any actual matching group continues to fail closed.
 const groups=[...body.matchAll(/^\s*user-agent\s*:\s*([^\r\n#]+)(?:#.*)?$/gim)]
  .map(x=>x[1].trim().toLowerCase());
 // No group at all (empty or comment-only file): RFC 9309 places no restriction on any crawler.
 if(!groups.length)return 'allow';
 if(groups.some(x=>x==='*'||(x.length>=2&&RESEARCH_AGENT.toLowerCase().includes(x))))return 'unknown';
 return 'allow';
}
