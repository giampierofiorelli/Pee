/** Phase269 pilot — structured, attributable QUALITATIVE observations from a tester's own cooking tests (Decision 4).
 *
 * What it produces: PEE-authored codes only (dish, outcome, direction, strength, whether the tester changed the setting,
 * comparative or not) plus the hash of the source block. No sentence, adjective or passage of the review is kept, and no
 * number is invented: "mostly crisp skin" stays a hedged positive crispness observation, never a score.
 *
 * What it is not: a laboratory measurement, an independent finding, or ranking input. Under pee249-factual-observations-v1
 * an independent_original_test source retains measurement kinds only, so these codes are NOT retained in the operational
 * store; the pilot keeps them in the private evaluation directory and the Phase269 report proposes the amendment needed.
 * Method descriptions ("I note how crispy ...") are what a tester looks at, not what they found, and are skipped.
 */
import {createHash} from 'node:crypto';
import {textBlocks225} from './phase225_transient_test_probe.js';
import {applianceMentions270,documentSubjects271,type ApplianceClass270} from './phase270_comparative_results.js';
import {linkToOutcome272,polarity272,planWords272,TEST_CONTEXT272,DECLARATION_CUE272,type ExtractionPlan272} from './phase272_extraction_plan.js';

export type QualOutcome269='crispness'|'browning'|'evenness'|'doneness'|'moisture'|'noise';
export interface QualitativeObservation269 {
 dish:string;
 /** Phase272: 'taught_dimension' when a plan-guided clause names a taught outcome of the category (see dimension272). The
  * store's Phase270 amendment keeps only the five cooking codes; any other observation is withheld at ingest. */
 outcome:QualOutcome269|'taught_dimension';direction:'positive'|'negative'|'mixed';strength:'explicit'|'hedged';
 settingAdjusted:boolean;comparative:boolean;basis:'first_person_cooking_test'|'first_hand_test_context';blockSha256:string;blockIndex:number;
 /** Phase272: the taught outcome id the clause is about (plan-guided observations only). */
 dimension272?:string;
 /** Phase270: the appliance the clause attributes the outcome to (null: the page's tested product, not stated). */
 appliance:ApplianceClass270|null;
 /** Phase270: the dish came from the section heading, not from the sentence. */
 dishFromHeading:boolean;
 /** Phase271: the tested product the observation is about when the document attributes it (a result-table row resolved by
  * the document's own appliance list, or a section headed by a product name); null: the page's own product. */
 subject:{name:string;model:string|null}|null;
 /** Phase271: 'table_cell' (a short graded cell of a result table) or 'prose'. */
 form:'prose'|'table_cell';
 independentFinding:false;laboratoryMeasurement:false;rankingInput:false;
}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
// Phase271 additions from the development documents (Which?: cake; CHOICE and TechRadar AF300: sausages; lovemoney: bacon).
const DISH:readonly [string,RegExp][]=[['hash_browns',/\bhash ?browns?\b/],['chips',/\b(?:chips|fries)\b/],['chicken',/\b(?:chicken|drumsticks?|wings?)\b/],
 ['cakes',/\b(?:cakes?|sponge)\b/],['sausages',/\bsausages?\b/],['bacon',/\bbacon\b/],['apple_pie',/\bpies?\b/],['pizza',/\bpizzas?\b/],['vegetables',/\bvegetables?\b/],['potatoes',/\bpotato(?:es)?\b/]];
// Outcome terms: [outcome, positive pattern, negative pattern]. Negation flips ("not soggy", "not as pale").
const TERMS:readonly [QualOutcome269,RegExp,RegExp][]=[
 ['crispness',/\bcrisp(?:y|ier|iest|ness)?\b|\bcrunch(?:y)?\b/,/\bsoggy\b|\bsoft (?:outside|exterior)\b/],
 ['browning',/\bgolden\b|\bbrown(?:ed|ing)?\b/,/\bpale\b|\bburn(?:t|ed|ing)?\b|\bcharred\b/],
 ['evenness',/\bevenly\b|\beven (?:browning|colour|color|cooking)\b|\bconsistently\b/,/\buneven(?:ly)?\b/],
 ['doneness',/\bcooked through\b|\bclear juices\b|\bno pink\b|\bperfectly cooked\b/,/\bundercooked\b|\bstill raw\b|\bpink (?:inside|in the middle)\b/],
 ['moisture',/\bjuicy\b|\bmoist\b|\bfluffy inside\b/,/\bdried out\b|\bdry\b/],
 // Phase271 (development: Expert Reviews "the rather loud fan"): operating noise of the appliance, not of a beep or alarm.
 ['noise',/\bquiet(?:er|est)?\b/,/\bloud\b|\bnoisy\b/]];
const NOISE_CONTEXT=/\b(?:fan|in operation|operat\w*|running|runs|machine|appliance|noise|whirr\w*|hum\w*)\b/;const ALARM=/\b(?:beeps?|alarm|chimes?|notification|reminder)\b/;
const PRODUCT_HEADING=/^(?:\d{1,2}[.)]\s*)?([A-Z][\w'&+-]*(?:\s+[\w.'&+/()-]+){1,9})$/;
const CATEGORY_WORD=/\b(?:air[- ]?fryers?|fryers?|ovens?|grills?)\b/i;const MODEL_WORD=/\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,}\b/;
const HEDGE=/\b(?:mostly|most (?:\w+ ){0,3}not all|light|lightly|small amounts? of|slightly|a little|only just|not all)\b/;
const MIXING=/\b(?:most (?:\w+ ){0,3}not all|light|lightly|small amounts? of|only just|not all)\b/;
const FIRST_PERSON=/\b(?:I|we) (?:cooked|made|tested|started by|tried|used|could cook|air[- ]fried|baked|roasted)\b|\bour tests?\b/i;
const METHOD=/\b(?:I (?:note|will|'ll)|I’ll|first thing I do|my go-to|go-to setting|is ideal|I always|usually)\b/i;
const ADJUST=/\b(?:added (?:on )?another|raised|lowered|extended|an extra|another \d+ minutes)\b/;
const COMPARE=/\b(?:better|worse) (?:\w+ ){0,3}than\b|\bthe (?:oven|air fryer) (?:\w+ )?had\b|\bmore (?:even|crisp)/;

/** Phase272: an evaluative clause no taught outcome covers, in a first-hand test context: a RESEARCH LEAD (its first content
 * words as a short regex-bounded term, no sentence), never an observation. */
export interface QualitativeLead272 {term:string;direction:'positive'|'negative'|'mixed';blockSha256:string;blockIndex:number;
 subject:{name:string;model:string|null}|null;status:'exploratory_research_lead'}
const CONTRAST272=/,?\s+(?:but|while|whereas|although|though|however|yet)\s+|;\s*/i;
const HEDGE272=/\b(?:mostly|slightly|a little|fairly|quite|somewhat|reasonably|relatively|generally|largely|a touch|a bit)\b/i;
/** Phase272 guided + exploratory qualitative pass (generic: the plan supplies the outcomes, a generic evaluative lexicon the
 * polarity). Reads prose and short cells in a document that reports first-hand testing; a clause contrasting two outcomes
 * gives two observations; adjectives are never turned into scores. */
function guidedQualitative272(html:string,plan:ExtractionPlan272|undefined,exploratory:boolean,mentions:readonly {name:string;model:string}[],
 page:{name:string;model:string|null}|null):{observations:QualitativeObservation269[];leads:QualitativeLead272[]}{
 const {blocks,tags=[]}=textBlocks225(html,{withTags:true,maxBlocks:1500});const obs:QualitativeObservation269[]=[];const leads:QualitativeLead272[]=[];
 if(!blocks.some(b=>TEST_CONTEXT272.test(b)||FIRST_PERSON.test(b)))return {observations:obs,leads};
 const seen=new Set<string>();let section:{name:string;model:string|null}|null=null;
 const subjectOf=(text:string)=>{if(mentions.length<2)return null;const hit=mentions.filter(m=>new RegExp('\\b'+m.model.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(text));return hit.length===1?{name:hit[0].name,model:hit[0].model}:null;};
 blocks.forEach((block,bi)=>{const tag=tags[bi]??'';
  // A heading naming one product opens its section; a comparative heading ("louder than X") opens none.
  if(/^h[1-4]$/.test(tag)){const s1=/\b(?:than|vs\.?|versus|compared|like)\b/i.test(block)?null:subjectOf(block);section=s1??(mentions.length>1?null:section);return;}
  if(block.length<25||block.length>1400||/^(?:by|share|sign up|subscribe|related|read more)\b/i.test(block))return;
  for(const sent of block.split(/(?<=[.!?])\s+(?=[A-Z“"])/)){if(DECLARATION_CUE272.test(sent)&&!TEST_CONTEXT272.test(sent))continue;
   for(const clause of sent.split(CONTRAST272)){if(clause.length<12)continue;
    const dir=polarity272(clause);if(!dir)continue;const subject=subjectOf(clause)??section??page;
    const dim=plan?linkToOutcome272(plan,clause):null;
    if(dim){const key=[dim,dir,subject?.name??''].join('|');if(seen.has(key))continue;seen.add(key);
     obs.push({dish:'general',outcome:'taught_dimension',dimension272:dim,direction:dir,strength:HEDGE272.test(clause)?'hedged':'explicit',settingAdjusted:false,comparative:/\b(?:than|compared)\b/i.test(clause),
      basis:'first_hand_test_context',blockSha256:sha(block),blockIndex:bi,appliance:null,dishFromHeading:false,subject,form:tag==='td'?'table_cell':'prose',
      independentFinding:false,laboratoryMeasurement:false,rankingInput:false});}
    else if(exploratory){const term=planWords272(clause).slice(0,2).join(' ');if(!term)continue;const key=['x',term,dir,subject?.name??''].join('|');if(seen.has(key))continue;seen.add(key);
     leads.push({term,direction:dir,blockSha256:sha(block),blockIndex:bi,subject,status:'exploratory_research_lead'});}
   }}
 });
 return {observations:obs,leads};
}
/** Observations in one transient page; the page must state its own cooking tests in the first person.
 * Phase272: with `plan` (compiled from the store before reading) the guided pass adds taught-dimension observations; with
 * `exploratory` it returns research leads for evaluations no taught outcome covers. Without options: the Phase271 reader. */
export function qualitativeObservations269(html:string,opts:{plan?:ExtractionPlan272;exploratory?:boolean;mentions?:readonly {name:string;model:string}[];
 page?:{name:string;model:string|null}|null}={}):{observations:QualitativeObservation269[];blocksRead:number;leads272?:QualitativeLead272[]}{
 if(opts.plan||opts.exploratory){const base=qualitativeObservations269(html);const g=guidedQualitative272(html,opts.plan,!!opts.exploratory,opts.mentions??[],opts.page??null);
  return {observations:[...base.observations,...g.observations],blocksRead:base.blocksRead,...(opts.exploratory?{leads272:g.leads}:{})};}
 // Phase270: read past navigation-heavy page heads (the CHOICE page's article starts after block 500) and keep headings.
 const {blocks,tags=[]}=textBlocks225(html,{withTags:true,maxBlocks:1500});const out:QualitativeObservation269[]=[];const seen=new Set<string>();
 let headingDish:string|null=null;
 // Phase271: the first-person gate also accepts the development documents' own wording ("We could cook", "I used my smart
 // meter", "our tests").
 const firstPerson=blocks.some(b=>FIRST_PERSON.test(b));
 if(!firstPerson)return {observations:[],blocksRead:blocks.length};
 const named=documentSubjects271(html);
 const rowSubject=(cls:ApplianceClass270|null)=>{const n=cls?named.get(cls)??[]:[];return n.length===1?{name:n[0].name,model:n[0].model}:null;};
 let section:{name:string;model:string|null}|null=null;
 blocks.forEach((block,bi)=>{
  if(/^h[2-4]$/.test(tags[bi]??'')){const low=block.toLowerCase();headingDish=DISH.find(([,re])=>re.test(low))?.[0]??null;
   // Phase271: a heading that names a product (a category word or a model code) opens that product's section.
   const ph=PRODUCT_HEADING.exec(block.trim());section=ph&&(CATEGORY_WORD.test(block)||MODEL_WORD.test(block))&&!DISH.some(([,re])=>re.test(low))?{name:ph[1].trim(),model:MODEL_WORD.exec(block)?.[0]??null}:headingDish?section:null;return;}
  if(block.length<60||METHOD.test(block)||!/\b(?:I|we|my)\b/i.test(block)&&!/\b(?:came out|emerged|turned out|were|was)\b/.test(block))return;
  let dish:string|null=null;let adjusted=false;let fromHeading=false;
  for(const sent0 of block.split(/(?<=[.!?])\s+/)){
   const whole=sent0.toLowerCase();
   for(const [d,re] of DISH)if(re.test(whole)){dish=d;fromHeading=false;break;}
   if(!dish&&headingDish){dish=headingDish;fromHeading=true;}
   if(ADJUST.test(whole))adjusted=true;
   // Phase271: operating noise needs no dish ('general'); every other outcome needs one.
   if(!dish&&!(TERMS.at(-1)![1].test(whole)||TERMS.at(-1)![2].test(whole)))continue;
   // Phase270: a contrast ("the oven pie had slight burning, while the air fryer pie had a better crust") is two clauses,
   // each with its own appliance and outcome.
   for(const sent of whole.split(/,?\s+(?=\b(?:while|whereas)\b)/)){
   const app=applianceMentions270(sent);const appliance=app.length?app[0].cls:null;
   const noiseOnly=!dish;
   for(const [outcome,pos,neg] of TERMS){
    if(outcome==='noise'&&(!NOISE_CONTEXT.test(sent)||ALARM.test(sent)))continue;
    if(outcome!=='noise'&&noiseOnly)continue;
    const d=dish??'general';const subject=section??(appliance?rowSubject(appliance):null);
    const p=pos.exec(sent),n=neg.exec(sent);if(!p&&!n)continue;
    const negated=(m:RegExpExecArray|null)=>!!m&&/\bnot (?:as |too |very )?$/.test(sent.slice(Math.max(0,m.index-12),m.index));
    let direction:'positive'|'negative'|'mixed';
    const posHit=(p&&!negated(p))||(n&&negated(n)),negHit=(n&&!negated(n))||(p&&negated(p));
    if(posHit&&negHit)direction='mixed';else if(posHit)direction='positive';else direction='negative';
    // Phase269 (after the pilot's first run): a hedge qualifies the term it precedes within its clause ("crisp and not
    // soggy, while most but not all had golden corners" hedges the browning, not the crispness).
    const at=(p&&!negated(p)?p:n??p)!.index;const clause=sent.slice(0,at).split(/,|;| while | but | whereas /).pop()!+sent.slice(at,at+12);
    const hedged=HEDGE.test(clause);if(direction==='positive'&&MIXING.test(clause))direction='mixed';
    const key=[d,outcome,direction,adjusted,appliance,subject?.name??''].join('|');if(seen.has(key))continue;seen.add(key);
    out.push({dish:d,outcome,direction,strength:hedged?'hedged':'explicit',settingAdjusted:adjusted,comparative:COMPARE.test(whole),basis:'first_person_cooking_test',
     blockSha256:sha(block),blockIndex:bi,appliance,dishFromHeading:fromHeading,subject,form:'prose',independentFinding:false,laboratoryMeasurement:false,rankingInput:false});
   }
   }
  }
 });
 // Phase271 (development: the Which? result tables): a graded quality column ("5* Juicy, flavoursome meat with a crispy
 // brown skin") is the tester's finding for that row's appliance and the table's dish; short cells are read here.
 for(const t of html.matchAll(/<table\b[\s\S]{0,40000}?<\/table>/gi)){
  const rows=[...t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(r=>[...r[0].matchAll(/<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(c=>textBlocks225(`<p>${c[2]}</p>`).blocks.join(' ')));
  const hi=rows.findIndex(r=>r.some(c=>/\b(?:quality|result|verdict|performance)\b/i.test(c)));if(hi<0)continue;
  const qc=rows[hi].findIndex(c=>/\b(?:quality|result|verdict|performance)\b/i.test(c));
  const before=html.slice(Math.max(0,t.index!-6000),t.index!);const hs=[...before.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
  const ht=hs.length?textBlocks225(`<p>${hs.at(-1)![1]}</p>`).blocks.join(' ').toLowerCase():'';const dish=DISH.find(([,re])=>re.test(ht))?.[0]??null;if(!dish)continue;
  for(const r of rows.slice(hi+1)){const cell=(r[qc]??'').toLowerCase();if(cell.length<8)continue;const app=applianceMentions270(r[0]??'');const appliance=app.length===1?app[0].cls:null;
   // The whole cell is one finding: "some cooked perfectly, but some … undercooked" is mixed, not two findings.
   for(const part of [cell]){
    for(const [outcome,pos,neg] of TERMS){if(outcome==='noise')continue;const p=pos.exec(part),n=neg.exec(part);if(!p&&!n)continue;
     const negated=(m:RegExpExecArray|null)=>!!m&&/\bnot (?:as |too |very )?$/.test(part.slice(Math.max(0,m.index-12),m.index));
     const posHit=(p&&!negated(p))||(n&&negated(n)),negHit=(n&&!negated(n))||(p&&negated(p));
     let direction:'positive'|'negative'|'mixed'=posHit&&negHit?'mixed':posHit?'positive':'negative';
     const hedged=HEDGE.test(part);if(direction==='positive'&&MIXING.test(part))direction='mixed';
     const subject=appliance?rowSubject(appliance):null;const key=['t',dish,outcome,direction,appliance,subject?.name??''].join('|');if(seen.has(key))continue;seen.add(key);
     out.push({dish,outcome,direction,strength:hedged?'hedged':'explicit',settingAdjusted:false,comparative:false,basis:'first_person_cooking_test',blockSha256:sha(r.join('|')),blockIndex:-1,
      appliance,dishFromHeading:true,subject,form:'table_cell',independentFinding:false,laboratoryMeasurement:false,rankingInput:false});}
   }
  }
 }
 return {observations:out,blocksRead:blocks.length};
}
