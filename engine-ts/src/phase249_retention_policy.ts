/** Phase249 — proportionate source-class retention policy for factual observations.
 *
 * What it permits: keeping, in the PRIVATE operational store, individual factual declarations observed on a
 * product page (a weight, a power rating, a price, a dimension, a short technical term) with their provenance
 * (URL, byte hash, time, extractor version). It never keeps page bodies, prose, descriptions, reviews, images
 * or other expression, and it never publishes the retained values (public exports still require a per-source
 * policy granting derived publication).
 *
 * Why this is proportionate (see docs/phase249/RETENTION-POLICY.md for sources and open questions):
 *  - Copyright protects expression, not facts; a short value such as "1750 W" is not a literary work. Page bytes
 *    are processed transiently (CDPA s28A) and not stored.
 *  - Database right (Copyright and Rights in Databases Regulations 1997, regs 13/16) protects substantial
 *    extraction from databases built with substantial investment in obtaining, verifying or presenting
 *    contents, including repeated and systematic extraction of insubstantial parts (reg 16(2)). The policy
 *    therefore caps, per host, how many products' facts are kept, so PEE samples a source and never mirrors a
 *    catalogue; reg 19 entitles lawful users of a published database to insubstantial parts.
 *  - Access conditions are honoured: robots refusals and 403/429 stop fetching (enforced upstream); a site whose
 *    terms were reviewed as prohibiting the use, a machine-readable TDM reservation, or a Content-Signal
 *    "ai-input=no" switches the source to metadata only.
 *  - Independent test publishers invest in obtaining measurements: only numeric measurements of a small number of
 *    products are kept, with citation; their verdicts, scores' wording and articles are never kept.
 * What remains restricted: anything a per-source review found prohibited; text values from test publishers;
 * public redistribution of retained values; values beyond the per-host cap.
 */
import type {Value245} from './phase245_value_normalizer.js';
import {existsSync} from 'node:fs';import {homedir as homedirOf} from 'node:os';

export type SourceClass249='manufacturer'|'retailer'|'independent_original_test'|'editorial'|'community'|
 'promotional_announcement'|'reference_encyclopedia'|'unknown';
export interface ClassRule249 {retain:boolean;maxProductsPerHost:number;valueKinds:readonly Value245['kind'][]}
export interface SourceClassPolicy249 {
 policyId:string;
 /** Owner authorisation as recorded (no reviewer or legal sign-off is implied). */
 authorisation:string;
 classes:Record<SourceClass249,ClassRule249>;
 honour:{contentSignalAiInputNo:boolean;tdmReservation:boolean;noaiMeta:boolean};
 publicExport:false;
}
const FACT_KINDS:readonly Value245['kind'][]=['quantity','range','price','dimensions','options','number','text','boolean'];
const MEASUREMENT_KINDS:readonly Value245['kind'][]=['quantity','range','dimensions','number'];
export const FACTUAL_CLASS_POLICY249:SourceClassPolicy249={
 policyId:'pee249-factual-observations-v1',
 authorisation:'owner instruction 2026-10-14: proportionate source-class policy for factual knowledge accumulation; no blanket permission to copy restricted material; no legal review performed',
 classes:{
  manufacturer:{retain:true,maxProductsPerHost:300,valueKinds:FACT_KINDS},
  retailer:{retain:true,maxProductsPerHost:50,valueKinds:FACT_KINDS},
  reference_encyclopedia:{retain:true,maxProductsPerHost:50,valueKinds:FACT_KINDS},
  editorial:{retain:true,maxProductsPerHost:30,valueKinds:FACT_KINDS},
  community:{retain:true,maxProductsPerHost:30,valueKinds:FACT_KINDS},
  promotional_announcement:{retain:true,maxProductsPerHost:30,valueKinds:FACT_KINDS},
  unknown:{retain:true,maxProductsPerHost:30,valueKinds:FACT_KINDS},
  independent_original_test:{retain:true,maxProductsPerHost:25,valueKinds:MEASUREMENT_KINDS},
 },
 honour:{contentSignalAiInputNo:true,tdmReservation:true,noaiMeta:true},
 publicExport:false,
};
/** Phase270 amendment (owner brief 2026-10-17 §7): structured, attributable QUALITATIVE outcome codes from a tester's
 * own cooking tests may be kept where the source's rights permit, i.e. where v1 itself keeps the source's measurements
 * (same classes, same per-host product cap, same reservations honoured). Codes only, from PEE's own vocabulary: dish,
 * outcome, direction, hedging, whether the setting was changed, comparison, appliance, identity state and the hash of
 * the source block. No sentence, adjective or passage; no conversion into a number; never ranking input. */
export const QUALITATIVE_AMENDMENT270={policyId:'pee249-factual-observations-v2-qualitative-codes',amends:'pee249-factual-observations-v1',
 authorisation:'owner brief 2026-10-17 section 7: controlled retention amendment for structured attributable qualitative outcome codes where source rights permit; codes remain rankingInput false; no legal review performed',
 sourceClasses:['independent_original_test'] as readonly SourceClass249[],codesOnly:true as const,rankingInput:false as const} as const;
export interface Reservations249 {
 /** "yes" | "no" | null (not declared) from a robots.txt Content-Signal line. */
 contentSignalAiInput:'yes'|'no'|null;
 /** TDM Reservation Protocol: <meta name="tdm-reservation" content="1"> or a tdm-reservation header. */
 tdmReservation:boolean;
 /** <meta name="robots" content="noai"> (non-standard but explicit). */
 noaiMeta:boolean;
 checked:{robots:boolean;page:boolean};
}
/** Machine-readable reservations from the robots.txt body (if fetched) and the page HTML. */
export function detectReservations249(robotsBody:string|null,html:string|null):Reservations249{
 let ai:'yes'|'no'|null=null;
 if(robotsBody){
  // Content-Signal lines apply to the user-agent group they sit in; the policy honours the strictest value found
  // in the "*" group or before any group, which is where publishers declare site-wide signals.
  let group:string[]=['*'];let inGroupHeader=false;
  for(const raw of robotsBody.split(/\r?\n/)){
   const line=raw.replace(/#.*$/,'').trim();if(!line)continue;
   const m=/^([a-z-]+)\s*:\s*(.*)$/i.exec(line);if(!m)continue;const k=m[1].toLowerCase(),v=m[2].trim();
   if(k==='user-agent'){group=inGroupHeader?[...group,v.toLowerCase()]:[v.toLowerCase()];inGroupHeader=true;continue;}
   inGroupHeader=false;
   if(k==='content-signal'&&group.includes('*')){const s=/ai-input\s*=\s*(yes|no)/i.exec(v);if(s){const val=s[1].toLowerCase() as 'yes'|'no';ai=ai==='no'?'no':val;}}
  }
 }
 const meta=(name:string)=>html?[...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]).filter(t=>new RegExp(`name\\s*=\\s*["']${name}["']`,'i').test(t))
  .map(t=>/content\s*=\s*["']([^"']*)["']/i.exec(t)?.[1]??''):[];
 const tdm=meta('tdm-reservation').some(v=>v.trim()==='1');
 const noai=meta('robots').some(v=>/\bnoai\b/i.test(v));
 return {contentSignalAiInput:ai,tdmReservation:tdm,noaiMeta:noai,checked:{robots:robotsBody!==null,page:html!==null}};
}
export type ClassDecision249={retain:true;rule:ClassRule249}|{retain:false;reason:'class_not_retained'|'machine_readable_reservation'|'insubstantial_part_cap_reached'};
/** Decision for one observation of a product from one host. `hostProducts` is the number of distinct products whose
 * facts are already retained from this host under the class policy; `productAlreadyCounted` says whether this
 * product is one of them (re-observing a counted product never trips the cap). */
export function classDecision249(policy:SourceClassPolicy249,sourceClass:SourceClass249,r:Reservations249|undefined,
 hostProducts:number,productAlreadyCounted:boolean):ClassDecision249{
 const rule=policy.classes[sourceClass]??policy.classes.unknown;
 if(!rule.retain)return {retain:false,reason:'class_not_retained'};
 if(r&&((policy.honour.contentSignalAiInputNo&&r.contentSignalAiInput==='no')||(policy.honour.tdmReservation&&r.tdmReservation)||(policy.honour.noaiMeta&&r.noaiMeta)))
  return {retain:false,reason:'machine_readable_reservation'};
 if(!productAlreadyCounted&&hostProducts>=rule.maxProductsPerHost)return {retain:false,reason:'insubstantial_part_cap_reached'};
 return {retain:true,rule};
}

/** Location for confidential evaluation material (raw pages, adjudication inputs with third-party values):
 * $PEE_PRIVATE_EVAL_DIR, else ~/.local/share/product-evidence-engine/private-eval. Never inside a Git working tree;
 * only metrics, manifests (URL + SHA-256) and reproducibility instructions are published. */
export function privateEvaluationDir249(env:Record<string,string|undefined>=process.env,home=homedirOf()):string{
 const d=env.PEE_PRIVATE_EVAL_DIR??`${home}/.local/share/product-evidence-engine/private-eval`;
 let x=d.replace(/\/+$/,'');
 for(let i=0;i<64&&x;i++){if(existsSync(`${x}/.git`))throw Error('249_private_eval_dir_inside_git_worktree');const up=x.replace(/\/[^/]*$/,'');if(up===x)break;x=up;}
 return d;
}
