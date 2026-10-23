/** Phase125 — transparent, schema-guided compositional query hypothesis.
 * Internal TypeScript; no remote parser, semantic truth oracle or ranking authority.
 * All category facts/aliases are caller-supplied reviewed schema, not product evidence.
 * This is a conservative scoped recognizer, NOT open-domain language understanding.
 */
import {createHash} from 'node:crypto';
import type {Context122} from './phase122_native_question_to_research.js';
import type {NativeModel123} from './phase123_native_learned_intent.js';
import {attemptResearch124,type CuratedAnchor124,type EndToEndAttempt124} from './phase124_end_to_end_attempt.js';
import {searchInternalPassages122,type IndexedPassage122} from './phase122_native_local_retrieval.js';
import type {ResearchPlan122} from './phase122_native_question_to_research.js';

export type Goal125='performance'|'value'|'autonomy'|'capability_discovery';
export type Scope125='general'|'personal';
export type Modifier125='required'|'excluded'|'environment'|'environment_absent'|'requested_capability';
export type FrameStatus125='candidate_needs_evidence'|'requires_semantic_review'|'requires_context';
export interface SchemaAspect125 {id:string; aliases:readonly string[];kind:'task'|'environment'|'capability';
 /** Describes a search goal, not evidence that a product implements it. */
 evidenceKeys:readonly string[];}
export interface CategorySchema125 {id:string; aliases:readonly string[]; aspects:readonly SchemaAspect125[];schemaReviewId:string;}
export interface DialogueState125 {categoryId?:string;categoryVerified?:boolean;
 /** Candidates must come from a previously grounded, explicitly presented set. */
 candidates?:readonly string[]; candidatesVerified?:boolean;
 /** A confirmed previous goal may be inherited but is never silently invented. */
 confirmedGoals?:readonly Goal125[];
 /** Context is scoped to this explicit state; arbitrary user history is forbidden. */
 contextTurnId?:string;
}
export interface AspectFinding125 {aspectId:string;role:Modifier125;source:'current_turn';
  matchedText:string;evidenceKeys:readonly string[];}
export interface Composition125 {phase:125;questionSha256:string;categoryId:string|null;
  categoryFrom:'explicit'|'verified_context'|'unresolved';goals:readonly Goal125[];
  scope:Scope125;aspects:readonly AspectFinding125[];
  /** Conditions are not evidence that products work under those conditions. */
  userBudget: {currency:string;min:number|null;max:number|null}|null;
  candidateIds:readonly string[];candidateReference:'verified_context'|'none'|'unresolved';
  unknownCapabilitySpans:readonly string[];hazards:readonly string[];status:FrameStatus125;
  evidenceObligations:readonly string[];interpretationConfirmed:false;
  sourceMeasurementsVerified:false;rankingAuthorized:false;
}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[’‘]/g,"'").replace(/[^a-z0-9$€£]+/g,' ').replace(/\s+/g,' ').trim();
const found=(s:string,p:string)=>(' '+s+' ').includes(' '+norm(p)+' ');
const matchAny=(s:string,a:readonly string[])=>a.some(p=>found(s,p));
function unique<T>(values:readonly T[]):T[]{return [...new Set(values)];}
const idOk=(s:string)=>/^[a-z][a-z0-9_]{0,80}$/.test(s);
export function validateSchema125(schema:CategorySchema125):void{
 if(!schema||!idOk(schema.id)||!schema.schemaReviewId||
    !Array.isArray(schema.aliases)||!schema.aliases.length||schema.aliases.length>50||
    !Array.isArray(schema.aspects)||schema.aspects.length>150||
    schema.aspects.some((a:SchemaAspect125)=>!idOk(a.id)||!['task','environment','capability'].includes(a.kind)||
      !a.aliases.length||a.aliases.length>40||a.aliases.some((x:string)=>!x||x.length>120)||
      a.evidenceKeys.some((x:string)=>!idOk(x)))||
    new Set(schema.aspects.map(x=>x.id)).size!==schema.aspects.length)
    throw Error('invalid_reviewed_category_schema');
}
const goalCues:Record<Goal125,readonly string[]>={
 capability_discovery:['are there any','is there any','find me','looking for','trovami','trova','cerco','capace di','in grado di','can a robot'],
 performance:['best','better','miglior','migliore','migliori','recommend','raccomand','consigli','choose','sceglieresti'],
 value:['value','value for money','value-for-money','qualita prezzo','quality price','bang for the buck','conveniente','cost effective'],
 autonomy:['less maintenance','least maintenance','maintenance free','maintenance-free','hands free',
  'set it and forget it','autonom','unattended','human intervention','interventi umani',
  'intervento umano','meno interventi','manutenzione','low maintenance','minimum upkeep']};
const genericPronouns=['which one','which of these','which of them','between these','fra questi','tra questi','quale dei due','quale sceglieresti','quale prenderesti','which would you choose'];
const personalCues=['my home','my house','my apartment','mia casa','mio appartamento','casa mia',
 'i have','ho','for pet','pet hair','cat litter','animali','gatti','cani','carpets','carpet',
 'moquette','tappeti','soglie','my budget','budget','square feet','mq','m2','piani'];
const negationCues=['without','does not have','does not include','do not want','dont want','no mopping','no washing',
 'senza','non voglio','non deve avere','non abbia','escludi','exclude','must not have','no mop'];
const uncertainNegation=['not sure','non so se','dont know if','might not need','non mi serve','dont need'];
const strongNegative=['without','does not have','does not include','do not want','dont want','senza','non voglio',
 'non deve avere','non abbia','exclude','escludi','must not have','no mopping','no washing','no mop'];
const modalUncertainty=['maybe','perhaps','forse','eventualmente','might','not sure','non so'];
const discourseJoiners=['and','e','also','anche','plus','oltre','or','oppure'];
const valueSuppressors=['best value','best value for money','best quality price','miglior qualita prezzo','migliore qualita prezzo'];
function wholeSpan(t:string,cues:readonly string[]):boolean{return matchAny(t,cues);}
function roleFor(t:string,aspect:SchemaAspect125,idx:number,lastOtherAspectEnd:number):Modifier125{
  // An earlier negation cannot cross a previously mentioned feature.
  const left=t.slice(Math.max(0,idx-65,lastOtherAspectEnd),idx);
  const tail=left.split(/\b(?:and|e|but|ma|however|pero|oppure|or)\b/g).pop()||left;
  // Treat negatives as an exclusion only when directly governing the named capability.
  // 'I don't need a mop' expresses a preference, not necessarily a ban.
  const neg=(matchAny(tail, strongNegative)||/\b(?:not|no|non)\s+(?:(?:a|an|any|una|un)\s+)?$/.test(tail))&&!matchAny(tail,uncertainNegation);
  if(aspect.kind==='environment')return neg?'environment_absent':'environment';
  if(neg)return 'excluded';
  return aspect.kind==='task'?'required':'requested_capability';
}
/** Conservative monetary bound: the currency must be explicit (symbol or word, before or after the number), never
 * inferred from location, and the amount must be anchored as a limit ("under $500", "< $500", "70€ tops",
 * "don't want to go over 500 euros", "budget $400-500"). Unanchored prices ("the $999 model", "ranging from $25 to
 * $250") are ignored; two different anchored limits are a conflict (null). Phase250 widened the accepted forms after
 * real requests wrote budgets as "< $500", "70€ tops" and "over 500 euros". */
const CUR_SYM:Record<string,string>={'$':'USD','€':'EUR','£':'GBP'};
const CUR_WORD:Record<string,string>={dollar:'USD',dollars:'USD',usd:'USD',euro:'EUR',euros:'EUR',eur:'EUR',pound:'GBP',pounds:'GBP',gbp:'GBP',quid:'GBP'};
function monetaryBudget(raw:string):Composition125['userBudget']{
 // Phase251: "between £200 and £350" is a range.
 const t=raw.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/\bbetween ([$€£])\s?(\d{2,6}) (?:and|to) [$€£]?\s?(\d{2,6})\b/g,'$1$2-$3');
 const num='(\\d{2,6}(?:[.,]\\d{2})?)';const sym='([$€£])';const word='(dollars?|usd|euros?|eur|pounds?|gbp|quid)';
 // amount forms: $500 | 500$ | 500 euros | usd 500 ; optional range "$400-500" / "400 to 500 euros"
 const re=new RegExp(`${sym}\\s?${num}(?:\\s?(?:-|–|to)\\s?[$€£]?\\s?${num})?|${num}(?:\\s?(?:-|–|to)\\s?${num})?\\s?${sym}|${num}(?:\\s?(?:-|–|to)\\s?${num})?\\s?${word}\\b|\\b${word}\\s?${num}`,'g');
 const BEFORE=/(?:\b(?:under|below|up to|upto|max|maximum|less than|no more than|not more than|at most|within|sotto|fino a|meno di|massimo|budget(?: is| of| around| about| at| was)?|spend(?: up to)?|cap(?:ped)? at)|(?:not|n't|never) (?:\w+ ){0,2}(?:go|spend|pay) (?:over|above|more than)|<|≤)\s*$/;
 const AFTER=/^\s*(?:tops\b|max\b|maximum\b|or less\b|or under\b|or below\b|at most\b|at the most\b|or so\b)/;
 // Phase251: anchors that state the user's own limit, as opposed to comparatives that can describe a price tier.
 const STRONG=/(?:\bbudget\b[^.?!]{0,25}|\b(?:spend|afford|pay|maximum|max|at most|cap(?:ped)? at)\b[^.?!]{0,12}|(?:not|n't|never) (?:\w+ ){0,2}(?:go|spend|pay) (?:over|above|more than) |<\s*|≤\s*)$/;
 const found:{currency:string;min:number|null;max:number;anchored:boolean;strong:boolean;start:number;end:number}[]=[];
 for(const m of t.matchAll(re)){
  const g=m.slice(1);const n=(s:string|undefined)=>s===undefined?undefined:Number(s.replace(',','.'));
  let currency:string,a:number|undefined,b:number|undefined;
  if(g[0]!==undefined){currency=CUR_SYM[g[0]];a=n(g[1]);b=n(g[2]);}
  else if(g[5]!==undefined){currency=CUR_SYM[g[5]];a=n(g[3]);b=n(g[4]);}
  else if(g[8]!==undefined){currency=CUR_WORD[g[8]];a=n(g[6]);b=n(g[7]);}
  else{currency=CUR_WORD[g[9]];a=n(g[10]);}
  if(a===undefined||!currency)continue;
  const start=m.index!,end=start+m[0].length;
  const before=t.slice(Math.max(0,start-40),start),after=t.slice(end,end+20);
  // A budget word anywhere just before a range ("Budget $400-500") or the amount anchors it.
  const anchored=BEFORE.test(before)||AFTER.test(after)||/\bbudget\b[^.?!]{0,25}$/.test(before);
  found.push({currency,min:b!==undefined?a:null,max:b!==undefined?b:a,anchored,strong:STRONG.test(before)||AFTER.test(after),start,end});
 }
 // An amount joined to an anchored one by "and/or" shares its anchor ("budget $600 and £400" is a conflict).
 for(let i=1;i<found.length;i++)if(!found[i].anchored&&found[i-1].anchored&&/^\s*(?:and|or|,)\s*$/.test(t.slice(found[i-1].end,found[i].start)))found[i].anchored=true;
 const lim=found.filter(f=>f.anchored);
 if(!lim.length)return null;
 // Three or more prices with only comparative anchors describe price tiers ("pans below $60, $60 to $130, over $130").
 if(found.length>=3&&!lim.some(f=>f.strong))return null;
 const key=(f:typeof lim[number])=>`${f.currency}|${f.min}|${f.max}`;
 if(new Set(lim.map(key)).size!==1)return null;
 const e=lim[0];if(e.min!==null&&e.min>e.max)return null;
 return {currency:e.currency,min:e.min,max:e.max};
}
const needScopeReview=(t:string)=>matchAny(t,['not sure if','non so se','rather than','piuttosto che',
 'not only','non solo','except when','tranne quando']);
/** Schema-guided compositional candidate. Never claims validated semantic equivalence. */
export function composeQuestion125(question:string,schemas:readonly CategorySchema125[],
 state:DialogueState125={}):Composition125{
 if(typeof question!=='string'||question.length<3||question.length>4000)throw Error('invalid_question');
 if(!Array.isArray(schemas)||!schemas.length||schemas.length>80)throw Error('invalid_schema_registry');
 for(const schema of schemas)validateSchema125(schema);
 if(new Set(schemas.map(s=>s.id)).size!==schemas.length)throw Error('duplicate_category_schema');
 const t=norm(question);const hazards:string[]=[];
 const explicit=schemas.filter(s=>matchAny(t,s.aliases));
 if(explicit.length>1)hazards.push('multiple_explicit_categories');
 let schema=explicit.length===1?explicit[0]:undefined;
 let categoryFrom:Composition125['categoryFrom']=schema?'explicit':'unresolved';
 if(!schema&&state.categoryVerified&&state.categoryId){
  schema=schemas.find(s=>s.id===state.categoryId);
  if(schema)categoryFrom='verified_context';
 }
 const goals:Goal125[]=[];
 if(matchAny(t,goalCues.autonomy)||/\bautonom(?:o|a|i|e|ous|y)\b/.test(t)||
     /\b(?:meno|minori)\s+(?:interventi|manutenzione|assistenza)\b/.test(t))goals.push('autonomy');
 if(matchAny(t,goalCues.capability_discovery))goals.push('capability_discovery');
 if(matchAny(t,goalCues.value))goals.push('value');
 if(matchAny(t,goalCues.performance)&&(!(goals.includes('value')||goals.includes('autonomy'))||
    wholeSpan(t,['best performance','migliori in assoluto','best overall','prestazioni'])))
    goals.push('performance');
 // Never infer a single winner for 'choose' absent an anchored candidate set.
 const reference=matchAny(t,genericPronouns);
 let candidateReference:Composition125['candidateReference']='none';
 let candidateIds:string[]=[];
 if(reference){
   if(state.candidatesVerified===true&&Array.isArray(state.candidates)&&state.candidates.length>=2&&
      state.candidates.length<=100&&state.candidates.every(idOk)&&new Set(state.candidates).size===state.candidates.length&&
      !!state.contextTurnId){candidateReference='verified_context';candidateIds=[...state.candidates].sort();}
   else {candidateReference='unresolved';hazards.push('unresolved_comparative_referent');}
 }
 if(!goals.length&&state.confirmedGoals?.length&&candidateReference==='verified_context'){
   goals.push(...state.confirmedGoals.filter(x=>['performance','value','autonomy'].includes(x)));
 }
 if(!goals.length)hazards.push('unresolved_decision_goal');
 if(/\b(?:not|non)\s+(?:the\s+|il\s+|la\s+)?(?:best|migliore|miglior)\b/.test(t))
    hazards.push('negated_goal_requires_review');
 if(needScopeReview(t))hazards.push('logical_scope_needs_review');
 if(matchAny(t,modalUncertainty)&&wholeSpan(t,negationCues))hazards.push('negation_modality_needs_review');
 const aspects:AspectFinding125[]=[];
 const allAspectEnds:number[]=[];
 for(const a of schema?.aspects||[])for(const alias of a.aliases){
   const word=norm(alias);let seek=0;while(word&&seek<t.length){
     const k=t.indexOf(word,seek);if(k<0)break;seek=k+word.length;
     if((k===0||t[k-1]===' ')&&(seek===t.length||t[seek]===' '))allAspectEnds.push(seek);
   }
 }
 for(const aspect of schema?.aspects||[]){
   const spans:{matched:string;index:number;end:number}[]=[];
   for(const alias of aspect.aliases){
     const v=norm(alias);let pos=0;
     while(v&&pos<t.length){
       const at=t.indexOf(v,pos);if(at<0)break;
       const before=at===0?' ':t[at-1],after=t[at+v.length]||' ';
       if(before===' '&&after===' ')spans.push({matched:alias,index:at,end:at+v.length});
       pos=at+v.length;
     }
   }
   const nonOverlapping:{matched:string;index:number;end:number}[]=[];
   for(const span of spans.sort((a,b)=>(b.end-b.index)-(a.end-a.index)||a.index-b.index)){
     if(!nonOverlapping.some(x=>span.index<x.end&&span.end>x.index))nonOverlapping.push(span);
   }
   const roles=unique(nonOverlapping.map(x=>roleFor(t,aspect,x.index,
      Math.max(0,...allAspectEnds.filter(end=>end<=x.index)))));
   if(roles.length>1)hazards.push('contradictory_aspect_polarity');
   if(nonOverlapping.length){
     const selected=nonOverlapping.sort((a,b)=>a.index-b.index)[0];
     aspects.push({aspectId:aspect.id,role:roles.length===1?roles[0]:
       aspect.kind==='environment'?'environment':'requested_capability',
       source:'current_turn',matchedText:selected.matched,evidenceKeys:[...aspect.evidenceKeys]});
   }
 }
 const budget=monetaryBudget(question);
 if((t.includes('$')||t.includes('€')||t.includes('£'))&&!budget)hazards.push('unparsed_or_conflicting_budget');
 // Novel feature requests must be research prompts, not declared facts.
 const unknownCapabilitySpans:string[]=[];
 for(const match of t.matchAll(/\b(?:with|con|equipped with|dotato di)\s+([a-z][a-z0-9 ]{2,55}?)(?=\s+(?:for|per|that|che|and|e|under|sotto)\b|$)/g)){
   const raw=match[1].trim();
   if(raw&&!matchAny(raw,['pets','pet hair','animali','gatti','cani'])&&
      !(schema?.aspects.some((a:SchemaAspect125)=>matchAny(raw,a.aliases)))&&
      !matchAny(raw,discourseJoiners))unknownCapabilitySpans.push(raw);
 }
 if(unknownCapabilitySpans.length)hazards.push('unknown_capability_requires_research');
 // Conservatively detect a stated prohibition that we cannot safely attach.
 if(matchAny(t,negationCues)&&!aspects.some((a:AspectFinding125)=>a.role==='excluded')&&
     !hazards.includes('logical_scope_needs_review'))hazards.push('unbound_negation');
 const scope:Scope125=matchAny(t,personalCues)||aspects.some(a=>a.role==='environment')||budget?'personal':'general';
 const missingContext=!schema||candidateReference==='unresolved';
 const status:FrameStatus125=missingContext?'requires_context':
   hazards.length?'requires_semantic_review':'candidate_needs_evidence';
 const obligationKeys=unique([
  'verify_product_identities','independent_expert_quality_floor','independent_domain_outcomes',
  'compare_test_protocols',
  ...(goals.includes('value')?['local_current_price','ownership_cost_when_supported']:[]),
  ...(goals.includes('autonomy')?['human_intervention_frequency','human_maintenance_minutes','unattended_completion']:[]),
  ...aspects.filter(a=>a.role!=='excluded'&&a.role!=='environment_absent').flatMap(a=>a.evidenceKeys),
  ...aspects.filter(a=>a.role==='excluded').map(a=>'verify_absence_of_'+a.aspectId),
  ...(unknownCapabilitySpans.length?['ground_unknown_requested_capability']:[])]).sort();
 return {phase:125,questionSha256:hash(question),categoryId:schema?.id||null,
   categoryFrom,goals:unique(goals).sort(),scope,aspects:aspects.sort((a,b)=>
     a.aspectId.localeCompare(b.aspectId)),userBudget:budget,candidateIds,
   candidateReference,unknownCapabilitySpans:unique(unknownCapabilitySpans),
   hazards:unique(hazards).sort(),status,evidenceObligations:obligationKeys,
   interpretationConfirmed:false,sourceMeasurementsVerified:false,rankingAuthorized:false};
}
/** Run the proposed composed research query on rights-asserted LOCAL passages only.
 * BM25 retrieval is source discovery, not source validation or fact extraction. */
export function retrieveComposedCandidates125(frame:Composition125,question:string,
 passages:readonly IndexedPassage122[]):{attemptedQueries:number;
 hits:readonly {passageId:string;sourceUrl:string;lexicalScore:number}[];
 sourceFactsAuthenticated:false;validatedMeasurements:false;rankingAuthorized:false}{
 const none={attemptedQueries:0,hits:[] as {passageId:string;sourceUrl:string;lexicalScore:number}[],
   sourceFactsAuthenticated:false as const,validatedMeasurements:false as const,
   rankingAuthorized:false as const};
 if(frame.status!=='candidate_needs_evidence'||!frame.categoryId||
    frame.questionSha256!==hash(question))return none;
 const queries=unique([question,...frame.aspects.filter(a=>a.role!=='environment_absent')
    .flatMap(a=>[a.matchedText,...a.evidenceKeys.map(x=>x.replace(/_/g,' '))])]).slice(0,20);
 const proxy:ResearchPlan122={purpose:'phase122_native_question_to_research_proposal',
  questionSha256:frame.questionSha256,intent:{category:'unknown',objective:null,
    scope:'undecided',mode:frame.scope,queryState:'needs_semantic_review',contextUsed:false,
    protectedNegation:frame.aspects.some(a=>a.role==='excluded'),evidenceSignals:[],confirmedByUser:false},
  requirements:[],unknowns:[],steps:[{action:'discover_candidates',metric:'product_discovery',
    sourcePriority:'independent_test',rationale:'Unverified candidate passages for composed goal',queries}],
  next:'semantic_review',publicRankingAuthorized:false,searchExecuted:false,
  marketExhaustionProven:false,limitations:['local lexical proposal; no validated evidence']};
 const r=searchInternalPassages122(proxy,passages,5);
 return {...none,attemptedQueries:r.queriesAttempted,
  hits:r.results.flatMap(x=>x.hits.map(h=>({passageId:h.passageId,sourceUrl:h.sourceUrl,
   lexicalScore:h.lexicalScore})))};
}
/** Sidecar: preserve Phase124 evidence controls and all legacy hypotheses. */
export function compareResearchAttempt125(model:NativeModel123,question:string,
 context:Context122,passages:readonly IndexedPassage122[],anchors:readonly CuratedAnchor124[],
 schemas:readonly CategorySchema125[],dialogue:DialogueState125={}):{
 frame:Composition125;previous:EndToEndAttempt124;
 localRetrieval:ReturnType<typeof retrieveComposedCandidates125>;
 next:'seek_context'|'adjudicate_meaning'|'acquire_or_review_evidence';
 rankingAuthorized:false;originalSourceAuthenticated:false;
}{
 const frame=composeQuestion125(question,schemas,dialogue);
 const previous=attemptResearch124(model,question,context,passages,anchors);
 const localRetrieval=retrieveComposedCandidates125(frame,question,passages);
 const next=frame.status==='requires_context'?'seek_context':
  frame.status==='requires_semantic_review'?'adjudicate_meaning':'acquire_or_review_evidence';
 return {frame,previous,localRetrieval,next,rankingAuthorized:false,originalSourceAuthenticated:false};
}
/** Example pilot lexicon, reviewed domain descriptors, NOT a list of product claims. */
export const floorRobotSchema125:CategorySchema125={id:'floor_cleaning_robot',schemaReviewId:'phase125_research_pilot',
 aliases:['robot vacuum','robot vacuums','robot cleaner','robot aspirapolvere','robot lavapavimenti',
   'robot per pavimenti','robot floor cleaner','aspirapolvere robot','robot mop','robot for floors'],
 aspects:[
  {id:'vacuuming',kind:'task',aliases:['vacuuming','vacuum','aspirazione','aspirare','aspirapolvere','debris'],evidenceKeys:['debris_pickup']},
  {id:'mopping',kind:'task',aliases:['mopping','mop','lavaggio','lavare','lavapavimenti','wash floors'],evidenceKeys:['stain_removal']},
  {id:'carpet',kind:'environment',aliases:['carpets','carpet','moquette','tappeti','tappeto'],evidenceKeys:['carpet_debris_pickup']},
  {id:'pet_hair',kind:'environment',aliases:['pet hair','animal hair','peli di animali','peli del gatto','peli del cane'],evidenceKeys:['pet_hair_pickup']},
  {id:'stairs',kind:'capability',aliases:['climb stairs','climbing stairs','salire le scale','salire gli scalini','stairs'],evidenceKeys:['staircase_traversal']},
  {id:'steam',kind:'capability',aliases:['steam','vapore'],evidenceKeys:['actual_floor_steam_application']}
 ]};
