/**
 * R3 (owner S73, 2026-10-19): PEE's own reading of a scientific teaching document into typed, checkable statements.
 *
 * Why this module. Until R3 every piece of teaching was translated by Claude into TypeScript constants
 * (`phase269_research_teaching.ts` and successors) and then into the store; PEE itself read nothing of the owner's
 * documents. The R3 brief asks for a mechanism inside PEE that acquires knowledge from a document with provenance, scope,
 * uncertainty and reversible validation. No existing module reads such documents: the readers (WD, 1G) read product
 * pages for values, not teaching for statements.
 *
 * Method (engineering references, not libraries):
 * - Rosetta Statements: a small closed set of statement types (`translation-cues.v1.json`), each with slots and a display
 *   template, so every statement renders back into a sentence that can be checked against the quoted original.
 * - CommonKADS: statements are domain knowledge; the inferences that use them stay in the KR programs (`knowledge_link`).
 * - NeOn: slots are typed with the existing vocabularies (quantity knowledge kinds, metrics, units, condition axes, and the
 *   category's taught concepts), never with a new ontology; what they cannot type is kept as untyped words.
 * - ORKG: methods, conditions and findings are separate slots; the document's own status label and references are kept.
 *
 * What it does not do. It does not write to the store, does not decide that a statement is true, and has no category
 * words: the cues are general English relation phrases, table header roles and status markers. Shadow only.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {findQuantities,namedPhrases,normText,parseUnit,hasPhrase,type QuantityKnowledge} from './quantity_knowledge.js';
import type {TaughtConcept} from './knowledge_link.js';

/** kt-cues.2 (R3 fidelity review): the split word is rendered; kt-cues.1 is kept for reproducing the held-out first run. */
export const TRANSLATION_CUES_FILE='translation-cues.v4.json';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

interface StatementTypeDef {type:string;meaning:string;display:string;patterns:string[];
 /** the subject may be absent (an instruction: "Do not ..."); it is then left out, not shown as unspecified */
 optionalSubject?:boolean}
export interface TranslationCues {schema:string;version:string;statementTypes:StatementTypeDef[];conditionCues:string[];contrastCues:string[];listSeparators:string[];
 tableHeaderRoles:Record<string,string[]>;statusMarkers:{status:string;cues:string[]}[];referencePattern:string}
let cachedCues:{cues:TranslationCues;digest:string;compiled:{def:StatementTypeDef;res:RegExp[]}[]}|null=null;
export function loadTranslationCues(c?:TranslationCues){
 if(!c&&cachedCues)return cachedCues;
 const src=c?JSON.stringify(c):readFileSync(new URL('../../resources/knowledge-translation/'+TRANSLATION_CUES_FILE,import.meta.url),'utf8');
 const cues=c??JSON.parse(src) as TranslationCues;
 const out={cues,digest:sha(src),compiled:cues.statementTypes.map(def=>({def,res:def.patterns.map(p=>new RegExp(p,'id'))}))};if(!c)cachedCues=out;return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. The document's blocks (markdown): paragraphs, bullets, numbered items, table rows with their header labels.
export interface DocBlock {kind:'paragraph'|'bullet'|'numbered'|'table_row';line:number;headings:string[];text:string;cells?:{header:string;text:string}[]}
const clean=(s:string)=>s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g,'$1').replace(/[*_`]+/g,'').replace(/\s+/g,' ').trim();
export function parseTeachingDocument(md:string,range?:readonly {start:number;end:number}[]):DocBlock[]{
 const lines=md.split('\n');const blocks:DocBlock[]=[];const heads:string[]=[];let header:string[]|null=null;let para:{line:number;text:string}|null=null;
 const inRange=(i:number)=>!range||range.some(r=>i+1>=r.start&&i+1<=r.end);
 const flush=()=>{if(para&&para.text.trim())blocks.push({kind:'paragraph',line:para.line,headings:[...heads],text:clean(para.text)});para=null;};
 // audit S78: a fenced code block (YAML headers, data examples) is not prose knowledge
 let fence=false;
 lines.forEach((raw,i)=>{const l=raw.trimEnd();
  if(/^\s*(?:```|~~~)/.test(l)){flush();header=null;fence=!fence;return;}if(fence)return;
  const h=/^(#{1,6})\s+(.*)$/.exec(l);if(h){flush();header=null;heads.length=Math.min(heads.length,h[1].length-1);heads[h[1].length-1]=clean(h[2]);heads.length=h[1].length;for(let k=0;k<heads.length;k++)heads[k]??='';return;}
  if(!inRange(i)){flush();header=null;return;}
  if(/^\s*\|/.test(l)){flush();const cells=l.trim().replace(/^\||\|$/g,'').replace(/\\\|/g,'\u0000').split('|').map(c=>clean(c.replace(/\u0000/g,'|')));
   if(cells.every(c=>/^:?-{2,}:?$/.test(c)))return;
   if(!header){header=cells;return;}
   blocks.push({kind:'table_row',line:i+1,headings:[...heads],text:cells.join(' | '),cells:cells.map((t,j)=>({header:header![j]??'',text:t}))});return;}
  header=null;
  const b=/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/.exec(l);if(b){flush();blocks.push({kind:b[1]?'numbered':'bullet',line:i+1,headings:[...heads],text:clean(b[2])});return;}
  if(!l.trim()||/^---+$/.test(l.trim())){flush();return;}
  if(para)para.text+=' '+l;else para={line:i+1,text:l};});
 flush();return blocks;
}

/** Clauses of a block's text: sentences (not at decimals or abbreviations), then "; " and ", but" splits. */
export function clauses(text:string):string[]{
 const out:string[]=[];
 // abbreviations do not end a sentence (audit S77 A3-9): protected before splitting, restored after
 const ABBR=/\b(e\.g|i\.e|cf|vs|approx|fig|figs|no|nos|eq|ref|refs|sec|ch|vol|et al|etc)\.(?=\s)/gi;
 const prot=text.replace(ABBR,m=>m.replace(/\./g,'\u2024'));
 for(const s of prot.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/))for(const c of s.split(/;\s+|,\s+but\s+|\s+—\s+|\s+–\s+/))
  {const t=c.replace(/^[\s:,(]+|[\s.:;,)]+$/g,'').replace(/\u2024/g,'.').trim();if(t.length>=8)out.push(t);}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Typed spans: what the existing vocabularies recognise in a slot, and what they do not.
export interface TypedSpan {text:string;metrics:string[];kinds:string[];axes:{axis:string;value:string}[];concepts:string[];units:string[];untyped:string[]}
const STOP=new Set('a an the of to in on at by for with and or as is are be been was were it its this that these those than then from into over under not no can may might must should would could will per each every any all such other more less most least only also very about within between without whose which who what when where how why there their them they use used using one two three'.split(' '));
export function typeSpan(qk:QuantityKnowledge,text:string,concepts:readonly TaughtConcept[]=[]):TypedSpan{
 const metrics:string[]=[],kinds:string[]=[],axes:{axis:string;value:string}[]=[],cs:string[]=[],units:string[]=[];const typed=new Set<string>();
 const mark=(hit:Set<string>)=>{for(const h of hit)for(const w of h.split(' '))typed.add(w);};
 for(const m of qk.metrics.values()){const h=namedPhrases(text,m.terms);if(h.size){metrics.push(m.id);mark(h);}}
 for(const k of qk.kinds.values()){const h=namedPhrases(text,k.terms);if(h.size){kinds.push(k.id);mark(h);}}
 for(const a of qk.axes.values())for(const [v,terms] of Object.entries(a.values??{})){const h=namedPhrases(text,terms);if(h.size){axes.push({axis:a.id,value:v});mark(h);}}
 for(const f of findQuantities(qk,text)){units.push(f.unit.expression);for(const w of normText(f.surface).split(' '))typed.add(w);}
 for(const tok of normText(text).split(/\s+/)){if(tok.length<2||STOP.has(tok))continue;const u=parseUnit(qk,tok);if(u&&u.atoms.length&&u.kinds.length===1){units.push(u.expression);typed.add(tok);}}
 for(const c of concepts){const words=c.id.split('_').filter(w=>w.length>2&&!STOP.has(w));
  const phrases=[c.id.replace(/_/g,' '),...(c.aliases??[])];const h=namedPhrases(text,phrases);
  const tw=new Set(normText(text).split(/[^\p{L}\p{N}]+/u).map(stem));
  if(h.size||(words.length>=2&&words.every(w=>tw.has(stem(w))))){cs.push(c.id);if(h.size)mark(h);else for(const w of words)typed.add(w);}}
 const untyped=[...new Set(normText(text).split(/[^\p{L}\p{N}.-]+/u))].filter(w=>w.length>2&&!STOP.has(w)&&!typed.has(w)&&!/^\d/.test(w));
 return {text,metrics:[...new Set(metrics)],kinds:[...new Set(kinds)],axes,concepts:[...new Set(cs)],units:[...new Set(units)],untyped};
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Statements.
export interface TranslatedStatement {id:string;type:string;
 subject:TypedSpan|null;object:TypedSpan|null;
 /** for composed_of: the parts */
 parts:TypedSpan[];
 /** an explicit contrast in the clause ("new versus aged"): the two contrasted phrases and the cue */
 contrast:{values:string[];cue:string}|null;
 /** the document's own status markers for this clause, block or heading (never upgraded) */
 status:string[];refs:string[];
 provenance:{source:string;line:number;headings:string[];block:DocBlock['kind'];header?:string};
 quote:string;rendered:string;
 /** Audit S77 (MinIE-style annotations): the relation is asserted (positive) or denied (negative); a hedge ("may",
  * "rarely") qualifies it. Read from the words around the relation word, never dropped. */
 polarity:'positive'|'negative';hedge:string|null;
 /** render-back self-check (R3): problems found by comparing the rendered sentence with the quote, e.g. a negation the
  * rendering lost. A statement with a problem is kept for audit but must not be used as knowledge. */
 selfCheck:string[];
 /** how the statement was recognised: a relation pattern, or the role of a table column */
 basis:'pattern'|'table_role';typedness:'typed'|'partly_typed'|'untyped'}
export interface TranslationResult {schema:'pee.r3.translation.v1';cues:string;source:string;blocks:number;clauses:number;statements:TranslatedStatement[];
 /** clauses (or table cells) no statement type recognised: the coverage gap, reported, not hidden */
 unrecognised:number}

function statusOf(cues:TranslationCues,...texts:string[]):string[]{const t=texts.join(' | ');const out=new Set<string>();
 for(const m of cues.statusMarkers)if(namedPhrases(t,m.cues).size)out.add(m.status);return [...out];}
function refsOf(cues:TranslationCues,text:string):string[]{const re=new RegExp(cues.referencePattern,'g');const out=new Set<string>();
 for(const m of text.matchAll(re))for(const r of m[1].split(/\s*[,;]\s*/))out.add(r);return [...out];}
const fill=(tpl:string,x:{subject?:string;object?:string;verb?:string;[k:string]:string|undefined},optionalSubject=false)=>tpl.replace(/\{(\w+)\}/g,(m,k)=>k==='subject'?(x.subject??(optionalSubject?'':'(unspecified)')):k==='object'?(x.object??'(unspecified)'):k==='conditions'?'':(x[k]??'')).replace(/\s{2,}/g,' ').replace(/:\s+(\S)/,(m,c)=>': '+c);
/** Negations and prohibitions: a rendered sentence must keep at least as many as its quote. */
const NEGATORS=/\b(?:not|no|never|cannot|can't|don't|doesn't|isn't|aren't|won't|avoid|without|neither)\b|n't\b/gi;
const negations=(t:string)=>(t.match(NEGATORS)??[]).length;
export function renderSelfCheck(quote:string,rendered:string):string[]{const out:string[]=[];if(negations(rendered)<negations(quote))out.push('negation_lost');return out;}
/** Audit S77 (A3-1, A3-2): relation statements carry polarity and hedge; a relation word in noun or adjective position
 * is not a relation. */
const RELATIONAL=new Set(['depends_on','increases','decreases','requires','measured_by','composed_of','method_step']);
const NEG_TAIL=/\s+(?:(?:does|do|did|can|could|will|would|may|might|should|must|is|are|was|were)\s*(?:not|n't)|never|cannot|can't|won't|fails?\s+to|failed\s+to)$/i;
const HEDGE_TAIL=/\s+(?:rarely|seldom|hardly|often|usually|sometimes|generally|typically|may|might|can|could|tends?\s+to)$/i;
// demonstratives are left out: "that requires", "this depends" are a pronoun and a verb
const NOUN_BEFORE=/^(?:a|an|the|with|of|for|and|or|no|any|its|their|lower|higher|greater|smaller|from|in|on|at|by|to|between|without|under|over|per|into)$/i;
const NOUN_AFTER=/^(?:is|are|was|were|be|apply|applies|matter|matters|remain|remains|occur|occurs|exist|exists|need|needs|of|to|size|and|or|shown|in|on|at|from|for|between|plus|per|during|works?|separately)$/i;
// audit S78: words used as nouns or adjectives as often as verbs ("filter change", "lower total energy", "fan control")
// (bare forms only: the -s form after a noun subject is the verb, "stacking changes contact")
const AMBIGUOUS_VERB=/^(?:change|control|lower|limit|increase|decrease|slow|boost|raise)$/i;
const DETERMINER=/^(?:the|a|an|its|their|this|these|those|each|every|both|all|any|some|how|whether|what|which|his|her|our|your|it|them)$/i;
const PRONOUN=/^(?:it|they|this|that|which|who|these|those)$/i;
const BIBLIOGRAPHIC=/^(?:[\dA-Z]+[.)]?\s+)?(?:sources|references|bibliography|citations|reading list|source register|works cited|source cards?)\b/i;
/** Document metadata and questions are not knowledge claims. */
// a decimal followed by a unit ("2.5 hours") is a value, not a version (audit S77 A3-6)
const METADATA_VALUE=/^(?:https?:\/\/|www\.|\S+\.(?:md|pdf|json|zip|html?|txt)\b|v\d+(?:\.\d+)*\b|\d+\.\d+\.\d+\b|\d+\.\d+\s*(?:\(|$)|\d{1,2}\s+\w+\s+\d{4}\b|\d{4}-\d{2}-\d{2}\b)/i;
const typedness=(...s:(TypedSpan|null)[]):TranslatedStatement['typedness']=>{const xs=s.filter((x):x is TypedSpan=>!!x);
 const t=xs.filter(x=>x.metrics.length||x.kinds.length||x.concepts.length||x.axes.length).length;return t===0?'untyped':t===xs.length?'typed':'partly_typed';};
// audit S77: whole words compared by inflectional stem ("Risks and limitations", "traps", "Evidence PEE needs"); the first
// whole-word version lost plural headers (held-out reach 289 -> 273)
const stemmed=(t:string)=>' '+(normText(t).match(/[a-z0-9]+/g)??[]).map(stem).join(' ')+' ';
function headerRole(cues:TranslationCues,h:string):string|null{const n=stemmed(h);if(!n.trim())return null;
 for(const [role,ws] of Object.entries(cues.tableHeaderRoles))if(ws.some(w=>n.includes(stemmed(w))))return role;return null;}
const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const TABLE_ROLE_TYPE:Record<string,string>={evidence_needed:'requires',method:'measured_by',limitation:'limitation',applicability:'applicability',outcome:'bears_on_outcome'};
const TABLE_ROLE_DISPLAY:Record<string,string>={quantitative_finding:'{subject} {object}.',measured_by:'{subject} is measured by {object}.',limitation:'For {subject}, the document warns: {object}.',
 applicability:'For {subject}, applicability: {object}.',bears_on_outcome:'{subject} bears on: {object}.',requires:'For {subject}, the evidence needed is: {object}.'};

/** Translate a teaching document (or some of its line ranges) into typed statements. */
export function translateDocument(qk:QuantityKnowledge,md:string,opts:{source:string;concepts?:readonly TaughtConcept[];range?:readonly {start:number;end:number}[];cues?:TranslationCues}):TranslationResult{
 const C=loadTranslationCues(opts.cues);
 // audit S78: a bibliographic section (sources, references) lists documents, not knowledge
 const blocks=parseTeachingDocument(md,opts.range).filter(b=>!b.headings.some(h=>BIBLIOGRAPHIC.test(h)));
 // audit S78: a label that recurs as "Label: value" in the document is a record field (a form, a source card, a YAML key),
 // and so is an identifier-like label ("id", "relevantmeasure"); "Field: value" is then a record, not a definition
 const labelCount=new Map<string,number>();for(const b of blocks){const m=/^([^:|]{2,70}):\s/.exec(b.text);if(m){const k=m[1].trim().toLowerCase();labelCount.set(k,(labelCount.get(k)??0)+1);}}
 const fieldLabel=(l:string)=>{const k=l.trim().toLowerCase();return (labelCount.get(k)??0)>=3||/^[a-z][a-z0-9_]*$/.test(l.trim())&&!/\s/.test(l.trim())&&l.trim().length<=24&&/^[a-z]/.test(l.trim());};const out:TranslatedStatement[]=[];let nClauses=0,unrec=0;
 const concepts=opts.concepts??[];const T=(s:string|undefined)=>s?typeSpan(qk,s.trim(),concepts):null;
 const push=(b:DocBlock,type:string,quote:string,sub:string|undefined,obj:string|undefined,basis:TranslatedStatement['basis'],header?:string,verb?:string,ann:{polarity?:'positive'|'negative';hedge?:string|null;extra?:Record<string,string|undefined>;checkAgainst?:string}={})=>{
  if(type==='definition'&&obj&&METADATA_VALUE.test(obj.trim())){unrec++;return;}
  const def=C.cues.statementTypes.find(d=>d.type===type);const subject=T(sub),object=T(obj);
  const parts=type==='composed_of'&&obj?obj.split(/,\s*|\s+(?:and|plus|\+)\s+/).map(p=>p.trim()).filter(p=>p.length>2).map(p=>T(p)!):[];
  const cue=C.cues.contrastCues.find(c=>new RegExp('(?:^|\\s)'+esc(c)+'(?:\\s|$)','i').test(quote));
  const contrast=cue?{values:quote.split(new RegExp('\\s+'+esc(cue)+'\\s+','i')).slice(0,2).map((s,i)=>{const w=s.split(/[,;:(]/);const t=(i===0?w.at(-1)!:w[0]).trim().split(' ');return (i===0?t.slice(-3):t.slice(0,3)).join(' ');}),cue}:null;
  const display=def?.display??TABLE_ROLE_DISPLAY[type]??'{subject}: {object}.';
  out.push({id:`${opts.source}:${b.line}:${out.length}`,type,subject,object,parts,contrast,status:statusOf(C.cues,quote,b.text,b.headings.at(-1)??''),refs:refsOf(C.cues,b.text),
   provenance:{source:opts.source,line:b.line,headings:b.headings,block:b.kind,...(header?{header}:{})},quote,
   rendered:'',polarity:ann.polarity??'positive',hedge:ann.hedge??null,selfCheck:[],basis,typedness:typedness(subject,object,...parts)});
  const st=out[out.length-1];let r=fill(display,{subject:subject?.text,object:object?.text,verb,...(ann.extra??{})},def?.optionalSubject);
  // audit S77: "by itself" only when the source says it (blind judges: a plain "does not establish" was weakened)
  if(type==='not_sufficient'&&!/\b(?:by itself|by themselves|alone|on (?:its|their) own|itself|themselves)\b/i.test(quote))r=r.replace(/ by itself /,' ');
  if(st.hedge)r=`(${st.hedge}) `+r;if(st.polarity==='negative')r='It is not the case that '+r.replace(/^Limitation: /,'');st.rendered=r;st.selfCheck=renderSelfCheck(ann.checkAgainst??quote,st.rendered);};
 // audit S78: candidates first, then one choice. The first pattern in cue order wins, except that among relation patterns
 // the leftmost relation verb wins (the main verb of the clause: "Different mechanisms require different control recipes"
 // is a requirement, not a dependency on "control"). A question is not a claim.
 const byPattern=(b:DocBlock,cl:string,header?:string)=>{if(/\?\s*$/.test(cl))return false;
  type Cand={pos:number;relational:boolean;emit:()=>void};const cands:Cand[]=[];
  for(const {def,res} of C.compiled)for(const re of res){
   // a relation word rejected by the noun guard is masked and the pattern tried again, so a later relation word in the
   // same clause is still found ("temperature control are interacting variables")
   let probe=cl;for(let attempt=0;attempt<4;attempt++){const m=re.exec(probe);if(!m)break;
    const idx=(m as RegExpExecArray&{indices?:{groups?:Record<string,[number,number]|undefined>}}).indices?.groups??{};
    const g:Record<string,string|undefined>={};for(const [k,v] of Object.entries(m.groups??{}))g[k]=v===undefined?undefined:idx[k]?cl.slice(idx[k]![0],idx[k]![1]):v;
    if(!RELATIONAL.has(def.type)){if(def.type==='definition'&&g.subject&&fieldLabel(g.subject))break;
     cands.push({pos:Infinity,relational:false,emit:()=>push(b,def.type,cl,g.subject,g.object,'pattern',header,g.verb,{extra:g})});break;}
    // the group before the relation word and the one after it, whatever their roles
    const order=(['subject','object'] as const).filter(k=>g[k]!==undefined&&idx[k]).sort((a,c)=>idx[a]![0]-idx[c]![0]);
    const pre=order.length===2?order[0]:(order[0]&&idx[order[0]]![0]===0?order[0]:null),post=order.length===2?order[1]:(order[0]&&idx[order[0]]![0]>0?order[0]:null);
    const lastPre=pre?(g[pre]!.trim().split(/\s+/).pop()??''):'',firstPost=post?(g[post]!.trim().split(/\s+/)[0]??''):'';
    const a=pre?idx[pre]![1]:0,z=post?idx[post]![0]:probe.length;const span=cl.slice(a,z);
    const word=(span.trim().split(/\s+/).pop()??'').toLowerCase();
    // a relation word in noun or adjective position is not a relation ("temperature control are", "with lower rating",
    // "Filter change, contact with dust", "changes in device behaviour"); a word that is a noun as often as a verb is read
    // as a verb only with evidence: a modal before it, a determiner after it, or a pronoun subject
    const ambiguous=AMBIGUOUS_VERB.test(word)&&!/\b(?:can|could|may|might|will|would|must|should|tends?\s+to|does|do|did|not|never)\b/i.test((pre?g[pre]!.split(/\s+/).slice(-2).join(' '):'')+' '+span)&&
     !DETERMINER.test(firstPost)&&!PRONOUN.test(lastPre)&&!/[a-z][^s']s$/i.test(lastPre);
    if((pre&&(NOUN_BEFORE.test(lastPre)||/,$/.test(lastPre)||/\bwhether\b/i.test(g[pre]!)))||(post&&NOUN_AFTER.test(firstPost))||ambiguous){
     if(z<=a)break;probe=probe.slice(0,a)+probe.slice(a,z).replace(/[A-Za-z]/g,'q')+probe.slice(z);continue;}
    let polarity:'positive'|'negative'='positive',hedge:string|null=null;const v:Record<string,string|undefined>={...g};
    if(pre){const n=NEG_TAIL.exec(v[pre]!);if(n){polarity='negative';v[pre]=v[pre]!.slice(0,n.index).trim();}
     const h=HEDGE_TAIL.exec(v[pre]!);if(h){hedge=h[0].trim().toLowerCase();v[pre]=v[pre]!.slice(0,h.index).trim();}}
    // a modal the pattern itself consumed ("charge can increase removal") is a hedge too
    if(!hedge){const h=/\b(can|could|may|might|tends?\s+to)\b/i.exec(span);if(h)hedge=h[1].toLowerCase();}
    if(post){const n=/^(?:neither|not|no)\s+/i.exec(v[post]!);if(n){polarity='negative';v[post]=v[post]!.slice(n[0].length).replace(/\s+nor\s+/gi,' or ');}}
    // a contrast inside the object: "affects scale, not taste" is two statements, one of each polarity
    const cx=post?/^(.*?)(?:,\s+(?:and\s+)?|\s+but\s+)not\s+(.+)$/i.exec(v[post]!):null;
    cands.push({pos:a,relational:true,emit:()=>{
     if(cx&&post){push(b,def.type,cl,post==='subject'?cx[1]:v.subject,post==='object'?cx[1]:v.object,'pattern',header,v.verb,{polarity,hedge,checkAgainst:cl.replace(/(?:,\s+(?:and\s+)?|\s+but\s+)not\s+.+$/i,'')});
      push(b,def.type,cl,post==='subject'?cx[2]:v.subject,post==='object'?cx[2]:v.object,'pattern',header,v.verb,{polarity:polarity==='positive'?'negative':'positive',hedge});return;}
     push(b,def.type,cl,v.subject,v.object,'pattern',header,v.verb,{polarity,hedge});}});break;}}
  if(!cands.length)return false;
  const first=cands[0];const pick=first.relational?cands.filter(c=>c.relational).reduce((x,y)=>y.pos<x.pos?y:x):first;
  pick.emit();return true;};
 for(const b of blocks){
  if(b.kind==='table_row'&&b.cells){
   const subj=b.cells.find(c=>headerRole(C.cues,c.header)==='subject')?.text??b.cells[0]?.text;
   for(const c of b.cells){if(!c.text||c.text===subj)continue;nClauses++;
    if(subj&&/\b(?:not|no|cannot|does|do|is|are|requires?|measured|depends|establish(?:es)?)\b/i.test(c.header)&&byPattern(b,`${subj} ${c.header.toLowerCase()} ${c.text}`,c.header))continue;
    if(byPattern(b,c.text,c.header))continue;
    const q=findQuantities(qk,c.text).filter(f=>f.value!==null);if(q.length&&!headerRole(C.cues,c.header)){push(b,'quantitative_finding',`${subj} | ${c.header}: ${c.text}`,`${subj} (${c.header})`,c.text,'table_role',c.header);continue;}const role=headerRole(C.cues,c.header);const type=role?TABLE_ROLE_TYPE[role]:undefined;
    if(type)push(b,type,`${subj} | ${c.header}: ${c.text}`,subj,c.text,'table_role',c.header);else unrec++;}
   continue;}
  for(const cl of clauses(b.text)){nClauses++;
   // a question asks for knowledge; it does not state it
   if(cl.includes('?')){unrec++;continue;}
   if(byPattern(b,cl))continue;
   // a quantitative finding: the clause states a value with a unit the quantity knowledge reads
   const q=findQuantities(qk,cl).filter(f=>f.value!==null);
   if(q.length){const at=q[0].start;push(b,'quantitative_finding',cl,cl.slice(0,at).trim()||undefined,cl.slice(at).trim(),'pattern');continue;}
   unrec++;}}
 return {schema:'pee.r3.translation.v1',cues:`${C.cues.version}:${C.digest.slice(0,12)}`,source:opts.source,blocks:blocks.length,clauses:nClauses,statements:out,unrecognised:unrec};
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Question-driven acquisition of condition axes (R3). The question comes from PEE's own teaching: words in the names
//    of taught measurements that the quantity knowledge cannot type (e.g. two luminance measurements that differ only by
//    "sdr" and "hdr"). The answer comes from the documents: a structure that states those words as alternative values of
//    one condition. Three general structures, no category words:
//    - an enumerated field:        filter_condition: new | aged | replaced | unknown
//    - slash alternatives + head:  SDR/HDR state, slow/fast mode
//    - an explicit contrast + head: new versus aged filters
//    A proposal is kept only when it answers a question (one of its values is such a word) and has at least two values.
//    It is a reversible proposal with provenance; nothing is stored.
export interface AxisProposal {axis:string;head:string;values:Record<string,string[]>;
 evidence:{source:string;line:number;quote:string;structure:'enumeration'|'slash'|'contrast'}[];
 answers:{measurement:string;word:string}[]}
const HEADS='state|states|mode|modes|format|formats|condition|conditions|setting|settings|load|loads|signal|signals|filter|filters|programme|programmes|program|programs|cycle|cycles|window|windows|run|runs|range|ranges|level|levels';
/** A question of the teaching: two taught measurements of the same measurand that differ by words PEE cannot type. */
export interface DistinctionQuestion {a:string;b:string;wordsA:string[];wordsB:string[]}
export function distinctionQuestions(descriptors:readonly {id:string;measurands:{kind:string;metric:string|null;level:string}[];untyped:string[]}[]):DistinctionQuestion[]{
 const key=(d:typeof descriptors[number])=>new Set(d.measurands.filter(m=>m.level==='head').map(m=>m.metric??m.kind));const out:DistinctionQuestion[]=[];
 for(let i=0;i<descriptors.length;i++)for(let j=i+1;j<descriptors.length;j++){const A=descriptors[i],B=descriptors[j];const ka=key(A),kb=key(B);
  if(![...ka].some(k=>kb.has(k)))continue;const wa=A.untyped.filter(w=>!B.untyped.includes(w)),wb=B.untyped.filter(w=>!A.untyped.includes(w));
  if(wa.length||wb.length)out.push({a:A.id,b:B.id,wordsA:wa,wordsB:wb});}
 return out;
}
export function acquireConditionAxes(qk:QuantityKnowledge,docs:readonly {source:string;md:string}[],questions:readonly DistinctionQuestion[]):AxisProposal[]{
 const wanted=new Map<string,string[]>();for(const q of questions){for(const w of q.wordsA)wanted.set(w,[...(wanted.get(w)??[]),q.a]);for(const w of q.wordsB)wanted.set(w,[...(wanted.get(w)??[]),q.b]);}
 const found=new Map<string,AxisProposal>();
 const singular=(h:string)=>h.endsWith('ss')?h:h.replace(/s$/,'');
 const HEADSET=new Set(HEADS.split('|'));
 const add=(head:string,vals:string[],source:string,line:number,quote:string,structure:AxisProposal['evidence'][number]['structure'])=>{
  const vs=[...new Set(vals.map(v=>normText(v).replace(/[^a-z0-9 -]/g,'').trim()).filter(v=>v.length>=2&&v.length<=24&&!/^\d+$/.test(v)&&!HEADSET.has(v)&&!STOP.has(v)))];if(vs.length<2)return;
  const answers=vs.flatMap(v=>(wanted.get(v)??[]).map(m=>({measurement:m,word:v})));if(!answers.length)return;
  const h=normText(head).replace(/[^a-z0-9_ ]/g,'').trim().replace(/\s+/g,'_');let axis=('acq_'+h).slice(0,40);
  // values never stated together are not one condition ("new versus aged filters" and "HEPA/carbon filters")
  for(let k=2;found.has(axis)&&!vs.some(v=>Object.prototype.hasOwnProperty.call(found.get(axis)!.values,v.replace(/[^a-z0-9]+/g,'_')));k++)axis=('acq_'+h).slice(0,37)+'_'+k;
  const p=found.get(axis)??{axis,head:h,values:{},evidence:[],answers:[]};
  for(const v of vs)p.values[v.replace(/[^a-z0-9]+/g,'_')]=[v];p.evidence.push({source,line,quote:quote.slice(0,200),structure});
  for(const a of answers)if(!p.answers.some(x=>x.measurement===a.measurement&&x.word===a.word))p.answers.push(a);found.set(axis,p);};
 for(const d of docs)d.md.split('\n').forEach((raw,i)=>{const l=raw.replace(/[*`_]{2,}/g,'');
  const en=/^\s*(?:[-*]\s*)?([a-z][a-z_ ]{2,40}):\s*([^|]{1,30}(?:\s\|\s[^|]{1,30}){1,})\s*$/i.exec(l);
  if(en)add(en[1],en[2].split(/\s\|\s/),d.source,i+1,l.trim(),'enumeration');
  for(const m of l.matchAll(new RegExp(`\\b([A-Za-z0-9-]{2,14})((?:/[A-Za-z0-9-]{2,14}){1,3})\\s+(${HEADS})\\b`,'gi')))
   add(singular(m[3]),[m[1],...m[2].split('/').filter(Boolean)],d.source,i+1,m[0],'slash');
  for(const m of l.matchAll(new RegExp(`\\b([A-Za-z-]{3,15})\\s+(?:versus|vs\\.?)\\s+(?:[A-Za-z]+\\s+(?:or|and)\\s+)?(?:[A-Za-z]+\\s+)?([A-Za-z-]{3,15})\\s+(${HEADS})\\b`,'gi')))
   add(singular(m[3]),[m[1],m[2]],d.source,i+1,m[0],'contrast');});
 for(const p of found.values())if(qk.axes.has(p.axis))found.delete(p.axis);
 // keep an axis only when it answers a distinction completely: each side that has distinguishing words gets a value of
 // the axis (SDR vs HDR). A one-sided answer ("aged" against a measurement that names no filter state) would make PEE
 // assume the other value when a page states none, which R2 forbids.
 for(const p of found.values()){const vals=new Set(Object.values(p.values).flat());
  const complete=questions.filter(q=>{const ha=q.wordsA.some(w=>vals.has(w)),hb=q.wordsB.some(w=>vals.has(w));return (ha||hb)&&(ha||!q.wordsA.length)&&(hb||!q.wordsB.length);});
  if(!complete.length)found.delete(p.axis);else p.answers=p.answers.filter(a=>complete.some(q=>q.a===a.measurement||q.b===a.measurement));}
 return [...found.values()].sort((a,b)=>a.axis.localeCompare(b.axis));
}
/** A quantity knowledge extended with acquired axes (a reversible overlay: the pack file is unchanged). Acquired axes
 * are closed lists; they are not operating conditions unless the knowledge says so. */
export function withAcquiredAxes(qk:QuantityKnowledge,proposals:readonly AxisProposal[],load:(pack:unknown)=>QuantityKnowledge):QuantityKnowledge{
 if(!proposals.length)return qk;
 const pack=JSON.parse(JSON.stringify(qk.pack));pack.version=pack.version+'+acq';
 pack.sources=[...pack.sources,{id:'r3_acquired',title:'R3: condition axes acquired by PEE from the owner teaching documents (proposals, reversible)',url:null,use:'condition axes answering questions of the teaching',licence:'owner research (private)'}];
 pack.conditionAxes=[...pack.conditionAxes,...proposals.map(p=>({id:p.axis,values:p.values,labelled:true,source:'r3_acquired'}))];
 return load(pack);
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. Consulting translated statements (R3 cycle 2, owner S74): sufficiency of a taught measurement for an outcome.
//    A teaching relation "M is measured by / bears on O" does not say whether M establishes O. A translated
//    not_sufficient statement whose subject identifies M and whose object identifies O says that M informs O only.
//    Identification is by the unique best word match among the category's taught measurements (subject) and outcomes
//    (object); a tie or a weak match decides nothing. Only statements that pass the render-back self-check are read.
//    Nothing is derived from silence: without a statement the sufficiency stays unresolved (never "establishes").
//    Each derivation keeps its quote, provenance and scope (headings and the clause's own conditions): the statement
//    holds where the document says it holds, and is evidence for the force of a link, never an exclusion of a product.
export interface DerivedSufficiency {relation:string;measurement:string;outcome:string;sufficiency:'informs_only';
 evidence:{statement:string;source:string;line:number;quote:string;scope:string[]}[]}
const contentTokens=(s:string)=>normText(s.replace(/_/g,' ')).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!STOP.has(w));
const contentWords=(s:string)=>[...new Set(contentTokens(s))];
/** Audit S77 (A3-3): a light inflectional stemmer (plural, -ing, -ed); the earlier 6-letter prefix merged different
 * words (condenser/condensation, humidity/humidifier) and split short inflections (fan speeds / fan speed). */
export function stem(w:string):string{let x=w.toLowerCase();
 if(x.length>4&&x.endsWith('ies'))x=x.slice(0,-3)+'y';
 else if(x.length>4&&/(?:sses|shes|ches|xes)$/.test(x))x=x.slice(0,-2);
 else if(x.length>3&&x.endsWith('s')&&!/(?:ss|us|is)$/.test(x))x=x.slice(0,-1);
 if(x.length>5&&x.endsWith('ing'))x=x.slice(0,-3);else if(x.length>4&&x.endsWith('ed')&&!x.endsWith('eed'))x=x.slice(0,-2);
 if(/([^aeiouls])\1$/.test(x))x=x.slice(0,-1);
 if(x.length>4&&x.endsWith('e'))x=x.slice(0,-1);
 return x;}
/** The concept a phrase identifies: the unique clear best match. A concept is described by the words of its name, of the
 * first sentence of its statement and of its aliases; a word shared by many candidates weighs less (inverse document
 * frequency over the candidates). A match needs an alias, or two distinctive words of which one is from the name, and
 * must lead the next candidate clearly; otherwise nothing is identified. */
export function identifyConcept(phrase:string,candidates:readonly {id:string;aliases?:readonly string[];statement?:string}[]):string|null{
 const have=new Set(contentWords(phrase).map(stem));if(!have.size)return null;
 const desc=candidates.map(c=>{const name=new Set(contentWords(c.id).map(stem));const head=new Set(contentWords((c.statement??'').split(/(?<=[.;:])\s/)[0]??'').map(stem));
  return {id:c.id,name,all:new Set([...name,...head]),alias:(c.aliases??[]).some(a=>namedPhrases(phrase,[a]).size>0)};});
 const df=new Map<string,number>();for(const d of desc)for(const w of d.all)df.set(w,(df.get(w)??0)+1);
 const n=desc.length;const idf=(w:string)=>Math.log(1+n/(df.get(w)??1));
 const scored=desc.map(d=>{const hit=[...d.all].filter(w=>have.has(w));const nameHit=hit.filter(w=>d.name.has(w));
  const ok=d.alias||(hit.length>=2&&nameHit.length>=1);return {id:d.id,ok,score:(d.alias?3:0)+hit.reduce((a,w)=>a+idf(w)*(d.name.has(w)?2:1),0)};})
  .filter(x=>x.ok).sort((a,b)=>b.score-a.score);
 if(!scored.length)return null;if(scored.length>1&&scored[0].score-scored[1].score<1)return null;
 return scored[0].id;
}
const SCOPE_CUES=/\b(?:when|if|unless|under|at|for|during|only|except|provided|in|without|with)\b[^,;.]*/gi;
const SUBORDINATE=/\b(?:when|if|unless|under|during|provided|except)\b[^,;.]*/gi;
/** Audit S77 (A3-10): the scope of a statement: its heading, the conditions in its subject, and the subordinate
 * conditions of its object ("... when the basket is loaded"); never a fragment of the relation itself. */
function scopeOf(s:TranslatedStatement):string[]{
 return [...s.provenance.headings.slice(-1).filter(Boolean),...((s.subject?.text??'').match(SCOPE_CUES)??[]),...((s.object?.text??'').match(SUBORDINATE)??[])].map(x=>x.trim());}
export function deriveSufficiency(statements:readonly TranslatedStatement[],teaching:{measurements:readonly {concept:TaughtConcept;outcomes:readonly {outcome:string;relation:string}[]}[]},outcomeConcepts:readonly TaughtConcept[]=[]):DerivedSufficiency[]{
 const ms=teaching.measurements.map(m=>m.concept);const described=new Map(outcomeConcepts.map(c=>[c.id,c]));
 const outcomes=[...new Set(teaching.measurements.flatMap(m=>m.outcomes.map(o=>o.outcome)))].map(id=>described.get(id)??{id});
 const out=new Map<string,DerivedSufficiency>();
 for(const s of statements){if(s.type!=='not_sufficient'||s.selfCheck.length||!s.subject||!s.object)continue;
  const m=identifyConcept(s.subject.text,ms),o=identifyConcept(s.object.text,outcomes);if(!m||!o)continue;
  const rel=teaching.measurements.find(x=>x.concept.id===m)?.outcomes.find(x=>x.outcome===o);if(!rel)continue;
  const d=out.get(rel.relation)??{relation:rel.relation,measurement:m,outcome:o,sufficiency:'informs_only' as const,evidence:[]};
  d.evidence.push({statement:s.id,source:s.provenance.source,line:s.provenance.line,quote:s.quote,scope:scopeOf(s)});
  out.set(rel.relation,d);}
 return [...out.values()].sort((a,b)=>a.relation.localeCompare(b.relation));
}

//    Proxy limits (R3 cycle 2). The documents' not_sufficient / not_comparable statements mostly concern what a page
//    shows (a label, a nominal capacity, a particle CADR, a coverage figure), not the taught test designs. A statement
//    whose subject PEE can type as a quantity (metric or kind) becomes a limit: "a value of this quantity does not by
//    itself establish <object>" (or is not comparable with it), with quote, provenance and scope. A limit applies to a read
//    value when the value is of the subject's metric, or of its kind and the value's label shares a distinctive word of the
//    subject; it does not apply when the value states another value of an axis the subject fixes (the statement's scope).
//    A limit qualifies what a value can show; it never excludes a product and never ranks (owner S74).
/** Which values a limit concerns, from what its subject denotes: a declaration's limit concerns declared values, a
 * measurement's limit measured values; any other subject concerns values of that quantity whatever their role. */
export type LimitRole='declared'|'measured'|'any';
/** Words by which a subject states that it is about measured values. */
const ROLE_WORDS_MEASURED=['measured','tested','independently measured','laboratory','lab-measured','metered'];
/** Evidence classes of read values (document_evidence / 1G) by the role a limit can concern. */
const VALUE_ROLE:Record<string,'declared'|'measured'|undefined>={manufacturer_declared:'declared',publisher_measured:'measured'};
export interface ProxyLimit {id:string;type:'not_sufficient'|'not_comparable'|'is_not';appliesTo:LimitRole;denotes:Denotation;metrics:string[];kinds:string[];axes:{axis:string;value:string}[];words:string[];
 object:string;outcome:string|null;scope:string[];quote:string;source:string;line:number}
/** The head of a subject phrase: what the statement is about. The last sentence, without an introductory phrase
 * ("Without the source assumptions, coverage figures" -> "coverage figures"), cut before a preposition ("OLED burn-in in
 * high-brightness imagery" -> "OLED burn-in"), as for the names of taught measurements. */
export function subjectHead(text:string):string{
 let t=(text.split(/(?<=[.;:!?])\s+/).at(-1)??text).replace(/^(?:conversely|however|therefore|thus|hence|moreover|furthermore|similarly|likewise|instead|also|but|and|so),?\s+/i,'');
 const segs=t.split(/,\s+/);if(segs.length>1&&/^(?:without|with|when|if|unless|for|in|after|before|under|at|on|by|although|though|because|since|as|given)\b/i.test(segs[0]))t=segs.at(-1)!;
 // "of" complements stay in the head ("the rate of moisture removal", "reduction of aerosol"; audit S77 A3-4)
 const i=(' '+t).search(/\s(?:by|at|per|for|with|across|under|in|on|over|during|from|without|versus|vs)\s/i);
 // "kWh per 1000 hours": a unit's own denominator is part of the head
 return (i>0&&!/\b(?:kwh|wh|w|l|m3|m³|db|dba|lm|nits?)$/i.test(t.slice(0,i-1).trim())?t.slice(0,i-1):t).trim();
}
export function proxyLimits(qk:QuantityKnowledge,statements:readonly TranslatedStatement[],outcomeConcepts:readonly TaughtConcept[]=[]):ProxyLimit[]{
 const out:ProxyLimit[]=[];
 for(const s of statements){if((s.type!=='not_sufficient'&&s.type!=='not_comparable'&&s.type!=='is_not')||s.selfCheck.length||!s.subject)continue;
  const sub=typeSpan(qk,subjectHead(s.subject.text));if(!sub.metrics.length&&!sub.kinds.length)continue;
  const denotes=denotationOf(qk,s.subject.text);
  // a role restricts a limit only when its subject states it ("advertised litres", "a measured CADR"); a quantity alone
  // concerns its values whatever their role
  const C=loadDenotationCues();const said=(d:string)=>namedPhrases(subjectHead(s.subject!.text),C.cues[d]).size>0;
  const appliesTo:LimitRole=said('claim_or_label')?'declared':namedPhrases(subjectHead(s.subject.text),ROLE_WORDS_MEASURED).size?'measured':'any';
  out.push({id:s.id,type:s.type,appliesTo,denotes,metrics:sub.metrics,kinds:sub.kinds,axes:s.subject.axes,words:sub.untyped.filter(w=>w.length>3),object:s.object?.text??'',
   outcome:s.object?identifyConcept(s.object.text,outcomeConcepts):null,scope:scopeOf(s),
   quote:s.quote,source:s.provenance.source,line:s.provenance.line});}
 return out;
}
export function applicableLimits(limits:readonly ProxyLimit[],value:{metric:string|null;kind:string|null;conditions:readonly {axis:string;value:string}[];label:string;evidenceClass?:string|null},skipped?:{role:number}):{limit:ProxyLimit;basis:'metric'|'kind_and_word'|'kind_and_role'}[]{
 const have=new Set(contentWords(value.label).map(stem));const out:{limit:ProxyLimit;basis:'metric'|'kind_and_word'|'kind_and_role'}[]=[];
 const role=value.evidenceClass===undefined?undefined:VALUE_ROLE[value.evidenceClass??''];
 for(const l of limits){
  // evidence role: a limit about declarations does not qualify a measured value, nor the reverse; when the value's role
  // is unknown such a limit is not applied (counted), since applying it could misdescribe what the value is
  if(l.appliesTo!=='any'&&role!==l.appliesTo){if(skipped&&!role)skipped.role++;continue;}
  // scope: a value stated at another value of an axis the statement names is outside the statement
  if(l.axes.some(a=>value.conditions.some(c=>c.axis===a.axis&&c.value!==a.value)))continue;
  if(value.metric&&l.metrics.includes(value.metric)){out.push({limit:l,basis:'metric'});continue;}
  if(!l.metrics.length&&value.kind&&l.kinds.includes(value.kind)){
   // the words naming the role ("advertised", "measured") are matched by the value's evidence class itself
   if(l.words.some(w=>have.has(stem(w))))out.push({limit:l,basis:'kind_and_word'});
   // a declaration's subject is specific by its role ("advertised litres"); "measured" alone is not specific
   else if(l.appliesTo==='declared'&&role==='declared')out.push({limit:l,basis:'kind_and_role'});}}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. Concept alignment (R3 cycle 3, owner S75): candidate retrieval is separate from validation of meaning.
//    Retrieval is deliberately liberal (any shared distinctive word ranks a candidate); it decides nothing. Validation
//    assigns a match type in the SKOS sense (exact, close, broader, narrower, related, none); only exact and close
//    alignments may stand for the concept, and an unvalidated candidate is never an identity.
export type MatchType='exact'|'close'|'broader'|'narrower'|'related'|'none';
export interface ConceptCandidate {id:string;score:number;shared:string[]}
export function retrieveConcepts(phrase:string,candidates:readonly {id:string;aliases?:readonly string[];statement?:string}[],k=5):ConceptCandidate[]{
 const have=new Set(contentWords(phrase).map(stem));if(!have.size)return [];
 const desc=candidates.map(c=>({id:c.id,name:new Set(contentWords(c.id).map(stem)),all:new Set([...contentWords(c.id),...contentWords((c.statement??'').split(/(?<=[.;:])\s/)[0]??''),...(c.aliases??[]).flatMap(a=>contentWords(a))].map(stem))}));
 const df=new Map<string,number>();for(const d of desc)for(const w of d.all)df.set(w,(df.get(w)??0)+1);const idf=(w:string)=>Math.log(1+desc.length/(df.get(w)??1));
 return desc.map(d=>{const shared=[...d.all].filter(w=>have.has(w));return {id:d.id,shared,score:shared.reduce((a,w)=>a+idf(w)*(d.name.has(w)?2:1),0)};})
  .filter(x=>x.shared.length).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,k);
}
/** Validation (v0): a candidate stands for the phrase (exact or close) only when an alias of the concept is in the
 * phrase, or the phrase's head word is a word of the concept's name and the phrase covers most of the name; a candidate
 * sharing only modifiers or description words is `related`; otherwise `none`. A candidate whose kind contradicts what
 * the sentence needs in that role (an outcome as the object of "does not establish") is at most `related`. The
 * alignment is the unique identity-grade candidate; several or none leave the phrase unresolved. */
export interface Alignment {concept:string|null;status:'aligned'|'unresolved';candidates:{id:string;match:MatchType}[]}
export function alignConcept(phrase:string,pool:readonly {id:string;kind?:string;aliases?:readonly string[];statement?:string}[],ctx:{role?:'subject'|'object';statementType?:string}={}):Alignment{
 const cands=retrieveConcepts(phrase,pool,5);const head=contentWords(subjectHead(phrase));const H=head.length?stem(head[head.length-1]):null;
 const have=new Set(contentWords(phrase).map(stem));
 const wantKind=ctx.role==='object'&&(ctx.statementType==='not_sufficient'||ctx.statementType==='bears_on_outcome')?'outcome':null;
 const out:{id:string;match:MatchType}[]=cands.map(c=>{const p=pool.find(x=>x.id===c.id)!;const name=contentWords(p.id).map(stem);
  const alias=(p.aliases??[]).some(a=>namedPhrases(phrase,[a]).size>0);
  const covered=name.filter(w=>have.has(w)).length;
  let match:MatchType=alias||(H!==null&&name.includes(H)&&covered>=Math.max(1,Math.ceil(name.length*0.6)))?'close':name.some(w=>have.has(w))||c.shared.length?'related':'none';
  if(match==='close'&&wantKind&&p.kind&&p.kind!==wantKind)match='related';
  return {id:c.id,match};});
 const ids=out.filter(x=>x.match==='close'||x.match==='exact');
 return {concept:ids.length===1?ids[0].id:null,status:ids.length===1?'aligned':'unresolved',candidates:out};
}

// Semantic type (R3 cycle 3, owner S75): what a phrase refers to, checked before any identity alignment.
export type Denotation='measurement_or_test'|'outcome'|'condition'|'product_feature'|'claim_or_label'|'source_or_evidence'|'other';
interface DenotationCues {version:string;order:Exclude<Denotation,'other'>[];cues:Record<string,string[]>;compatibleKinds:Record<Denotation,string[]>}
let cachedDn:DenotationCues|null=null;
export function loadDenotationCues():DenotationCues{return cachedDn??=JSON.parse(readFileSync(new URL('../../resources/knowledge-translation/denotation-cues.v1.json',import.meta.url),'utf8'));}
export function denotationOf(qk:QuantityKnowledge,phrase:string):Denotation{
 const C=loadDenotationCues();const head=subjectHead(phrase);
 for(const text of [head,phrase]){
  const claim=namedPhrases(text,C.cues.claim_or_label).size>0;
  const feature=namedPhrases(text,C.cues.product_feature).size>0;
  const first=contentWords(text)[0];if(first&&namedPhrases(first,C.cues.outcome).size&&!namedPhrases(text,C.cues.claim_or_label).size)return 'outcome';
  for(const d of C.order){if(d==='measurement_or_test'&&!claim&&!feature){const t=typeSpan(qk,text);if(t.metrics.length||t.kinds.length)return d;}
   if(namedPhrases(text,C.cues[d]).size)return d;}}
 return 'other';
}
/** Validation v1: the retrieved candidate the cycle-2 identifier would pick becomes an identity only when its kind is
 * compatible with what the phrase denotes; otherwise it is `related` and the phrase stays unresolved. */
export function alignWithType(qk:QuantityKnowledge,phrase:string,pool:readonly {id:string;kind?:string;aliases?:readonly string[];statement?:string}[]):Alignment&{denotes:Denotation}{
 const denotes=denotationOf(qk,phrase);const ok=new Set(loadDenotationCues().compatibleKinds[denotes]??[]);
 const pick=identifyConcept(phrase,pool);const cands=retrieveConcepts(phrase,pool,5).map(c=>({id:c.id,match:'related' as MatchType}));
 if(pick&&ok.has(pool.find(p=>p.id===pick)?.kind??'')){const i=cands.findIndex(c=>c.id===pick);if(i>=0)cands[i].match='close';else cands.unshift({id:pick,match:'close'});return {concept:pick,status:'aligned',candidates:cands,denotes};}
 return {concept:null,status:'unresolved',candidates:cands,denotes};
}

// Document concepts (R3 cycle 3, option 3): what the documents name that the store has no concept for (features, claims,
// evidence types, ...). Kept with their denotation, provenance and `related` links to taught concepts only; never an
// identity, never a product fact. A census of what the teaching would need to represent.
export interface DocumentConcept {key:string;head:string;denotes:Denotation;mentions:{statement:string;source:string;line:number;role:'subject'|'object'}[];related:string[]}
export function documentConcepts(qk:QuantityKnowledge,statements:readonly TranslatedStatement[],pool:readonly {id:string;kind?:string;aliases?:readonly string[];statement?:string}[]):DocumentConcept[]{
 const out=new Map<string,DocumentConcept>();
 for(const s of statements){if(s.selfCheck.length)continue;for(const role of ['subject','object'] as const){const sp=s[role];if(!sp||sp.text.length<3)continue;
  const al=alignWithType(qk,sp.text,pool);if(al.status==='aligned')continue;
  const head=subjectHead(sp.text);const key=contentWords(head).map(stem).sort().join(' ');if(!key)continue;
  const d=out.get(key)??{key,head,denotes:al.denotes,mentions:[],related:[]};
  d.mentions.push({statement:s.id,source:s.provenance.source,line:s.provenance.line,role});for(const c of al.candidates)if(!d.related.includes(c.id))d.related.push(c.id);
  out.set(key,d);}}
 return [...out.values()].sort((a,b)=>b.mentions.length-a.mentions.length||a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------------------------------------------------
// 7. Distributional similarity learned from the owner's own teaching corpus (R3 cycle 3, option 1). Each word is
//    described by the words around it (window ±W) across the corpus, weighted by positive pointwise mutual information;
//    word similarity is the cosine of those vectors. No external model, data or service. Similarity is relatedness, not
//    identity (HANS): it may only rank candidates; validation (semantic type, explicit unresolved state) still decides.
export interface DistributionalModel {vocab:number;vectors:Map<string,Map<string,number>>;norms:Map<string,number>}
export function trainDistributional(texts:readonly string[],opts:{window?:number;minCount?:number}={}):DistributionalModel{
 const W=opts.window??5,min=opts.minCount??3;const docs=texts.map(t=>contentTokens(t).map(stem));
 const count=new Map<string,number>();for(const d of docs)for(const w of d)count.set(w,(count.get(w)??0)+1);
 const keep=(w:string)=>(count.get(w)??0)>=min;const co=new Map<string,Map<string,number>>();let total=0;
 for(const d of docs){const ws=d.filter(keep);for(let i=0;i<ws.length;i++)for(let j=Math.max(0,i-W);j<Math.min(ws.length,i+W+1);j++){if(i===j)continue;
  const a=ws[i],b=ws[j];const m=co.get(a)??new Map<string,number>();m.set(b,(m.get(b)??0)+1);co.set(a,m);total++;}}
 const row=new Map<string,number>();for(const [a,m] of co){let s=0;for(const v of m.values())s+=v;row.set(a,s);}
 const vectors=new Map<string,Map<string,number>>(),norms=new Map<string,number>();
 for(const [a,m] of co){const v=new Map<string,number>();let n=0;for(const [b,c] of m){const p=Math.log((c*total)/((row.get(a)??1)*(row.get(b)??1)));if(p>0){v.set(b,p);n+=p*p;}}
  vectors.set(a,v);norms.set(a,Math.sqrt(n));}
 return {vocab:vectors.size,vectors,norms};
}
export function wordSimilarity(m:DistributionalModel,a:string,b:string):number{
 const x=stem(a.toLowerCase()),y=stem(b.toLowerCase());if(x===y)return 1;const va=m.vectors.get(x),vb=m.vectors.get(y);if(!va||!vb)return 0;
 const [s,l]=va.size<vb.size?[va,vb]:[vb,va];let d=0;for(const [k,v] of s){const w=l.get(k);if(w)d+=v*w;}return d/((m.norms.get(x)||1)*(m.norms.get(y)||1));
}
/** Soft overlap of two phrases: each content word of the first matched to its most similar word of the second. */
export function phraseSimilarity(m:DistributionalModel,a:string,b:string):number{
 const A=contentWords(a),B=contentWords(b);if(!A.length||!B.length)return 0;
 return A.reduce((s,w)=>s+Math.max(...B.map(v=>wordSimilarity(m,w,v))),0)/A.length;
}

// ---------------------------------------------------------------------------------------------------------------------
// 8. S94 Stage 2 (owner review of S93): hybrid vector-symbolic alignment. References, used as architecture, not as
//    dependencies: OWL2Vec* (a concept is embedded with its graph neighbourhood, not only its label), LogMap (lexical
//    anchors, then logical checks that reject incoherent mappings) and ChemDataExtractor 2.0 (typed parsing of quantities
//    before relation decisions). The PPMI vectors (section 7) only RETRIEVE candidates and support `related`; an identity
//    always needs a lexical anchor and passes the symbolic checks (semantic type, quantity kind and metric); a shared head
//    with an uncovered name is a hierarchy candidate; disjoint quantity typing is `incompatible`. Vector similarity alone
//    never establishes identity.
export interface ConceptNode {id:string;kind?:string;aliases?:readonly string[];statement?:string;neighbors?:readonly {id:string;relation:string}[]}
export type HybridRelation='identity'|'broader'|'narrower'|'related'|'incompatible'|'none';
export interface HybridCandidate {id:string;relation:HybridRelation;via:('lexical'|'vector')[];similarity:number;
 checks:{anchor:'alias'|'head'|null;coverage:number;denotation:boolean;quantity:'compatible'|'incompatible'|'untyped'}}
export interface HybridAlignment {concept:string|null;status:'aligned'|'unresolved';denotes:Denotation;candidates:HybridCandidate[]}
const words=(id:string)=>id.replace(/[_-]+/g,' ');
/** The text a concept is embedded from: its name, aliases, the first sentence of its statement and, with `graph`, the
 * names of its graph neighbours with the relation (OWL2Vec*'s walks, depth one). */
export function conceptDocument(c:ConceptNode,graph=false):string{
 return [words(c.id),...(c.aliases??[]),(c.statement??'').split(/(?<=[.;:])\s/)[0]??'',...(graph?(c.neighbors??[]).map(n=>words(n.relation)+' '+words(n.id)):[])].join(' . ');}
const tvCache=new WeakMap<DistributionalModel,Map<string,Map<string,number>>>();
function textVector(m:DistributionalModel,text:string):Map<string,number>{let cm=tvCache.get(m);if(!cm){cm=new Map();tvCache.set(m,cm);}const hit=cm.get(text);if(hit)return hit;const r=textVector0(m,text);if(cm.size<200000)cm.set(text,r);return r;}
function textVector0(m:DistributionalModel,text:string):Map<string,number>{const v=new Map<string,number>();
 for(const w of contentWords(text).map(stem)){const x=m.vectors.get(w);const n=m.norms.get(w)||1;if(!x)continue;for(const [k,y] of x)v.set(k,(v.get(k)??0)+y/n);}return v;}
function cosine(a:Map<string,number>,b:Map<string,number>):number{let d=0,na=0,nb=0;for(const [k,x] of a){na+=x*x;const y=b.get(k);if(y)d+=x*y;}for(const y of b.values())nb+=y*y;return na&&nb?d/Math.sqrt(na*nb):0;}
export function vectorRetrieve(m:DistributionalModel,phrase:string,pool:readonly ConceptNode[],k=5,graph=false):{id:string;similarity:number}[]{
 const p=textVector(m,phrase);if(!p.size)return [];
 return pool.map(c=>({id:c.id,similarity:+cosine(p,textVector(m,conceptDocument(c,graph))).toFixed(4)})).filter(x=>x.similarity>0).sort((a,b)=>b.similarity-a.similarity||a.id.localeCompare(b.id)).slice(0,k);}
export interface HybridOptions {model?:DistributionalModel|null;k?:number;graph?:boolean;typing?:boolean;relatedSimilarity?:number;
 /** it1: 'word' accepts any shared word of the concept name as the lexical anchor when the vector ranks the candidate
  * first among the candidates by `margin` and above `minSimilarity`; 'head' is the it0 rule (phrase head in the name) */
 anchor?:'head'|'word';minSimilarity?:number;margin?:number;denotation?:boolean}
export function alignHybrid(qk:QuantityKnowledge,phrase:string,pool:readonly ConceptNode[],opts:HybridOptions={}):HybridAlignment{
 const k=opts.k??5;const denotes=denotationOf(qk,phrase);const okKinds=new Set(loadDenotationCues().compatibleKinds[denotes]??[]);
 const lex=retrieveConcepts(phrase,pool,k);const vec=opts.model?vectorRetrieve(opts.model,phrase,pool,k,!!opts.graph):[];
 const ids=[...new Set([...lex.map(c=>c.id),...vec.map(c=>c.id)])];const have=new Set(contentWords(phrase).map(stem));
 const head=contentWords(subjectHead(phrase));const H=head.length?stem(head[head.length-1]):null;const tp=typeSpan(qk,phrase);
 const sims=new Map(vec.map(v=>[v.id,v.similarity]));const pv=opts.model?textVector(opts.model,phrase):null;
 const out:HybridCandidate[]=ids.map(id=>{const c=pool.find(x=>x.id===id)!;const name=contentWords(words(c.id)).map(stem);
  const alias=(c.aliases??[]).some(a=>namedPhrases(phrase,[a]).size>0);const anchor:'alias'|'head'|null=alias?'alias':H!==null&&name.includes(H)?'head':null;
  const coverage=name.length?name.filter(w=>have.has(w)).length/name.length:0;const denotation=!c.kind||okKinds.has(c.kind);
  const tc=typeSpan(qk,[words(c.id),...(c.aliases??[])].join(' . '));
  const clash=(a:string[],b:string[])=>a.length>0&&b.length>0&&!a.some(x=>b.includes(x));
  const quantity:'compatible'|'incompatible'|'untyped'=!tp.kinds.length&&!tp.metrics.length||!tc.kinds.length&&!tc.metrics.length?'untyped':clash(tp.kinds,tc.kinds)||clash(tp.metrics,tc.metrics)?'incompatible':'compatible';
  const similarity=sims.get(id)??(pv?+cosine(pv,textVector(opts.model!,conceptDocument(c,!!opts.graph))).toFixed(4):0);
  const via=[...(lex.some(x=>x.id===id)?['lexical' as const]:[]),...(sims.has(id)?['vector' as const]:[])];
  let relation:HybridRelation;const denOk=opts.denotation===false||denotation;
  if(opts.typing!==false&&quantity==='incompatible')relation='incompatible';
  else if(anchor&&denOk&&(anchor==='alias'||coverage>=0.6))relation='identity';
  else if(anchor==='head'&&coverage<0.6)relation='narrower';
  else if(anchor&&!denotation)relation='related';
  else if(name.some(w=>have.has(w))||similarity>=(opts.relatedSimilarity??0.2))relation='related';
  else relation='none';
  return {id,relation,via,similarity,checks:{anchor,coverage:+coverage.toFixed(2),denotation,quantity}};});
 // it1: a shared name word plus the vector's clear first choice (joint lexical and distributional evidence); the
 // symbolic checks still veto. Never the vector alone.
 if(opts.anchor==='word'&&opts.model&&!out.some(x=>x.relation==='identity')){const by=[...out].sort((a,b)=>b.similarity-a.similarity);const top=by[0],next=by[1];
  if(top&&top.similarity>=(opts.minSimilarity??0.5)&&top.similarity-(next?.similarity??0)>=(opts.margin??0.05)&&top.relation!=='incompatible'){
   const c=pool.find(x=>x.id===top.id)!;const shared=contentWords(words(c.id)).map(stem).some(w=>have.has(w));
   if(shared&&(opts.denotation===false||top.checks.denotation))top.relation='identity';}}
 const idn=out.filter(x=>x.relation==='identity');
 return {concept:idn.length===1?idn[0].id:null,status:idn.length===1?'aligned':'unresolved',denotes,candidates:out};
}

// ---------------------------------------------------------------------------------------------------------------------
// 9. S95 (owner "Procedi" on the S94 proposal): explicit multi-view concept representation and a symbolic second stage.
//    MultiKE (Zhang et al. 2019): an entity is its name, its attributes and its relations, each a separate view. I-ADOPT:
//    a variable is a property (quantity) of an object of interest under constraints. Every view is derived at run time
//    from knowledge PEE already holds (quantity knowledge, property definitions, the concept graph); nothing is stored.
//    BLINK (Wu et al. 2020): retrieve with representations, then decide in a second stage that sees mention and entity
//    together; here the second stage is symbolic (clashes and anchors), never a similarity threshold alone.
export interface PropertyLike {id:string;quantity?:{kinds:readonly string[]}|null;surface:readonly (readonly [string,string])[];objectNouns?:readonly string[]}
export interface ConceptViews {id:string;kind:string|null;name:string;description:string;nameStems:string[];quantity:{kinds:string[];metrics:string[]};
 object:string[];conditions:{axis:string;value:string}[];relations:{id:string;relation:string}[];properties:string[]}
function viewsOf(qk:QuantityKnowledge,id:string,kind:string|null,name:string,description:string,relations:readonly {id:string;relation:string}[],props:readonly PropertyLike[]):ConceptViews{
 const tn=typeSpan(qk,name);const td=typeSpan(qk,description);
 const quantity={kinds:[...new Set(tn.kinds.length?tn.kinds:td.kinds)],metrics:[...new Set(tn.metrics.length?tn.metrics:td.metrics)]};
 const nameWords=contentWords(name);const qWords=new Set(nameWords.filter(w=>{const t=typeSpan(qk,w);return t.kinds.length>0||t.metrics.length>0;}).map(stem));
 const object=[...new Set(nameWords.map(stem).filter(w=>!qWords.has(w)))];
 const text=normText(name+' . '+description.split(/(?<=[.;:])\s/)[0]);
 const properties=props.filter(p=>p.surface.some(([t])=>{const n=normText(t);return n.length>=4&&hasPhrase(text,n);})&&(!quantity.kinds.length||!p.quantity?.kinds.length||p.quantity.kinds.some(k=>quantity.kinds.includes(k)))).map(p=>p.id);
 return {id,kind,name,description,nameStems:nameWords.map(stem),quantity,object,conditions:td.axes,relations:[...relations],properties};}
const viewCache=new WeakMap<object,ConceptViews>();
export function conceptViews(qk:QuantityKnowledge,c:ConceptNode,props:readonly PropertyLike[]=[]):ConceptViews{
 const hit=viewCache.get(c);if(hit)return hit;const v=conceptViews0(qk,c,props);viewCache.set(c,v);return v;}
function conceptViews0(qk:QuantityKnowledge,c:ConceptNode,props:readonly PropertyLike[]):ConceptViews{
 return viewsOf(qk,c.id,c.kind??null,[words(c.id),...(c.aliases??[])].join(' . '),(c.statement??'').replace(/\s*\[[^\]]*\]\s*$/,'').split(/(?<=[.;:])\s/)[0]??'',c.neighbors??[],props);}
export function mentionViews(qk:QuantityKnowledge,text:string,quote:string,props:readonly PropertyLike[]=[]):ConceptViews{return viewsOf(qk,'mention',null,text,quote,[],props);}
export interface MultiViewCandidate {id:string;score:number;views:Record<string,number>;checks:{quantityClash:boolean;propertyClash:boolean;differentObject:boolean;anchor:'alias'|'name_word'|'object'|null};relation:HybridRelation}
export interface MultiViewAlignment {concept:string|null;status:'aligned'|'unresolved';candidates:MultiViewCandidate[]}
export interface MultiViewOptions {k?:number;views?:'all'|'name';rerank?:boolean;margin?:number;minScore?:number;objectSimilarity?:number;
 /** it1: 'strong' needs an alias, two shared name words, or 60% of the name covered (lexical evidence the vector cannot supply) */ anchor?:'any'|'strong';
 /** it2: confirm a lexical pick: it stands only when it is the multi-view first choice and passes the clash checks */ confirm?:string|null}
export function multiViewScore(m:DistributionalModel,men:ConceptViews,c:ConceptViews,opts:MultiViewOptions={}):Pick<MultiViewCandidate,'score'|'views'|'checks'>{
 const v:Record<string,number>={};const cos=(a:string,b:string)=>a.trim()&&b.trim()?cosine(textVector(m,a),textVector(m,b)):0;
 v.name=cos(men.name,c.name);if(c.description)v.description=cos(men.name,c.description);
 const all=opts.views!=='name';
 const typed=(x:ConceptViews)=>x.quantity.kinds.length+x.quantity.metrics.length>0;
 const qa=[...men.quantity.kinds,...men.quantity.metrics],qb=[...c.quantity.kinds,...c.quantity.metrics];
 if(all&&typed(men)&&typed(c))v.quantity=qa.filter(x=>qb.includes(x)).length/new Set([...qa,...qb]).size;
 const os=opts.objectSimilarity??0.4;const objMatch=men.object.filter(w=>c.object.some(x=>x===w||wordSimilarity(m,w,x)>=os)).length;
 if(all&&men.object.length&&c.object.length)v.object=objMatch/men.object.length;
 if(all&&c.relations.length)v.relations=cos(men.description,c.relations.map(r=>words(r.relation)+' '+words(r.id)).join(' . '));
 if(all&&men.properties.length&&c.properties.length)v.property=men.properties.some(p=>c.properties.includes(p))?1:0;
 const vals=Object.values(v);const score=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
 const clash=(a:string[],b:string[])=>a.length>0&&b.length>0&&!a.some(x=>b.includes(x));
 const quantityClash=clash(men.quantity.kinds,c.quantity.kinds)||clash(men.quantity.metrics,c.quantity.metrics);
 const propertyClash=men.properties.length>0&&c.properties.length>0&&!men.properties.some(p=>c.properties.includes(p));
 const differentObject=men.object.length>0&&c.object.length>0&&objMatch===0;
 const alias=false;const shared=c.nameStems.filter(w=>men.nameStems.includes(w));const nameWord=opts.anchor==='strong'?shared.length>=2||c.nameStems.length>0&&shared.length/c.nameStems.length>=0.6:shared.length>0;
 return {score:+score.toFixed(4),views:Object.fromEntries(Object.entries(v).map(([a,b])=>[a,+b.toFixed(3)])),checks:{quantityClash,propertyClash,differentObject,anchor:alias?'alias':nameWord?'name_word':opts.anchor!=='strong'&&objMatch>0?'object':null}};}
export function alignMultiView(qk:QuantityKnowledge,m:DistributionalModel,text:string,quote:string,pool:readonly ConceptNode[],props:readonly PropertyLike[]=[],opts:MultiViewOptions={}):MultiViewAlignment{
 const men=mentionViews(qk,text,quote,props);
 const scored=pool.map(c=>{const cv=conceptViews(qk,c,props);const s=multiViewScore(m,men,cv,opts);
  const alias=(c.aliases??[]).some(a=>namedPhrases(text,[a]).size>0);if(alias)s.checks.anchor='alias';return {id:c.id,...s,relation:'none' as HybridRelation};})
  .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,opts.k??5);
 const margin=opts.margin??0.05,min=opts.minScore??0.3;
 for(const c of scored){const blocked=c.checks.quantityClash||c.checks.propertyClash||c.checks.differentObject;
  c.relation=c.checks.quantityClash||c.checks.propertyClash?'incompatible':c.score>=min*0.5||c.checks.anchor?'related':'none';void blocked;}
 let pick:MultiViewCandidate|null=null;
 if(opts.confirm!==undefined){const ok=scored.filter(c=>!c.checks.quantityClash&&!c.checks.propertyClash&&!c.checks.differentObject);
  pick=opts.confirm&&ok[0]?.id===opts.confirm?ok[0]:null;if(pick)pick.relation='identity';
  return {concept:pick?.id??null,status:pick?'aligned':'unresolved',candidates:scored};}
 if(opts.rerank===false){const [a,b]=scored;if(a&&a.score>=min&&a.score-(b?.score??0)>=margin)pick=a;}
 else{const ok=scored.filter(c=>!c.checks.quantityClash&&!c.checks.propertyClash&&!c.checks.differentObject&&c.checks.anchor);
  const [a,b]=ok;if(a&&a.score>=min&&a.score-(b?.score??0)>=margin)pick=a;}
 if(pick)pick.relation='identity';
 return {concept:pick?.id??null,status:pick?'aligned':'unresolved',candidates:scored};}
