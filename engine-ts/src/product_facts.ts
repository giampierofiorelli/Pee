/**
 * Product facts (FC, 2026-10-18): what a product can do, with what, in which state, how well, and on which evidence.
 *
 * Owner question (2026-10-18): PEE must tell apart a function (auto mode, a sensor-based control), a component (a PM2.5
 * sensor, a filter), an operating mode or setting (speed 1 of 4, sleep, Eco), a test condition, a metric defined by a
 * method (CADR), a result (a value of a metric under conditions) and an expert observation, and link them by typed,
 * verifiable relations. A function's presence is categorical (available / not available / not verified) and never
 * evidence of effectiveness; speed 1, sleep and lowest are not synonyms without proof.
 *
 * This is a view over the whole-document reading (`readDocumentEvidence`), not a new reader of quantities: results and
 * their conditions come from the quantity knowledge unchanged; observations from the structured qualitative evidence.
 * What it adds:
 * - function and component statements, with presence, product, who states it, and stated links (component serves
 *   function), read with the vocabulary of `resources/quantity-knowledge/functions.v1.json`;
 * - mode statements with their scale (nominal, ordinal with position, numeric setting, programme) and equivalences only
 *   where the document states them, for that product;
 * - statements about how well a function works, with their evidence type, kept apart from its presence;
 * - first-order facts over all of these, evaluated by program `product` (`product-rules.v1.json`) with the KR engine:
 *   presence, not-verified, research leads from components, effectiveness evidence or its absence, same/different
 *   operating state of two results.
 * A qualitative item whose only property word is a function's name, with no statement of how it works, is availability,
 * not an opinion: the view marks it reclassified (the qualitative reading itself is unchanged).
 *
 * Shadow and evaluation only: nothing here reaches the store, advice or ranking.
 */
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {compileRuleSet,evaluate,type CompiledProgram,type Model,type RuleSet} from './knowledge_rules.js';
import {sentences,productMentions,foreignNames,type DocumentEvidence,type Segment,type QualitativeEvidence} from './document_evidence.js';
import {normText,type QuantityKnowledge,type TypedQuantity} from './quantity_knowledge.js';

export const PRODUCT_FACTS_VERSION='fc.3';
interface Cue {what:string;cues?:string[];metricKinds?:string[]}
export interface FunctionDef {id:string;label:string;terms:string[];sensorBased:boolean;effectiveness:Cue[];source:string}
export interface ComponentDef {id:string;label:string;terms:string[];class:string;enables:string[];source:string}
export type ModeScale='nominal'|'ordinal'|'numeric_setting'|'programme';
export interface FunctionPack {schema:string;version:string;statement:string;sources:{id:string}[];classes:{id:string;statement:string}[];functions:FunctionDef[];components:ComponentDef[];
 modes:{valueScale:Record<string,Record<string,{scale:ModeScale;extreme?:'highest'|'lowest'}>>;nominalTerms:[string,string][];ordinalWords:string[];ordinalSeriesWords:string[];programmeWords:string[];
  /** pf.2: the function a mode is the means of (laundry mode realises laundry drying) */
  realises?:Record<string,string>};
 presence:{negators:string[];availableValues:string[];absentValues:string[];observedCues:string[];makerCues:string[];reportedCues:string[];genericCues:string[]};
 performanceCues:{general:string[]}}
export type StatedBy='spec_or_maker'|'reviewer_observed'|'reviewer_mention'|'reported_by_others';
interface Where {segment:string;sentence:{start:number;end:number};
 /** the reading text the statement is in, for locating it (evaluation only; never stored) */
 text:string;table?:{table:number;observation:string}}
export interface FunctionStatement extends Where {id:string;function:string;name:string;presence:'available'|'not_available';sensorBased:boolean|null;statedBy:StatedBy;product:string|null}
export interface ComponentStatement extends Where {id:string;component:string;name:string;presence:'available'|'not_available';product:string|null;enables:{function:string;basis:'stated'|'knowledge'}[]}
export interface ModeStatement extends Where {id:string;mode:string;name:string;scale:ModeScale;position:{rank:number|null;of:number|null;extreme:'highest'|'lowest'|null}|null;product:string|null}
export interface ModeEquivalence extends Where {product:string|null;a:string;b:string;basis:'stated'}
export interface ResultStatement {id:string;quantity:string;product:string|null;metric:string|null;kind:string|null;surface:string;evidenceClass:string;
 conditions:{kind:'operating_mode'|'test_material'|'environment'|'procedure';axis:string;value:string;from:string}[];modes:string[];segment:string|null;table:number|null;text:string}
export interface FunctionPerformance extends Where {id:string;function:string;statement:string|null;product:string|null;what:string[];evidence:'measured'|'observed_in_test'|'experience_in_use'|'opinion'|'manufacturer_claim'|'reported_by_others';
 polarity:'positive'|'negative'|'mixed'|'neutral';qualitative:string|null;quantity:string|null;
 /** fc.2: what the statement is about: the function itself, the component that enables it, or the mode that realises it */
 via:{kind:'function'|'component'|'mode';id:string}}
export interface ProductFacts {schema:'pee.product-facts.v1';version:string;identity:string;reading:string;
 functions:FunctionStatement[];components:ComponentStatement[];modes:ModeStatement[];equivalences:ModeEquivalence[];results:ResultStatement[];functionPerformance:FunctionPerformance[];
 /** qualitative items that only state a function's availability (no statement of how it works): not observations */
 reclassifiedQualitative:{id:string;function:string}[];
 /** qualitative items about how a function works: linked to the function */
 qualitativeAboutFunction:{id:string;function:string}[];
 facts:Record<string,string[][]>;model:Model;derived:{presence:string[][];notVerified:number;mayHave:string[][];effectivenessUnassessed:string[][];effectivenessEvidence:string[][];sameState:string[][];differentState:string[][];sameNamed:number;
  relationUnknown:number;supports:string[][];refutes:string[][];measures:string[][];relevant:number;aspectUnassessed:number};
 rankingInput:false}

const PACK_URL=new URL('../../resources/quantity-knowledge/functions.v1.json',import.meta.url);const RULES_URL=new URL('../../resources/quantity-knowledge/product-rules.v1.json',import.meta.url);
export interface ProductFunctions {pack:FunctionPack;program:CompiledProgram;digest:string}
let cached:ProductFunctions|null=null;
/** Load and validate the function vocabulary and the product program (both optional overrides, for tests). */
export function loadProductFunctions(pack?:FunctionPack,rules?:RuleSet):ProductFunctions{
 if(!pack&&!rules&&cached)return cached;
 const ps=pack?JSON.stringify(pack):readFileSync(PACK_URL,'utf8');const rs=rules?JSON.stringify(rules):readFileSync(RULES_URL,'utf8');const p=JSON.parse(ps) as FunctionPack;
 const fail=(m:string):never=>{throw Error('product_functions_invalid: '+m);};
 const src=new Set(p.sources.map(s=>s.id));const ids=new Set<string>();
 for(const f of p.functions){if(ids.has(f.id))fail('duplicate '+f.id);ids.add(f.id);if(!f.terms.length||!src.has(f.source))fail('function '+f.id);}
 for(const c of p.components){if(ids.has(c.id))fail('duplicate '+c.id);ids.add(c.id);if(!c.terms.length||!src.has(c.source))fail('component '+c.id);for(const e of c.enables)if(!p.functions.some(f=>f.id===e))fail(`component ${c.id} enables unknown ${e}`);}
 const program=compileRuleSet(JSON.parse(rs) as RuleSet).get('product')??fail('no program product');
 const out={pack:p,program,digest:createHash('sha256').update(ps).update('\u0000').update(rs).digest('hex').slice(0,16)};if(!pack&&!rules)cached=out;return out;}

const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** every occurrence of a phrase as whole words (case-insensitive; a hyphen or a space between words both match) */
export function phraseSpans(t:string,w:string):{start:number;end:number}[]{const out:{start:number;end:number}[]=[];
 const re=new RegExp('(?<![\\p{L}\\p{N}])'+esc(w.toLowerCase()).replace(/\\-|\s+/g,'[\\s-]?')+'(?![\\p{L}\\p{N}])','giu');let m;while((m=re.exec(t))){out.push({start:m.index,end:m.index+m[0].length});if(!m[0].length)re.lastIndex++;}return out;}
const spans=phraseSpans;
const has=(t:string,ws:readonly string[])=>ws.some(w=>spans(t,w).length>0);
/** cue words; a single word of four letters or more also matches as a stem ("oscillat" in "oscillating") */
const stem=(t:string,ws:readonly string[])=>ws.filter(w=>w.length>=4&&!w.includes(' ')?new RegExp('(?<![\\p{L}])'+esc(w),'iu').test(t):spans(t,w).length>0);
const NUM_WORD:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
const CLAUSE=/[,;:()]|\s(?:but|while|whereas|although|though|however)\s/gi;
const NOT_A_NAME=/^(?:The|This|That|Its|Each|Every|One|A|An|Any|Our|My|Your|Default|All|Smart|Main|Key|Extra|Other|Special|Additional|Useful|New|Best|In|On|At|With|For|And|Or|But|If|When|Its|It|There|These|Those)$/;

/** The product a span of a unit belongs to: the nearest named before it in the unit, else after it, else the section's,
 * else the page subject. The same attribution order as values (WD). */
function productAt(doc:DocumentEvidence,s:Segment,unitStart:number,unitText:string,at:number,pairMentions?:Segment['products']):string|null{
 const emb=s.products.find(p=>p.start<0);if(emb)return emb.name;
 const own=pairMentions??s.products.filter(p=>p.start>=unitStart&&p.end<=unitStart+unitText.length).map(p=>({...p,start:p.start-unitStart,end:p.end-unitStart}));
 // another product named before the span, not known to the page's inventory ("the 3000i model"), owns it: unattributed
 // ...or a sibling model: a known product's brand followed by another model token ("AirDoctor 3000i" beside "AirDoctor 3000")
 const brands=new Set(doc.products.map(p=>p.name.split(/\s+/)[0]).filter(b=>/^[A-Z]/.test(b)));const sib:{start:number;end:number}[]=[];
 for(const m of unitText.matchAll(/(?<![\p{L}\p{N}])([A-Z][\p{L}-]+)\s+([A-Za-z]*\d[\p{L}\p{N}-]*)/gu))if(brands.has(m[1])&&!own.some(p=>p.start<m.index!+m[0].length&&p.end>m.index!)&&!doc.products.some(p=>p.name.startsWith(m[0])&&p.name.length===m[0].length))sib.push({start:m.index!,end:m.index!+m[0].length});
 const foreign=[...foreignNames(unitText,own),...sib];const lastK=Math.max(-1,...own.filter(p=>p.end<=at).map(p=>p.end)),lastF=Math.max(-1,...foreign.filter(x=>x.end<=at).map(x=>x.end));
 if(lastF>lastK)return null;if(foreign.some(x=>x.start>=at&&x.start-at<=40)&&!own.some(p=>p.start>=at))return null;
 const before=own.filter(p=>p.end<=at);if(before.length)return before[before.length-1].name;const after=own.filter(p=>p.start>=at);if(after.length&&new Set(after.map(p=>p.name)).size===1)return after[0].name;
 for(let i=s.headings.length-1;i>=0;i--){const m=new Set(productMentions(doc.products,s.headings[i]).map(x=>x.name));if(m.size===1)return [...m][0];if(m.size>1)return null;}
 return doc.pageSubject;}

/** The operating-mode id of a printed setting: an ordinal "speed 3" / "level 5", a named mode, or the words themselves. */
export function modeId(fp:FunctionPack,raw:string):{id:string;scale:ModeScale;position:ModeStatement['position']}{
 const t=normText(raw);const ow=[...fp.modes.ordinalWords].sort((a,b)=>b.length-a.length);
 for(const w of ow){const m=new RegExp('(?<![\\p{L}])'+esc(w)+'\\s*(\\d{1,2})\\b','iu').exec(t)??new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+'+esc(w)+'\\b','iu').exec(t);
  if(m){const base=/level/.test(w)?(w.includes('power')?'power level':'level'):/setting/.test(w)?'setting':'speed';return {id:`${base} ${+m[1]}`,scale:'ordinal',position:{rank:+m[1],of:null,extreme:null}};}}
 for(const [term,mid] of fp.modes.nominalTerms)if(spans(t,term).length){const vs=fp.modes.valueScale.fan_setting?.[mid];return {id:mid,scale:vs?.scale??'nominal',position:vs?.extreme?{rank:null,of:null,extreme:vs.extreme}:null};}
 return {id:t,scale:'nominal',position:null};}

/** Read the product facts of a whole-document reading. */
export function readProductFacts(qk:QuantityKnowledge,doc:DocumentEvidence,opts:{functions?:ProductFunctions}={}):ProductFacts{
 const L=opts.functions??loadProductFunctions();const fp=L.pack;const pr=fp.presence;
 const byLen=<T extends {w:string}>(xs:T[])=>[...xs].sort((a,b)=>b.w.length-a.w.length);
 const fnTerms=byLen(fp.functions.flatMap(f=>f.terms.map(w=>({w,f}))));const compTerms=byLen(fp.components.flatMap(c=>c.terms.map(w=>({w,c}))));
 const axisModes:{w:string;axis:string;value:string}[]=[];for(const a of qk.pack.conditionAxes)if(a.operatingCondition&&a.values&&a.id!=='floor_type')for(const [v,ws] of Object.entries(a.values))for(const w of ws)axisModes.push({w,axis:a.id,value:v});
 const functions:FunctionStatement[]=[],components:ComponentStatement[]=[],modes:ModeStatement[]=[],equivalences:ModeEquivalence[]=[],results:ResultStatement[]=[],perf:FunctionPerformance[]=[];
 const reclassified:{id:string;function:string}[]=[],aboutFunction:{id:string;function:string}[]=[];
 const seriesOf=new Map<string,number>();// product -> number of ordinal speeds the document states
 const qeBySent=new Map<string,QualitativeEvidence[]>();for(const e of doc.qualitativeEvidence){const k=`${e.segment}@${e.sentence.start}`;qeBySent.set(k,[...(qeBySent.get(k)??[]),e]);}
 const qBySeg=new Map<string,DocumentEvidence['quantities']>();for(const q of doc.quantities)qBySeg.set(q.segment,[...(qBySeg.get(q.segment)??[]),q]);
 const ev=qk.pack.language.en.evaluation;
 let n=0;const nid=(p:string)=>p+(n++);
 const pending:{kind:'component'|'mode';id:string;cands:string[];product:string|null;whats:string[];qe:QualitativeEvidence|null;quantity:string|null;t:string;lt:string;where:Where}[]=[];
 const negatedAt=(t:string,start:number,end:number)=>{
  // the clause before the term (from the last clause boundary), up to six words, or a negation right after it
  let cs=0;for(const m of t.slice(0,start).matchAll(CLAUSE))cs=m.index!+m[0].length;
  const b=t.slice(cs,start).toLowerCase().replace(/’/g,"'").split(/[^\p{L}'’]+/u).filter(Boolean).slice(-6).join(' ');
  if(/\bnot only\b/.test(b))return false;
  if(pr.negators.some(w=>new RegExp('(?:^|\\s)'+esc(w.toLowerCase().replace(/’/g,"'"))+'(?:\\s|$)').test(b)))return true;
  return /^\s*(?:is|are|was|were)?\s*(?:not|n['’]t)\s+(?:available|included|supported|present|offered)|^\s*(?:is|are)?\s*(?:missing|absent|lacking|unavailable)\b/i.test(t.slice(end,end+40));};
 const statedBy=(t:string,s:Segment):StatedBy=>{const lt=t.toLowerCase();if(has(lt,pr.reportedCues))return 'reported_by_others';if(has(lt,pr.makerCues))return 'spec_or_maker';
  if(has(lt,pr.observedCues)||/\b(?:i|we)\b.{0,30}\b(?:tested|used|tried|set|switched|turned|left|ran|noticed)\b/i.test(t))return 'reviewer_observed';
  if(s.role==='pair'||s.location==='definition_list'||s.headings.some(h=>/\bspec(?:ification)?s?\b|\bfeatures?\b|key details|at a glance/i.test(h)))return 'spec_or_maker';return 'reviewer_mention';};
 for(const s of doc.segments){if(s.region==='boilerplate'||s.duplicateOf||s.role==='embedded_pair'||s.role==='embedded_sentence')continue;
  const units=s.role==='pair'?[{start:0,text:(s.label??'')+': '+s.text,pair:true}]:sentences(s.text).map(u=>({...u,pair:false}));
  let prevFns:FunctionStatement[]=[];
  for(const u of units){const t0=u.text;if(t0.length<3||t0.length>900){prevFns=[];continue;}
   const where:Where={segment:s.id,sentence:{start:u.start,end:u.start+t0.length},text:t0};
   // names are masked: "Philips 800 Series" says nothing about a function; a question or generic advice is no statement about a product
   const nm=u.pair?productMentions(doc.products,t0):s.products.filter(p=>p.start>=u.start&&p.end<=u.start+t0.length).map(p=>({...p,start:p.start-u.start,end:p.end-u.start}));
   let t=t0;for(const x of nm)if(x.start>=0)t=t.slice(0,x.start)+' '.repeat(x.end-x.start)+t.slice(x.end);const lt=t.toLowerCase();
   const at=(x:number)=>productAt(doc,s,u.start,t0,x,u.pair?nm:undefined);
   if(/\?\s*$/.test(t0)||/^\s*jump to\b/i.test(t0)||(has(lt,pr.genericCues)&&!nm.length)){prevFns=[];continue;}
   const claimed:{start:number;end:number}[]=[];const free=(a:{start:number;end:number})=>!claimed.some(c=>a.start<c.end&&a.end>c.start);
   const pairValue=u.pair?normText(s.text):null;const pairAbsent=pairValue!==null&&(pr.absentValues.includes(pairValue)||/^no\b/.test(pairValue));
   const fnHere:FunctionStatement[]=[];
   const instrument=(sp:{start:number})=>/\b(?:our|my|reference|meter|monitor['’]?s?|uses? the|using the|use an?)\b[^,.;]{0,30}$/i.test(t.slice(Math.max(0,sp.start-40),sp.start));
   for(const {w,f} of fnTerms)for(const sp of spans(lt,w)){if(!free(sp))continue;
    if(w==='app'&&/^app\s+store/.test(lt.slice(sp.start,sp.start+12)))continue;
    if(instrument(sp)){claimed.push(sp);continue;}
    claimed.push(sp);if(fnHere.some(x=>x.function===f.id))continue;
    const fs:FunctionStatement={id:nid('f'),function:f.id,name:t0.slice(sp.start,sp.end),presence:pairAbsent||negatedAt(lt,sp.start,sp.end)?'not_available':'available',sensorBased:f.sensorBased,statedBy:statedBy(t0,s),product:at(sp.start),...where};
    functions.push(fs);fnHere.push(fs);}
   // a capitalised name followed by "function" or "feature" names a function the vocabulary does not know ("VarioSpeed Plus function")
   for(const m of t.matchAll(/(?<![\p{L}\p{N}])((?:[A-Z][\p{L}+-]*|\d+)(?:\s+(?:[A-Z][\p{L}+-]*|\+|\d+)){0,3})\s+(function|feature)s?\b/gu)){const sp={start:m.index!,end:m.index!+m[0].length};
    const first=m[1].split(/\s+/)[0];if(!free(sp)||NOT_A_NAME.test(first)&&m[1].split(/\s+/).length===1)continue;const name=NOT_A_NAME.test(first)?m[1].split(/\s+/).slice(1).join(' '):m[1];claimed.push(sp);
    const fid='named:'+normText(name);if(fnHere.some(x=>x.function===fid))continue;
    const fs:FunctionStatement={id:nid('f'),function:fid,name:m[0],presence:negatedAt(lt,sp.start,sp.end)?'not_available':'available',sensorBased:null,statedBy:statedBy(t0,s),product:at(sp.start),...where};functions.push(fs);fnHere.push(fs);}
   // components
   for(const {w,c} of compTerms)for(const sp of spans(lt,w)){if(!free(sp))continue;claimed.push(sp);
    // the tester's instrument ("our PurpleAir sensor", "a reference monitor's sensor") belongs to the procedure, not to the product
    if(instrument(sp))continue;
    if(components.some(x=>x.segment===s.id&&x.sentence.start===u.start&&x.component===c.id))continue;
    const link=/\b(?:informs?|powers?|drives?|feeds?|enables?|allows?|controls?|used for|used by|lets|so|which|that|for)\b/i.test(t);
    const serves=(f:FunctionStatement)=>c.enables.includes(f.function)||(c.class==='sensor'&&f.sensorBased===true);
    const enables=[...fnHere.filter(f=>serves(f)&&link).map(f=>({function:f.function,basis:'stated' as const})),...c.enables.filter(e=>!fnHere.some(f=>f.function===e&&link&&serves(f))).map(e=>({function:e,basis:'knowledge' as const}))];
    components.push({id:nid('c'),component:c.id,name:t0.slice(sp.start,sp.end),presence:pairAbsent||negatedAt(lt,sp.start,sp.end)?'not_available':'available',product:at(sp.start),enables,...where});}
   // modes: ordinal settings, axis values, named modes, capitalised "X mode / programme / setting", programme lists, series
   const modeHere:{m:ModeStatement;sp:{start:number;end:number}}[]=[];
   const addMode=(sp:{start:number;end:number},name:string,scale:ModeScale,mid:string,position:ModeStatement['position'])=>{if(!free(sp))return;claimed.push(sp);
    const ms:ModeStatement={id:nid('m'),mode:mid,name,scale,position,product:at(sp.start),...where};modes.push(ms);modeHere.push({m:ms,sp});};
   for(const w of [...fp.modes.ordinalWords].sort((a,b)=>b.length-a.length))for(const m of lt.matchAll(new RegExp('(?<![\\p{L}])'+esc(w)+'\\s*(\\d{1,2})(?![\\d.,]*\\s*(?:%|db|w\\b|watts|cfm|m\\b|minutes|mins|hours))','giu'))){const mi=modeId(fp,m[0]);addMode({start:m.index!,end:m.index!+m[0].length},t0.slice(m.index!,m.index!+m[0].length),mi.scale,mi.id,mi.position);}
   for(const {w,axis,value} of byLen(axisModes))for(const sp of spans(lt,w)){const vs=fp.modes.valueScale[axis]?.[value];addMode(sp,t0.slice(sp.start,sp.end),vs?.scale??(axis==='programme'?'programme':'nominal'),value,vs?.extreme?{rank:null,of:null,extreme:vs.extreme}:null);}
   for(const [w,mid] of fp.modes.nominalTerms)for(const sp of spans(lt,w))if(/mode/.test(w)||/^(?:turbo|boost)$/.test(w)||/^\s*(?:mode|setting|speed)\b/.test(lt.slice(sp.end,sp.end+10)))addMode(sp,t0.slice(sp.start,sp.end),'nominal',mid,null);
   for(const m of t.matchAll(/(?<![\p{L}\p{N}])((?:[A-Z][\p{L}+-]*|\d+)(?:\s+(?:[A-Z][\p{L}+-]*|\d+)){0,2})\s+(mode|setting|programme|program|cycle|preset)s?\b/gu)){
    const words=m[1].split(/\s+/);const name=NOT_A_NAME.test(words[0])?words.slice(1).join(' '):m[1];if(!name||NOT_A_NAME.test(name))continue;const sp={start:m.index!+m[0].indexOf(name),end:m.index!+m[0].length};
    const scale:ModeScale=/programme|program|cycle|preset/.test(m[2])?'programme':'nominal';const mi=modeId(fp,name+' '+m[2]);addMode(sp,t0.slice(sp.start,sp.end),mi.scale==='ordinal'?'ordinal':scale,mi.scale==='ordinal'||fp.modes.nominalTerms.some(([w])=>w===normText(name+' '+m[2]))?mi.id:normText(name),mi.position);}
   // R1: "in auto mode" names the mode that realises the auto function, as well as the function
   for(const f of fnHere){const mid=Object.entries(fp.modes.realises??{}).find(([,fid])=>fid===f.function)?.[0];if(!mid)continue;const fi=lt.indexOf(f.name.toLowerCase());
    if(fi>=0&&/\b(?:in|on|using|set to|switched to)\s+(?:the\s+|its\s+)?$/i.test(t.slice(Math.max(0,fi-20),fi))){const ms:ModeStatement={id:nid('m'),mode:mid,name:f.name,scale:'nominal',position:null,product:f.product,...where};modes.push(ms);modeHere.push({m:ms,sp:{start:fi,end:fi+f.name.length}});}}
   const listM=/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)?\s*(?:wash\s+|drying\s+|cooking\s+|preset\s+)?(?:programmes|programs|cycles|presets|modes)\s*(?:\(|:|,?\s+(?:such as|including|like|namely)\s+)([^.;)]{3,200})/i.exec(t);
   if(listM){const off=listM.index+listM[0].length-listM[1].length;for(const part of listM[1].split(/,|\band\b|\bor\b|\//)){const nmx=part.trim().replace(/^the\s+/i,'').replace(/\s+(?:available|are|is|on|too|as well|included)$/i,'');if(!nmx||nmx.split(/\s+/).length>3||!/\p{L}/u.test(nmx))continue;
     const p0=t.indexOf(nmx,off);if(p0<0)continue;addMode({start:p0,end:p0+nmx.length},t0.slice(p0,p0+nmx.length),'programme',normText(nmx).replace(/\s+(?:programme|program|cycle|mode)$/,''),null);}}
   const ser=/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:different\s+|adjustable\s+|manual\s+)?(?:fan\s+)?(?:speeds|speed settings|fan settings|power levels|fan levels|levels)\b/i.exec(t);
   if(ser){const k=/\d/.test(ser[1])?+ser[1]:NUM_WORD[ser[1].toLowerCase()];const p=at(ser.index);if(p&&k&&!seriesOf.has(p))seriesOf.set(p,k);}
   // stated equivalence between two adjacent modes: "Sleep mode (speed 1)", "sleep mode, which runs at the lowest speed", "turbo, i.e. speed 4"
   const ms=[...modeHere].sort((a,b)=>a.sp.start-b.sp.start);
   for(let i=0;i+1<ms.length;i++){const a=ms[i],b=ms[i+1];const gap=t.slice(a.sp.end,b.sp.start);
    if(a.m.mode!==b.m.mode&&/^\s*(?:\(\s*|,?\s*(?:which|that)\s+(?:runs|operates|sets the fan|puts the fan|switches the fan|drops the fan)\s+(?:at|to|on|in)\s+(?:the\s+|its\s+)?|,?\s*(?:i\.e\.|aka|also known as|equivalent to|the same as|also called)\s+(?:the\s+|its\s+)?|\s*=\s*|\s+runs\s+(?:at|on)\s+(?:the\s+|its\s+)?)$/i.test(gap))
     equivalences.push({product:a.m.product,a:a.m.mode,b:b.m.mode,basis:'stated',...where});}
   // statements of how well a function works: the function in the statement, and a judgement, an observation or a number about it
   const qes=u.pair?[]:qeBySent.get(`${s.id}@${u.start}`)??[];
   const sq=(qBySeg.get(s.id)??[]).filter(q=>!q.identifierPart&&q.quantity&&(u.pair||q.start>=u.start&&q.end<=u.start+t0.length));
   const anaphor=!fnHere.length&&prevFns.length===1&&/^\s*(?:in testing,?\s*)?(?:this|the|that)\s+(?:setting|function|feature|mode)\b|^\s*it\s+(?:worked|works|kicked|kicks|reacted|reacts|responded|responds)\b/i.test(t)?prevFns:[];
   for(const f of [...fnHere.filter(x=>x.presence==='available'),...anaphor]){const def=fp.functions.find(x=>x.id===f.function);
    // the statement's other words (outside the function's own name) carry the judgement or observation
    // R1: every recognised name (function, component, mode) is blanked: "PM2.5 sensor" says nothing about air quality reached
    let outside=lt;for(const c of claimed)outside=outside.slice(0,c.start)+' '.repeat(c.end-c.start)+outside.slice(c.end);outside=outside.replace(/\bworks? with\b|\bworking with\b/g,' ');
    const whats=(def?.effectiveness??[]).filter(c=>c.cues&&stem(outside,c.cues).length).map(c=>c.what);
    const general=stem(outside,fp.performanceCues.general).length>0;const evalW=ev?[...ev.positive,...ev.negative].filter(w=>spans(outside,w).length).length:0;
    const judgedQe=qes.find(e=>e.statementType!=='observation'||e.property.phenomenon);
    const kindsE=(def?.effectiveness??[]).flatMap(c=>c.metricKinds??[]);const numQ=sq.find(q=>kindsE.includes(q.quantity!.kind.id??'')||whats.length>0);
    // R1: a measured value's kind names the aspect it measures (power and energy: the energy of auto mode)
    if(numQ)for(const c of def?.effectiveness??[])if((c.metricKinds??[]).includes(numQ.quantity!.kind.id??'')&&!whats.includes(c.what))whats.push(c.what);
    if(!whats.length&&!general&&!evalW&&!judgedQe&&!numQ)continue;
    const posN=ev?ev.positive.filter(w=>spans(outside,w).length).length:0,negN=ev?ev.negative.filter(w=>spans(outside,w).length).length:0;
    const pol:FunctionPerformance['polarity']=judgedQe?.polarity??(posN&&negN?'mixed':posN?'positive':negN?'negative':'neutral');
    const evidence:FunctionPerformance['evidence']=numQ?'measured':judgedQe?(judgedQe.evidenceType==='inference'?'opinion':judgedQe.evidenceType):has(lt,pr.observedCues)||/\bin testing\b/i.test(t)?'observed_in_test':has(lt,pr.makerCues)?'manufacturer_claim':'opinion';
    perf.push({id:nid('p'),function:f.function,statement:anaphor.includes(f)?null:f.id,product:f.product,what:whats.length?whats:['general'],evidence,polarity:pol,qualitative:judgedQe?.id??null,quantity:numQ?.id??null,via:{kind:'function',id:f.function},...where});}
   // fc.2: how the component that enables a function, or the mode that realises it, behaves ("the sensor is very responsive",
   // "laundry mode dried a load in four hours") is a statement about that function; the function is resolved at the end
   const judged=(outside:string)=>stem(outside,fp.performanceCues.general).length>0||(ev?[...ev.positive,...ev.negative].some(w=>spans(outside,w).length>0):false)||qes.some(e=>e.statementType!=='observation'||e.property.phenomenon);
   for(const c of components.filter(x=>x.segment===s.id&&x.sentence.start===u.start&&x.presence==='available')){const def=fp.components.find(x=>x.id===c.component)!;
    // fc.3 (R1): only the functions the component can enable; a sensor the document does not specify is tied to none
    const cands=fp.functions.filter(f=>def.enables.includes(f.id));if(!cands.length||perf.some(p=>p.segment===s.id&&p.sentence.start===u.start))continue;
    const ci=lt.indexOf(c.name.toLowerCase());const outside=ci<0?lt:lt.slice(0,ci)+' '+lt.slice(ci+c.name.length);const whats=[...new Set(cands.flatMap(f=>f.effectiveness.filter(x=>x.cues&&stem(outside,x.cues).length).map(x=>x.what)))];
    if(!whats.length&&!judged(outside))continue;const q0=qes.find(e=>e.statementType!=='observation'||e.property.phenomenon);
    pending.push({kind:'component',id:c.component,cands:cands.map(f=>f.id),product:c.product,whats,qe:q0??null,quantity:sq[0]?.id??null,t,lt,where});}
   for(const {m} of modeHere){const F0=fp.modes.realises?.[m.mode];if(!F0||m.mode==='auto'||fnHere.some(f=>f.function===F0))continue;
    // the mode states the function's presence with it ("no dedicated laundry mode": no laundry drying)
    const mi=lt.indexOf(m.name.toLowerCase());const fs:FunctionStatement={id:nid('f'),function:F0,name:m.name,presence:mi>=0&&negatedAt(lt,mi,mi+m.name.length)?'not_available':'available',sensorBased:fp.functions.find(x=>x.id===F0)?.sensorBased??null,statedBy:statedBy(t0,s),product:m.product,...where};functions.push(fs);fnHere.push(fs);
    const outside=mi<0?lt:lt.slice(0,mi)+' '+lt.slice(mi+m.name.length);const def=fp.functions.find(x=>x.id===F0);const whats=(def?.effectiveness??[]).filter(x=>x.cues&&stem(outside,x.cues).length).map(x=>x.what);
    if(fs.presence==='available'&&(whats.length||judged(outside)||sq.length)){const q0=qes.find(e=>e.statementType!=='observation'||e.property.phenomenon);pending.push({kind:'mode',id:m.mode,cands:[F0],product:m.product,whats,qe:q0??null,quantity:sq[0]?.id??null,t,lt,where});}}
   // qualitative items whose only property word is a function's name, with no statement of how it works: availability, not an opinion
   for(const e of qes){const aspect=qk.pack.aspects?.find(a=>a.id===e.property.aspect);if(!aspect)continue;
    const termSpans=aspect.terms.flatMap(w=>spans(lt,w));if(!termSpans.length||!termSpans.every(sp=>claimed.some(c=>sp.start>=c.start&&sp.end<=c.end)))continue;
    const fn=fnHere.find(f=>termSpans.some(sp=>{const fi=lt.indexOf(f.name.toLowerCase());return fi>=0&&sp.start>=fi&&sp.end<=fi+f.name.length;}));if(!fn)continue;
    if(perf.some(p=>p.qualitative===e.id||(p.segment===s.id&&p.sentence.start===u.start&&p.function===fn.function)))aboutFunction.push({id:e.id,function:fn.function});
    else if(!e.property.phenomenon)reclassified.push({id:e.id,function:fn.function});}
   prevFns=fnHere.filter(x=>x.presence==='available');}}
 for(const x of pending){const have=x.kind==='mode'?x.cands:x.cands.filter(f=>functions.some(s=>s.function===f&&s.presence==='available'&&s.product===x.product));if(have.length!==1)continue;
  const ev2:FunctionPerformance['evidence']=x.quantity?'measured':x.qe?(x.qe.evidenceType==='inference'?'opinion':x.qe.evidenceType):has(x.lt,pr.observedCues)||/\bin testing\b/i.test(x.t)?'observed_in_test':'opinion';
  perf.push({id:nid('p'),function:have[0],statement:null,product:x.product,what:x.whats.length?x.whats:['general'],evidence:ev2,polarity:x.qe?.polarity??'neutral',qualitative:x.qe?.id??null,quantity:x.quantity,via:{kind:x.kind,id:x.id},...x.where});}
 // tables: a property label naming a function or component with a yes/no or text value; a features cell listing functions
 for(const tb of doc.tables.tables)for(const o of tb.observations){if(o.kind!=='boolean'&&o.kind!=='text')continue;const label=o.property.join(' ').toLowerCase();const val=normText(o.text??o.surface);
  const absent=pr.absentValues.includes(val)||/^no\b/.test(val);const text=o.property.join(' ')+' '+o.surface;const w0:Where={segment:'table',sentence:{start:0,end:0},text,table:{table:tb.table,observation:o.id}};
  for(const {w,f} of fnTerms)if(spans(label,w).length){if(!functions.some(x=>x.table?.observation===o.id&&x.function===f.id))functions.push({id:nid('f'),function:f.id,name:w,presence:absent?'not_available':'available',sensorBased:f.sensorBased,statedBy:'spec_or_maker',product:o.product,...w0});break;}
  if(/feature|function|smart|control|connectivity|mode|sensor/.test(label)&&!absent)for(const {w,f} of fnTerms)if(spans(val,w).length&&!functions.some(x=>x.table?.observation===o.id&&x.function===f.id))functions.push({id:nid('f'),function:f.id,name:w,presence:'available',sensorBased:f.sensorBased,statedBy:'spec_or_maker',product:o.product,...w0});
  for(const {w,c} of compTerms)if((spans(label,w).length||spans(val,w).length)&&!components.some(x=>x.table?.observation===o.id&&x.component===c.id))components.push({id:nid('c'),component:c.id,name:w,presence:absent&&spans(label,w).length?'not_available':'available',product:o.product,enables:c.enables.map(e=>({function:e,basis:'knowledge' as const})),...w0});
  if(/\b(?:modes?|speeds?|settings?|programmes?|programs?)\b/.test(label)&&!absent)for(const part of (o.text??o.surface).split(/,|\/|\band\b|;/)){const p2=part.trim();if(!p2||p2.length>30||!/\p{L}|\d/u.test(p2)||pr.availableValues.includes(normText(p2))||pr.absentValues.includes(normText(p2)))continue;const mi=modeId(fp,p2);modes.push({id:nid('m'),mode:mi.id,name:p2,scale:/programme|program/.test(label)?'programme':mi.scale,position:mi.position,product:o.product,...w0});}}
 // results: typed values with their conditions by kind; an operating mode named in a value's own clause is its condition when the knowledge attached none
 const kindOfAxis=(a:string):ResultStatement['conditions'][number]['kind']=>a==='floor_type'||a==='challenge_pollutant'?'test_material':a==='method'||a==='measurement_distance'||a==='drive_level'?'procedure':qk.pack.conditionAxes.find(x=>x.id===a)?.operatingCondition?'operating_mode':'environment';
 const toResult=(rid:string,q:TypedQuantity,product:string|null,evidenceClass:string,segment:string|null,table:number|null,text:string):ResultStatement=>{
  const conditions=q.conditions.map(c=>({kind:kindOfAxis(c.axis),axis:c.axis,value:c.value,from:c.from as string}));
  const mds=conditions.filter(c=>c.kind==='operating_mode').map(c=>fp.modes.valueScale[c.axis]?.[c.value]||qk.pack.conditionAxes.find(x=>x.id===c.axis)?.values?.[c.value]?c.value:modeId(fp,c.value).id);
  return {id:rid,quantity:rid,product,metric:q.metric.id,kind:q.kind.id,surface:q.surface,evidenceClass,conditions,modes:[...new Set(mds)],segment,table,text};};
 const segById=new Map(doc.segments.map(s=>[s.id,s]));
 for(const q of doc.quantities){if(q.identifierPart||!q.quantity||q.recordRole==='condition'||(!q.quantity.kind.id&&!q.quantity.kind.candidates.length))continue;const s=segById.get(q.segment)!;if(s.region==='boilerplate'||s.duplicateOf)continue;
  const r=toResult(q.id,q.quantity,q.product,q.evidenceClass,q.segment,null,s.role==='pair'?(s.label??'')+': '+s.text:s.text);
  if(!r.modes.length){let cs=0,ce=s.text.length;
   for(const m of s.text.slice(0,q.start).matchAll(/[;.](?:\s|$)|\s(?:but|while|whereas)\s/g))cs=m.index!+m[0].length;const e=/[;.](?:\s|$)|\s(?:but|while|whereas)\s/.exec(s.text.slice(q.end));if(e)ce=q.end+e.index;
   const inClause=modes.filter(m=>m.segment===s.id&&m.table===undefined).filter(m=>{const p0=s.text.indexOf(m.name,m.sentence.start);return p0>=cs&&p0+m.name.length<=ce&&Math.abs(p0-q.start)<=80;});
   if(inClause.length&&new Set(inClause.map(m=>m.mode)).size===1){r.modes=[inClause[0].mode];r.conditions.push({kind:'operating_mode',axis:'mode',value:inClause[0].mode,from:'clause'});}}
  results.push(r);}
 for(const tb of doc.tables.tables)for(const o of tb.observations){if(!o.quantity||o.recordRole==='condition'||(!o.quantity.kind.id&&!o.quantity.kind.candidates.length))continue;
  const r=toResult(o.id,o.quantity,o.product,o.evidence.class,null,tb.table,o.property.join(' ')+' '+o.surface);
  if(!r.modes.length)for(const lab of o.property){const mi=modeId(fp,lab);if(mi.scale==='ordinal'||fp.modes.nominalTerms.some(([w])=>spans(lab.toLowerCase(),w).length)){r.modes=[mi.id];r.conditions.push({kind:'operating_mode',axis:'mode',value:mi.id,from:'label'});break;}}
  results.push(r);}
 for(const m of modes)if(m.scale==='ordinal'&&m.position&&m.position.rank!==null&&m.product&&seriesOf.has(m.product))m.position.of=seriesOf.get(m.product)!;
 // ---- first-order facts and the product program
 const F:Record<string,string[][]>={performance_what:[],performance_polarity:[],result_kind:[],effectiveness_kind:[],function_what:[],mode_rank:[],mode_extreme:[],stated_different:[],performs_via:[],mode_realises:[],product:[],function:[],states_function:[],stated_by:[],has_component:[],component_enables:[],stated_enables:[],offers_mode:[],mode_scale:[],stated_equivalent:[],function_mode:[],result:[],result_mode:[],performs:[],performance_evidence:[]};
 const P=(x:string|null)=>x??'unattributed';const prods=new Set<string>();
 for(const f of fp.functions)F.function.push([f.id]);for(const c of fp.components)for(const e of c.enables)F.component_enables.push([c.id,e]);
 F.function_mode.push(['auto_mode','auto'],['auto_mode','auto mode'],['auto_mode','automatic']);
 for(const f of functions){prods.add(P(f.product));F.states_function.push([f.id,P(f.product),f.function,f.presence]);F.stated_by.push([f.id,f.statedBy]);}
 for(const c of components){if(c.presence!=='available')continue;prods.add(P(c.product));F.has_component.push([c.id,P(c.product),c.component]);for(const e of c.enables)if(e.basis==='stated')F.stated_enables.push([P(c.product),c.component,e.function]);}
 for(const m of modes){prods.add(P(m.product));F.offers_mode.push([P(m.product),m.mode]);F.mode_scale.push([m.mode,m.scale]);}
 for(const e of equivalences)F.stated_equivalent.push([P(e.product),e.a,e.b]);
 for(const r of results){prods.add(P(r.product));F.result.push([r.id,P(r.product),r.metric??r.kind??'quantity']);for(const m of r.modes)F.result_mode.push([r.id,m]);}
 for(const p of perf){if(p.via.kind==='function')F.performs.push([p.id,P(p.product),p.function]);else F.performs_via.push([p.id,P(p.product),p.via.kind,p.via.id]);F.performance_evidence.push([p.id,p.evidence]);}
 for(const [m,f] of Object.entries(fp.modes.realises??{}))F.mode_realises.push([m,f]);
 for(const p of perf){for(const w of p.what)F.performance_what.push([p.id,w]);F.performance_polarity.push([p.id,p.polarity]);}
 for(const f of fp.functions)for(const c of f.effectiveness){F.function_what.push([f.id,c.what]);for(const k of c.metricKinds??[])F.effectiveness_kind.push([f.id,c.what,k]);}
 for(const r of results){const k=r.kind??(r.metric?qk.metrics.get(r.metric)?.kind:null);if(k)F.result_kind.push([r.id,k]);}
 // mode ranks and extremes, from the mode ids (ordinal 'speed 3') and the knowledge's scales (top, lowest)
 const allModes=new Set([...modes.map(m=>m.mode),...results.flatMap(r=>r.modes)]);
 for(const m of allModes){const rk=/^(speed|level|setting|power level) (\d+)$/.exec(m);if(rk)F.mode_rank.push([m,rk[1],rk[2]]);const ex=fp.modes.valueScale.fan_setting?.[m]?.extreme;if(ex)F.mode_extreme.push([m,ex]);}
 for(const p of prods)if(p!=='unattributed')F.product.push([p]);
 for(const k of Object.keys(F))F[k]=[...new Map(F[k].map(r=>[r.join('\u0001'),r])).values()];
 const model=evaluate(L.program,F,{record:'document '+doc.readingIdentity});
 const A=(p:string)=>model.all(p).map(f=>f.args);
 return {schema:'pee.product-facts.v1',version:PRODUCT_FACTS_VERSION,identity:`${PRODUCT_FACTS_VERSION}+pf:${L.digest}+${doc.readingIdentity}`,reading:doc.readingIdentity,
  functions,components,modes,equivalences,results,functionPerformance:perf,reclassifiedQualitative:reclassified,qualitativeAboutFunction:aboutFunction,facts:F,model,
  derived:{presence:A('presence'),notVerified:A('presence_not_verified').length,mayHave:A('may_support'),effectivenessUnassessed:A('effectiveness_unassessed'),effectivenessEvidence:A('effectiveness_evidence'),
   sameState:A('same_state_results'),differentState:A('different_state_results'),sameNamed:A('same_named_setting').length,
   relationUnknown:A('state_relation_unknown').length,supports:A('supports'),refutes:A('refutes'),measures:A('measures_aspect'),relevant:A('evidence_relation').length,aspectUnassessed:A('aspect_unassessed').length},rankingInput:false};}

/** A buyer's function needs over a reading's facts: presence met, not verified, or present with effectiveness unassessed. */
export function functionNeeds(pf:ProductFacts,needs:readonly {need:string;function:string}[],functions?:ProductFunctions):{met:string[][];unverified:string[][];effectivenessUnassessed:string[][]}{
 const L=functions??loadProductFunctions();const m=evaluate(L.program,{...pf.facts,need_function:needs.map(x=>[x.need,x.function])});
 const A=(p:string)=>m.all(p).map(f=>f.args);return {met:A('need_met_by_presence'),unverified:A('need_presence_unverified'),effectivenessUnassessed:A('need_effectiveness_unassessed')};}
