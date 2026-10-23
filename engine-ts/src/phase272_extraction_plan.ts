/** Phase272 — scientific teaching compiled into an EXTRACTION PLAN that existing readers receive before reading
 * (owner brief 2026-10-17 §2-§4; owner memo "Memoria strategica" §4, §9).
 *
 * What a plan is: a transient research prior for ONE category, derived only from what the store already holds for it —
 * the taught outcome concepts (Phase250/252 needs with their aliases), the taught measurement concepts and conditions
 * (Phase269/271/272), and the measured_by / requires_condition / not_sufficient_for relations (Phase247). Terms are chosen
 * by their distinctiveness across the taught categories; units come from a GENERIC physical-unit lexicon, selected by the
 * dimensions the category's own measurement statements name. Nothing in this module names a category.
 *
 * What a plan is not: evidence. `isEvidence:false` is a type-level constant; a plan never enters the store, a finding is
 * only what a document states, and an expected value is never an observed one. Readers given a plan keep their generic
 * path; the exploratory pass (EXPLORATORY_UNITS272, evaluative lexicon) records what the plan did not anticipate as
 * research leads, never as findings.
 */
import {createHash} from 'node:crypto';
import type {KnowledgeStore246} from './phase246_knowledge_store.js';
import {relations247} from './phase247_category_relations.js';
import {hasPhrase,namedPhrases,normText,type QuantityKnowledge,type TypedQuantity} from './quantity_knowledge.js';

/** Generic physical / consumer units: canonical unit, dimension, and the surface forms a page may print. */
export const UNIT_LEXICON272:readonly {unit:string;dimension:string;re:string}[]=[
 {unit:'kwh',dimension:'energy',re:'kwh'},{unit:'wh',dimension:'energy',re:'wh'},
 {unit:'w',dimension:'power',re:'watts?|w'},
 {unit:'db',dimension:'sound',re:'decibels?|db\\s?\\(a\\)|dba|db'},
 {unit:'nits',dimension:'luminance',re:'nits|cd\\/m(?:2|²)'},
 {unit:'ms',dimension:'latency',re:'ms|milliseconds?'},
 {unit:'hz',dimension:'frequency',re:'hz'},
 {unit:'m3/h',dimension:'airflow',re:'m(?:3|³)\\/h(?:r|our)?'},{unit:'cfm',dimension:'airflow',re:'cfm'},
 {unit:'minutes',dimension:'duration',re:'minutes?|mins?'},{unit:'hours',dimension:'duration',re:'hours?|hrs?'},{unit:'seconds',dimension:'duration',re:'seconds?|secs?'},
 {unit:'l',dimension:'volume',re:'litres?|liters?|l'},{unit:'ml',dimension:'volume',re:'ml'},
 {unit:'kg',dimension:'mass',re:'kg'},{unit:'g',dimension:'mass',re:'g'},
 {unit:'%',dimension:'fraction',re:'%|per ?cent'},
 {unit:'°c',dimension:'temperature',re:'°\\s?c'},
 {unit:'ug/m3',dimension:'concentration',re:'(?:µg|ug|μg)\\/m(?:3|³)'},{unit:'ppm',dimension:'concentration',re:'ppm'},
];
/** Generic words that name each dimension (physics and everyday English, not any category). */
export const DIMENSION_WORDS272:Readonly<Record<string,readonly string[]>>={
 energy:['energy','kwh','electricity','consumption','metered','meter'],power:['power','watts','wattage','metered','meter'],
 sound:['noise','sound','acoustic','decibel','db','loud','quiet','audible','weighted'],luminance:['luminance','brightness','nits','hdr','sdr','window','bright'],
 latency:['lag','latency','delay','response','responsiveness'],frequency:['refresh','frequency','hz','frame'],
 airflow:['cadr','airflow','delivery','flow','changes'],duration:['time','duration','minutes','programme','cycle','timed','speed','took'],
 volume:['litres','water','volume','capacity'],mass:['weighed','weight','mass','load'],fraction:['percentage','fraction','reduction','removal','efficiency','dry'],
 temperature:['temperature','heat','thermal','core'],concentration:['concentration','particles','pm2.5','pm1','pm10','particle','ppm'],
};
const STOP=new Set(('a an the and or of to in on at for by with from as is are be been being it its this that these those than then not no nor but if when '+
 'which who whom whose what where how why all any each every both either more most less least much many such same other another own only also very '+
 'can could may might must should would will shall do does did done per via into over under after before during between about above below up down '+
 'out off again further once here there their them they we our you your he she his her i me my one two three four five six first second new used use uses using '+
 'stated state states record recorded records report reported reports keep kept include including includes given give separate separately '+
 'result results test tests tested testing method methods measured measure measures measurement measurements value values compare compared comparable '+
 'comparison condition conditions package source backed observation observations proposed principle technical hypothesis status refs ref '+
 'only valid validity named name exact actual actually real typical typically whether without within against while vs e.g eg i.e ie etc '+
 'outcome outcomes need needs user users person people product products model models consumer consumers category categories').split(' '));
const words=(s:string)=>(s.toLowerCase().replace(/\[[^\]]*\]/g,' ').replace(/\bpackage \d+\b[^.]*\./g,' ').replace(/\b(?:v\d:)?r\d{1,3}\b/g,' ')
 .match(/[a-zµμ][a-z0-9µμ.+/-]*[a-z0-9]|[a-z]/g)??[]).map(w=>w.replace(/[.]+$/,'')).filter(w=>w.length>2&&!STOP.has(w)&&!/^\d/.test(w));
export const planWords272=words;
/** Light, generic normalisation for matching (plural -s, US/UK -or/-our, -ize/-ise); never used to merge products. */
const stem=(w:string)=>w.replace(/^colo(?:u)?r/,'colour').replace(/ization/,'isation').replace(/ies$/,'y').replace(/(?<=[a-z]{3})s$/,'');
const stems=(xs:readonly string[])=>new Set(xs.map(stem));
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

export interface PlanMeasurement272 {id:string;outcomes:string[];proxyFor:string[];dimensions:string[];units:string[];terms:string[];
 conditions:{id:string;terms:string[]}[]}
export interface ExtractionPlan272 {
 schema:'pee272.extraction-plan.v1';categoryId:string;
 /** A plan guides reading; it is never evidence, never stored as a fact, never ranking input. */
 isEvidence:false;
 compiledFrom:{items:number;relations:number;digest:string};
 /** Product-identity requirement: the class nouns a product mention carries; results bind only to named products. */
 categoryNouns:string[];identity:{requireNamedSubject:true;modelCodeBindsResult:true};
 /** Consumer outcomes = qualitative dimensions to look for (terms: distinctive taught words and need phrases). */
 outcomes:{id:string;terms:string[];phrases:string[];measures:string[]}[];
 measurements:PlanMeasurement272[];
 /** Units the category's measurements are expressed in (from the generic lexicon). */
 units:string[];
 /** Declared attributes and measurements the teaching says do NOT establish an outcome (proxy warnings). */
 proxies:{ref:string;outcome:string;terms:string[]}[];
 /** Section and document structures worth examining (generic test cues plus the category's measurement terms). */
 sectionCues:string[];
 /** What would justify a consumer decision: per outcome, the establishing measurements and their required conditions. */
 decisionEvidence:{outcome:string;measures:string[];conditions:string[]}[];
}
const SECTION_CUES=['test','tests','tested','testing','performance','results','verdict','measurements','measured','how we test','lab','benchmark','in use'];

/** Compile the plan of one category from the store (deterministic; the digest names the exact knowledge used). */
export function compileExtractionPlan272(store:KnowledgeStore246,categoryId:string,categoryNouns:readonly string[],
 allCategories:readonly string[]):ExtractionPlan272{
 const items=store.categoryItems246(categoryId);const rels=relations247(store,categoryId);
 const byItem=new Map(items.map(i=>[i.itemId,i]));const ref=(r:string)=>r.startsWith('item:')?byItem.get(r.slice(5)):undefined;
 // Term distinctiveness: document frequency over the taught categories' concept texts (generic, store-derived).
 const df=new Map<string,number>();const cats=[...new Set([...allCategories,categoryId])];
 for(const c of cats){const t=new Set(store.categoryItems246(c).filter(i=>i.concept).flatMap(i=>[...words(i.statement),...i.concept!.aliases.flatMap(words),...words(i.concept!.id.replace(/_/g,' '))]));
  for(const w of t)df.set(w,(df.get(w)??0)+1);}
 const distinct=(ws:string[])=>[...new Set(ws)].filter(w=>(df.get(w)??0)<=Math.max(1,Math.floor(cats.length*0.5)));
 const outcomes=items.filter(i=>i.concept&&i.concept.kind==='outcome');
 const measures=items.filter(i=>i.concept?.kind==='measurement');
 const conditionIds=new Set(rels.filter(r=>r.kind==='requires_condition').map(r=>ref(r.to)?.concept?.id).filter((x):x is string=>!!x));
 const mOut:PlanMeasurement272[]=[];
 for(const m of measures){if(conditionIds.has(m.concept!.id))continue;
  const mine=rels.filter(r=>ref(r.from)?.itemId===m.itemId);
  const outs=[...new Set(mine.filter(r=>r.kind==='measured_by').map(r=>ref(r.to)?.concept?.id).filter((x):x is string=>!!x))];
  const prox=[...new Set(mine.filter(r=>r.kind==='not_sufficient_for').map(r=>ref(r.to)?.concept?.id).filter((x):x is string=>!!x))];
  const text=m.concept!.id.replace(/_/g,' ')+' '+m.statement;const ws=words(text);
  const dims=Object.entries(DIMENSION_WORDS272).filter(([,dw])=>dw.some(w=>ws.includes(w))).map(([d])=>d);
  const conds=mine.filter(r=>r.kind==='requires_condition').map(r=>ref(r.to)).filter((x):x is NonNullable<typeof x>=>!!x)
   .map(c=>({id:c.concept!.id,terms:distinct(words(c.concept!.id.replace(/_/g,' ')+' '+c.statement.replace(/^Condition:\s*/,''))).slice(0,8)}));
  mOut.push({id:m.concept!.id,outcomes:outs,proxyFor:prox,dimensions:dims,units:UNIT_LEXICON272.filter(u=>dims.includes(u.dimension)).map(u=>u.unit),
   terms:distinct(ws).slice(0,12),conditions:conds});
 }
 mOut.sort((a,b)=>a.id.localeCompare(b.id));
 const outIds=[...new Set(outcomes.map(o=>o.concept!.id))].sort();
 const oOut=outIds.map(id=>{const its=outcomes.filter(o=>o.concept!.id===id);const ms=mOut.filter(m=>m.outcomes.includes(id));
  const phrases=[...new Set(its.flatMap(o=>o.concept!.aliases.map(a=>a.toLowerCase())))].sort();
  return {id,phrases,measures:ms.map(m=>m.id),terms:distinct([...words(id.replace(/_/g,' ')),...its.flatMap(o=>words(o.statement))]).slice(0,14)};});
 const proxies=rels.filter(r=>r.kind==='not_sufficient_for'&&r.from.startsWith('attr:')).map(r=>({ref:r.from,outcome:ref(r.to)?.concept?.id??'',terms:words(r.from.slice(5))}))
  .sort((a,b)=>(a.ref+a.outcome).localeCompare(b.ref+b.outcome));
 const units=[...new Set(mOut.flatMap(m=>m.units))].sort();
 const plan:Omit<ExtractionPlan272,'compiledFrom'>={schema:'pee272.extraction-plan.v1',categoryId,isEvidence:false,
  categoryNouns:[...categoryNouns].map(n=>n.toLowerCase()).sort(),identity:{requireNamedSubject:true,modelCodeBindsResult:true},
  outcomes:oOut,measurements:mOut,units,proxies,sectionCues:[...SECTION_CUES,...[...new Set(mOut.flatMap(m=>m.terms.slice(0,3)))].sort()],
  decisionEvidence:oOut.map(o=>({outcome:o.id,measures:o.measures,conditions:[...new Set(mOut.filter(m=>o.measures.includes(m.id)).flatMap(m=>m.conditions.map(c=>c.id)))].sort()}))};
 return {...plan,compiledFrom:{items:items.length,relations:rels.length,digest:sha(JSON.stringify(plan))}};
}

/** Original roadmap Step 3: the digest of what a plan actually contains (every field the readers consume), computed the same
 * way as `compiledFrom.digest`, so a compiled plan's two digests agree and a plan built or edited by hand is still
 * identified by its content, never by a label it carries. */
export function planContentDigest272(plan:ExtractionPlan272):string{const {compiledFrom:_c,...content}=plan;return sha(JSON.stringify(content));}
/** The taught condition terms of a plan: a number printed directly before one ("10% window", "50% load") is a parameter
 * of the test condition, not a result. */
export function conditionTerms272(plan:ExtractionPlan272):Set<string>{
 return new Set(plan.measurements.flatMap(m=>m.conditions.flatMap(c=>c.terms)).filter(t=>/^[a-z]{4,}$/.test(t)).map(stem));
}
export const stem272=stem;
/** Regex alternation of the surface forms of the given canonical units (longest forms first). */
export function unitAlternation272(units:readonly string[]):string{
 return UNIT_LEXICON272.filter(u=>units.includes(u.unit)).map(u=>u.re).sort((a,b)=>b.length-a.length).join('|');
}
export const EXPLORATORY_UNITS272:readonly string[]=UNIT_LEXICON272.map(u=>u.unit);
/** Canonical unit of a printed unit (null: not in the generic lexicon). */
export function canonicalUnit272(printed:string):string|null{
 const p=printed.toLowerCase().trim();for(const u of UNIT_LEXICON272)if(new RegExp('^(?:'+u.re+')$','i').test(p))return u.unit;return null;
}
export const dimensionOfUnit272=(unit:string)=>UNIT_LEXICON272.find(u=>u.unit===unit)?.dimension??null;

/** Shared AFTER-reading interpretation (every arm): the taught measurement a value most plausibly reports, from its unit's
 * dimension and the measurement's distinctive terms in the value's own text. Null: no taught measurement fits. */
export function linkToMeasure272(plan:ExtractionPlan272,text:string,unit:string,opts:{outcomeless?:boolean;tieAbstains?:boolean}={}):{measureId:string;outcomes:string[]}|null{
 const d=dimensionOfUnit272(canonicalUnit272(unit)??unit);if(!d)return null;const ws=stems(words(text));const low=text.toLowerCase();
 let best:{m:PlanMeasurement272;s:number}|null=null;
 for(const m of plan.measurements){if(!m.dimensions.includes(d)||(!m.outcomes.length&&!opts.outcomeless))continue;
  const s=m.terms.filter(t=>ws.has(stem(t))||low.includes(t)).length+(DIMENSION_WORDS272[d].some(w=>ws.has(stem(w)))?1:0);
  if(s>0&&(!best||s>best.s||(s===best.s&&m.id<best.m.id)))best={m,s};}
 // S87a (opt-in): equal word evidence for two measurements chooses neither (the id's alphabetical order is not evidence)
 if(best&&opts.tieAbstains){const b=best;const tied=plan.measurements.filter(m=>m.id!==b.m.id&&m.dimensions.includes(d)&&(m.outcomes.length||opts.outcomeless)&&
  m.terms.filter(t=>ws.has(stem(t))||low.includes(t)).length+(DIMENSION_WORDS272[d].some(w=>ws.has(stem(w)))?1:0)===b.s);if(tied.length)return null;}
 return best?{measureId:best.m.id,outcomes:best.m.outcomes}:null;
}
/** Shared AFTER-reading interpretation of a qualitative clause: the taught outcome whose terms or phrases it uses. */
export function linkToOutcome272(plan:ExtractionPlan272,text:string):string|null{
 const ws=stems(words(text));const low=text.toLowerCase();let best:{id:string;s:number}|null=null;
 for(const o of plan.outcomes){const s=o.terms.filter(t=>ws.has(stem(t))).length+2*o.phrases.filter(p=>low.includes(p)).length;
  if(s>0&&(!best||s>best.s||(s===best.s&&o.id<best.id)))best={id:o.id,s};}
 return best?.id??null;
}

/** Generic English evaluative lexicon (not category-specific): polarity of a tester's judgement. */
export const EVALUATIVE272={
 positive:/\b(?:excellent|outstanding|superb|impressive(?:ly)?|impressed|great|good|well|strong(?:ly)?|effective(?:ly)?|faultless|spotless|perfect(?:ly)?|brilliant|fantastic|solid|accurate(?:ly)?|vibrant|punchy|popped|nice|lovely|quiet(?:er|est)?|fast(?:er|est)?|quick(?:er|ly)?|smooth(?:ly)?|clean(?:ed)?|crisp(?:y)?|even(?:ly)?|bright(?:er|est)?|deep|rich|clear|detailed|natural|reliabl[ey]|consistent(?:ly)?|top-notch|stellar)\b/i,
 negative:/\b(?:poor(?:ly)?|weak|struggl\w*|disappoint\w*|mediocre|bad|fail(?:ed|s)?|lacking|lacklustre|lackluster|sluggish|slow(?:er|est)?|nois(?:y|ier)|loud(?:er|est)?|inaccurate|dim(?:mer)?|uneven(?:ly)?|streak\w*|residue|wet|damp|soggy|blur\w*|judder\w*|bloom\w*|washed[- ]out|crush\w*|grainy|muddy|harsh|tinny|flaw\w*|annoying|frustrat\w*|underwhelm\w*|worse|worst)\b/i,
 negators:/\b(?:not|never|no|hardly|n't|without)\b(?:\s+\w+){0,2}\s*$/i,
};
/** Polarity of one clause: positive, negative, mixed or null (no evaluation). A negator flips the term it precedes. */
export function polarity272(clause:string):'positive'|'negative'|'mixed'|null{
 let pos=0,neg=0;
 for(const [re,sign] of [[EVALUATIVE272.positive,1],[EVALUATIVE272.negative,-1]] as const){
  for(const m of clause.matchAll(new RegExp(re.source,'gi'))){const before=clause.slice(Math.max(0,m.index!-24),m.index!);
   const s=EVALUATIVE272.negators.test(before)?-sign:sign;if(s>0)pos++;else neg++;}}
 if(!pos&&!neg)return null;return pos&&neg?'mixed':pos?'positive':'negative';
}
/** Generic cues that a value is a declaration or a claim, not the tester's result. */
/** A certification or standards body (moved from document_semantics.ts in S86c so the prose reader shares it): a value its
 * clause attributes to one is a certified or quoted rating, not the tester's own result. */
export const DECLARED_BODY272=/\b(?:AHAM|ANSI|ISO|IEC|ENERGY STAR|UL|CE)\b/;
export const DECLARATION_CUE272=/\b(?:claim(?:s|ed)?|rated|rating of|label(?:led)?|advertis\w*|certified|official(?:ly)?|spec(?:ification)?s?|manufacturer|according to|promises?|quoted|says? (?:it|the)|listed)\b/i;
/** Generic cues that a document reports first-hand testing (sentence- or document-level). */
// audit S77 (A1-13): first-person measurement with an instrument or unit under test ("our sound meter showed", "I left it to
// cook", "our unit pulled") is a test context as well
export const TEST_CONTEXT272=/\b(?:(?:we|i) (?:tested|ran|used|measured|recorded|timed|put|tried|found|benchmarked|bought|left|set|got|saw|noticed|cooked|weighed|metered|logged|clocked|heard)|(?:our|my) (?:test(?:s|ing)?|lab|team|test team|testing|unit|sample|review unit|sensor|meter|sound meter|power meter|energy meter|thermometer|readings?|measurements?)|in (?:our |my )?tests?\b|during (?:our |my )?test(?:s|ing)|in testing|hands-on|test room|test bench|for (?:over )?a (?:week|month))\b/i;
/** A value that is an endpoint of a range or a bound is never a result ("0.7 to 0.8kWh", "less than 8 litres", "from 40.2 to 63.5 dBA"). */
export function rangeOrBound272(line:string,at:number,end:number):boolean{
 const before=line.slice(Math.max(0,at-22),at),after=line.slice(end,end+14);
 return /\b(?:less than|more than|under|over|up to|at least|at most|around|about|approximately|roughly|from|sub|below|above|nearly|almost)\s*-?\s*$/i.test(before)||/^\s*(?:to|–|-|and)\s*\d/i.test(after)||/\d\s*(?:to|–|-)\s*$/.test(before);
}

// ---------------------------------------------------------------------------------------------------------------------
// GK (2026-10-18): taught measurements typed by the quantity knowledge, and a typed link from a value to them. The
// word-overlap link above (linkToMeasure272) stays unchanged; this one consults what the knowledge says the value IS.
/** What a taught measurement measures, read from its id and statement with the quantity knowledge: the metrics it names
 * (CADR) and the quantity kinds it names (sound pressure, sound power, air changes). Empty: the knowledge cannot type it. */
export interface TypedMeasure272 {id:string;outcomes:string[];metrics:string[];kinds:string[];ratio?:{numerator:string[];denominator:string[]}}
export function typedMeasures272(store:KnowledgeStore246,categoryId:string,plan:ExtractionPlan272,qk:QuantityKnowledge):TypedMeasure272[]{
 const st=new Map(store.categoryItems246(categoryId).filter(i=>i.concept?.kind==='measurement').map(i=>[i.concept!.id,i.statement]));
 // The teaching's name of a measurement says what it measures; its statement is read only when the name says nothing.
 // Only metric names and kind discriminators count: generic words ("pressure" inside "sound pressure", "load") do not.
 // In the concise name every quantity word counts; in the longer statement only discriminators do. "A per B" in a name
 // is a ratio when B is itself a quantity ("energy per litre"), a reporting basis when it is not ("energy per task").
 const read=(text:string,strict:boolean)=>{const words=(k:typeof qk.pack.kinds[number])=>[...(k.discriminators??[]),...(strict?[]:k.terms)];
  const named=namedPhrases(text,[...qk.pack.metrics.flatMap(x=>x.terms),...qk.pack.kinds.flatMap(words)]);const has=(t:string)=>named.has(normText(t));
  return {metrics:qk.pack.metrics.filter(x=>x.terms.some(has)).map(x=>x.id),kinds:qk.pack.kinds.filter(k=>words(k).some(has)).map(k=>k.id)};};
 return plan.measurements.map(m=>{const name=m.id.replace(/_/g,' ');const per=/^(.+?) per (.+)$/.exec(name);
  if(per){const a=read(per[1],false),b=read(per[2],false);if(b.kinds.length&&a.kinds.length)return {id:m.id,outcomes:m.outcomes,metrics:a.metrics,kinds:[],ratio:{numerator:a.kinds,denominator:b.kinds}};
   if(a.kinds.length||a.metrics.length)return {id:m.id,outcomes:m.outcomes,metrics:a.metrics,kinds:a.kinds};}
  const byId=read(name,false);const r=byId.metrics.length||byId.kinds.length?byId:read(st.get(m.id)??'',true);
  return {id:m.id,outcomes:m.outcomes,metrics:r.metrics,kinds:r.kinds};});
}
export interface TypedLink272 {measureId:string|null;outcomes:string[];candidates:string[];proxyFor:string[];basis:string}
/** Link a typed value to the taught measurement it reports. A value whose metric the knowledge declares not equivalent to
 * a measurement's metric (fan airflow vs CADR) never links to it; a value named by a taught proxy (attr:rated airflow) is
 * reported as a proxy for that outcome; an unresolved kind links only when every candidate kind leads to one measurement. */
/** S87a options (OFF by default; the readers keep the earlier behaviour):
 *  - outcomeless: a taught measurement with no taught outcome is still a measurement; a value reporting it links to it
 *    (with no outcome) instead of being forced onto a sibling that has one;
 *  - scale: a measurement taught "per N units" (N > 1: "kWh per 100 eco cycles") is reported only by a value whose words
 *    state the same N; a per-cycle value never links to a per-100-cycles measurement;
 *  - tieAbstains: when the words support two measurements equally, the link abstains (earlier: alphabetical order chose). */
export interface LinkOptions272 {outcomeless?:boolean;scale?:boolean;tieAbstains?:boolean}
/** "per 100 eco cycles" in a measurement's name: the scale N (> 1) and its unit words; null when the name has none. */
export function measureScale272(id:string):{n:number;of:string}|null{const m=/(?:^|_)per_(\d+)_([a-z_]+)$/.exec(id);const n=m?Number(m[1]):0;return m&&n>1?{n,of:m[2]!.replace(/_/g,' ')}:null;}
export function linkTypedToMeasure272(plan:ExtractionPlan272,measures:readonly TypedMeasure272[],q:TypedQuantity,text:string,qk:QuantityKnowledge,opts:LinkOptions272={}):TypedLink272{
 const scaleOk=(m:TypedMeasure272)=>{if(!opts.scale)return true;const sc=measureScale272(m.id);return !sc||new RegExp(`\\bper\\s+${sc.n}\\b|\\b${sc.n}\\s+(?:\\w+\\s+)?(?:cycles?|uses?|runs?|loads?|washes?|hours?|days?|years?)\\b`,'i').test(text);};
 const proxyFor=[...new Set(plan.proxies.filter(p=>hasPhrase(text,p.ref.slice(5).replace(/_/g,' '))).map(p=>p.outcome).filter(Boolean))].sort();
 const kinds=q.kind.id?[q.kind.id]:q.kind.candidates;const metric=q.metric.id;
 const blocked=new Set(metric?qk.metrics.get(metric)!.notEquivalentTo??[]:[]);
 // a ratio measurement ("energy per litre") is reported only by a value whose unit has the ratio's dimension (or its inverse)
 const dimOf=(ks:string[])=>ks.map(k=>qk.kinds.get(k)!.dim);
 const ratioFits=(m:TypedMeasure272)=>{if(!m.ratio)return true;const u=q.unit.dim;const eq=(x:Record<string,number|undefined>,y:Record<string,number|undefined>)=>[...new Set([...Object.keys(x),...Object.keys(y)])].every(k=>(x[k]??0)===(y[k]??0));
  return dimOf(m.ratio.numerator).some(n=>dimOf(m.ratio!.denominator).some(d=>{const r:Record<string,number>={},inv:Record<string,number>={};for(const k of new Set([...Object.keys(n),...Object.keys(d)])){r[k]=(n[k]??0)-(d[k]??0);inv[k]=-r[k];}return eq(u,r)||eq(u,inv);}));};
 const fits=measures.filter(m=>(m.outcomes.length||opts.outcomeless)&&scaleOk(m)&&ratioFits(m)&&(m.ratio?true:!m.metrics.some(x=>blocked.has(x))&&(
  metric&&m.metrics.length?(m.metrics.includes(metric)&&(!m.kinds.length||m.kinds.some(k=>kinds.includes(k))))
        :(m.kinds.some(k=>kinds.includes(k))||(!m.kinds.length&&m.metrics.some(x=>kinds.includes(qk.metrics.get(x)!.kind))&&!m.metrics.some(x=>qk.metrics.get(x)!.notEquivalentTo?.length))))));
 if(metric&&blocked.size&&!fits.length)return {measureId:null,outcomes:[],candidates:[],proxyFor,basis:`${metric} is not equivalent to ${[...blocked].join(', ')}: no taught measurement reports it`};
 if(!fits.length)return {measureId:null,outcomes:[],candidates:[],proxyFor,basis:'no taught measurement measures this quantity'};
 const restricted={...plan,measurements:plan.measurements.filter(m=>fits.some(f=>f.id===m.id))};
 const unitCanon=canonicalUnit272(q.unit.surface)??q.unit.surface;
 const byWords=linkToMeasure272(restricted,text,unitCanon,{outcomeless:opts.outcomeless,tieAbstains:opts.tieAbstains});
 const ids=fits.map(f=>f.id);
 // words never settle what the knowledge leaves open: an unresolved kind with candidates of different kinds abstains
 if(!q.kind.id&&new Set(fits.map(f=>f.kinds.filter(k=>kinds.includes(k)).join('+'))).size>1)return {measureId:null,outcomes:[],candidates:ids,proxyFor,basis:`the value's kind is unresolved (${kinds.join(' or ')}) and the candidates measure different kinds`};
 if(byWords)return {measureId:byWords.measureId,outcomes:byWords.outcomes,candidates:ids,proxyFor,basis:'typed candidates, chosen by the measurement words'};
 // KN: a plain dimensionless number (a percentage, ppm) names no physical quantity by itself: without its metric or the
 // measurement's words it is not linked ("100% warranty" is not a gas-removal result). Levels keep their kinds.
 const bare=!metric&&kinds.length>0&&kinds.every(k=>{const d=qk.kinds.get(k)!;return d.unitOnly&&!d.level&&!Object.keys(d.dim).length;});
 if(bare){const named=restricted.measurements.filter(m=>m.terms.some(t=>hasPhrase(text,t)));
  if(named.length===1)return {measureId:named[0].id,outcomes:named[0].outcomes,candidates:ids,proxyFor,basis:'a dimensionless value, linked by the measurement words'};
  return {measureId:null,outcomes:[],candidates:ids,proxyFor,basis:'a dimensionless value without its metric or measurement words identifies no measurement'};}
 if(fits.length===1)return {measureId:fits[0].id,outcomes:fits[0].outcomes,candidates:ids,proxyFor,basis:'the only taught measurement of this quantity'};
 return {measureId:null,outcomes:[],candidates:ids,proxyFor,basis:'several taught measurements of this quantity; the words do not choose'};
}
