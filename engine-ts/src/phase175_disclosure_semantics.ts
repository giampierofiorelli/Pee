/** Phase175: cross-category, clause-bounded *candidate* role graph for upstream user needs.
 * Reuses Phase154 context graph (originally adapted from medSpaCy for reviews)
 * and the real Phase174→173→172 context. No identity/model/certification/ranking authority.
 * Roles are literal English observations with source offsets, not validated intentions.
 */
import {createHash} from 'node:crypto';
import {buildContextGraph154, type ContextRule154} from './phase154_context_graph.js';
import {researchCategoryTransfer174,type TransferProbe174} from './phase174_category_transfer_probe.js';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const uniq=<T>(a:readonly T[])=>[...new Set(a)];
export type Equipment175='electric_kettle'|'stovetop_kettle'|'kettle_unspecified'|'drinking_water_filter'|
 'reverse_osmosis_system'|'pasta_roller'|'pasta_extruder'|'pasta_maker_unspecified'|'coffee_machine'|
 'coffee_grinder'|'vacuum_cleaner'|'robot_vacuum'|'central_vacuum';
export type Role175='already_owned'|'existing_in_household'|'explicitly_not_owned'|'third_party_owned'|'requested'|'compared'|'excluded'|'unresolved';
export interface EquipmentMention175{ id:string;equipment:Equipment175;span:string;start:number;end:number;
 role:Role175;actor:'speaker'|'third_party'|'unknown'; roleEvidence:{span:string;start:number;end:number}|null;
 roleCandidateOnly:true;referenceIdentityVerified:false;mentionBasis:'direct_equipment_surface'|'bounded_water_context_inference'|'bounded_pasta_context_inference';}
export interface NeedGraph175{
 phase:175;schemaVersion:'175.1';requestSha256:string;inherited174:TransferProbe174;
 equipment:readonly EquipmentMention175[];requestedEquipment:readonly Equipment175[];
 otherRelevantEquipment:readonly Equipment175[];relationshipCandidates:readonly {
 fromId:string;toId:string;relation:'existing_context_for_requested_device'|'compared_options'|'shared_purchase_goal';
 reviewedByDomainExpert:false;}[];
 task:'product_selection'|'solution_comparison'|'use_or_troubleshoot'|'unresolved';
 budget:{currency:'USD'|'GBP'|'EUR';min:number|null;max:number;scope:'shared_across_devices'|'single_device_or_unresolved';validated:false}|null;
 unknownNeeds:readonly string[];unresolvedIssues:readonly string[];clarification:string|null;
 /** Only a bounded known-cue projection; NEVER proof of universal semantic equivalence. */
 knownRoleSignature:string;
 domainSemanticUnderstandingValidated:false;sourceMeasurementsVerified:false;productEvidenceVerified:false;
 hardExclusionsAuthorized:false;rankingAuthorized:false;choiceChangeAuthorized:false;
}
interface Alias175{equipment:Equipment175;regex:RegExp;}
/** Family aliases are independent of the decision/facet rules in Phases172–174. */
const ALIASES:readonly Alias175[]=[
 {equipment:'electric_kettle',regex:/\belectric[ -]?kettle\b/gi},
 {equipment:'stovetop_kettle',regex:/\b(?:stove[ -]?top|gas[ -]?stove|whistling)\s+(?:tea\s+)?kettle\b/gi},
 {equipment:'kettle_unspecified',regex:/\b(?:tea\s+)?kettle\b/gi},
 {equipment:'reverse_osmosis_system',regex:/\b(?:reverse[ -]?osmosis|RO)(?:\s+(?:filtration\s+)?(?:system|unit|filter))?\b/gi},
 {equipment:'drinking_water_filter',regex:/\b(?:(?:whole[ -]?house|under[ -]?sink|counter[ -]?top|tap|drinking)\s+filter|water\s+filte(?:r|rs)|water\s+filtration(?:\s+system)?|filter\s+(?:for\s+)?(?:my\s+|the\s+)?(?:tap|drinking)\s+water|under[ -]?sink\s+(?:filter|filtration)|filter\s+pitcher)\b/gi},
 {equipment:'pasta_roller',regex:/\b(?:pasta\s+(?:sheet\s+)?roller|pasta\s+sheeter|hand[ -]?crank\s+pasta\s+(?:machine|roller))\b/gi},
 {equipment:'pasta_extruder',regex:/\b(?:pasta\s+extruder|pasta\s+press)\b/gi},
 {equipment:'pasta_maker_unspecified',regex:/\b(?:pasta\s+machine|pasta\s+maker)\b/gi},
 {equipment:'coffee_machine',regex:/\b(?:espresso\s+machine|coffee\s+machine|coffee\s+maker)\b/gi},
 {equipment:'coffee_grinder',regex:/\b(?:coffee\s+grinder|espresso\s+grinder|grinder)\b/gi},
 {equipment:'robot_vacuum',regex:/\b(?:robovac|robot(?:ic)?\s+vacuum)\b/gi},
 {equipment:'central_vacuum',regex:/\b(?:central\s+vacuum)\b/gi},
 {equipment:'vacuum_cleaner',regex:/\b(?:vacuum(?:\s+cleaner)?|upright\s+vac|stick\s+vac|cordless\s+vac)\b/gi},
];
const CONTEXT_RULES:readonly ContextRule154[]=[
 {literal:'I already have',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'I currently have',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'I have',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:"I've got",category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'I own',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'I bought',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:10},
 {literal:'I was gifted',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:10},
 {literal:'we have',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'we own',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'my house currently has',category:'HOUSEHOLD_EXISTING',direction:'FORWARD',maxScopeTokens:8},
 {literal:'our home has',category:'HOUSEHOLD_EXISTING',direction:'FORWARD',maxScopeTokens:8},
 {literal:'my current',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:6},
 {literal:'for my',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:3},
 {literal:'my existing',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:6},
 {literal:'my old',category:'USER_OWN',direction:'FORWARD',maxScopeTokens:6},
 {literal:'my parents have',category:'THIRD_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'my parents own',category:'THIRD_OWN',direction:'FORWARD',maxScopeTokens:12},
 {literal:'my mom has',category:'THIRD_OWN',direction:'FORWARD',maxScopeTokens:10},
 {literal:'my mum has',category:'THIRD_OWN',direction:'FORWARD',maxScopeTokens:10},
 {literal:'they have',category:'THIRD_OWN',direction:'FORWARD',maxScopeTokens:8},
 {literal:'she has',category:'THIRD_OWN',direction:'FORWARD',maxScopeTokens:8},
 {literal:'looking for',category:'REQUEST',direction:'FORWARD',maxScopeTokens:15},
 {literal:'looking to buy',category:'REQUEST',direction:'FORWARD',maxScopeTokens:15},
 {literal:'want to buy',category:'REQUEST',direction:'FORWARD',maxScopeTokens:12},
 {literal:'want a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'want an',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'want the',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'need the',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'I want',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'I prefer',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'prefer a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'buying a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'buying an',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'to spend on',category:'REQUEST',direction:'FORWARD',maxScopeTokens:8},
 {literal:'we need',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'and need',category:'REQUEST',direction:'FORWARD',maxScopeTokens:7},
 {literal:'and want',category:'REQUEST',direction:'FORWARD',maxScopeTokens:7},
 {literal:'need a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'need an',category:'REQUEST',direction:'FORWARD',maxScopeTokens:9},
 {literal:'I need',category:'REQUEST',direction:'FORWARD',maxScopeTokens:11},
 {literal:'best',category:'REQUEST',direction:'FORWARD',maxScopeTokens:7},
 {literal:'recommend a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'recommend me',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'shopping for',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'should I buy',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'what type of',category:'REQUEST',direction:'FORWARD',maxScopeTokens:8},
 {literal:'choose a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'buy a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'get a',category:'REQUEST',direction:'FORWARD',maxScopeTokens:10},
 {literal:'considering',category:'COMPARE',direction:'FORWARD',maxScopeTokens:12},
 {literal:'versus',category:'COMPARE',direction:'BIDIRECTIONAL',maxScopeTokens:12},
 {literal:'instead of',category:'COMPARE',direction:'BIDIRECTIONAL',maxScopeTokens:10},
 {literal:'not an option',category:'EXCLUDE',direction:'BACKWARD',maxScopeTokens:8},
 {literal:'not possible',category:'EXCLUDE',direction:'BACKWARD',maxScopeTokens:8},
 {literal:'not affordable',category:'EXCLUDE',direction:'BACKWARD',maxScopeTokens:8},
 {literal:'without a',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'without an',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'do not want',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:"don't want",category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'cannot use',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'cannot afford',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:"can't afford",category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:"can't buy",category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'cannot buy',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'without',category:'EXCLUDE',direction:'FORWARD',maxScopeTokens:8},
 {literal:'but',category:'BREAK',direction:'TERMINATE'},
 {literal:'however',category:'BREAK',direction:'TERMINATE'},
 {literal:'instead',category:'BREAK',direction:'TERMINATE'},
 {literal:'while',category:'BREAK',direction:'TERMINATE'},
 {literal:';',category:'BREAK',direction:'TERMINATE'},
];
const prohibitedOwnership=/\b(?:do\s+not|don't|does\s+not|doesn't|never|no\s+longer|used\s+to|wish\s+i)\s+(?:have|own)\b/i;
function safeAliasMentions(text:string):{equipment:Equipment175;start:number;end:number;span:string;mentionBasis:EquipmentMention175['mentionBasis']}[]{
 const raw:{equipment:Equipment175;start:number;end:number;span:string;mentionBasis:EquipmentMention175['mentionBasis']}[]=ALIASES.flatMap(a=>[...text.matchAll(a.regex)].map(m=>({equipment:a.equipment,start:m.index!,end:m.index!+m[0].length,span:m[0],mentionBasis:'direct_equipment_surface' as const})));
 // A bare 'extruder' is domain-ambiguous. Retain it ONLY as a bounded
 // unverified pasta-context candidate if 'pasta' occurs in the same sentence.
 for(const m of text.matchAll(/\bextruders?\b/gi)){
  if(raw.some(a=>a.start<=m.index!&&a.end>=m.index!+m[0].length))continue;
  const sentence=text.slice(Math.max(0,m.index!-110),m.index!).split(/[.!?;]/).at(-1)??'';
  if(!/\b(?:pasta|noodles?)\b/i.test(sentence)||/\b(?:3d\s*print|clay|plastic|filament)\b/i.test(sentence))continue;
  raw.push({equipment:'pasta_extruder',start:m.index!,end:m.index!+m[0].length,span:m[0],mentionBasis:'bounded_pasta_context_inference'});
 }

 // Candidate category from immediate water-quality context, NOT a resolved product type.
 for(const m of text.matchAll(/\bfilters?\b/gi)){
  const pre=text.slice(Math.max(0,m.index!-90),m.index!);const post=text.slice(m.index!+m[0].length,m.index!+m[0].length+90);
  const scope=(pre+' '+post).split(/[.!?;]/)[0];
  if(!/\b(?:PFAS|PFOA|PFOS|microplastic|lead|fluoride|arsenic|drinking\s+water|tap\s+water)\b/i.test(scope))continue;
  if(/\b(?:coffee|air|engine|oil|vacuum)\s*$/i.test(pre))continue;
  raw.push({equipment:'drinking_water_filter',start:m.index!,end:m.index!+m[0].length,span:m[0],mentionBasis:'bounded_water_context_inference'});
 }
 return raw.filter(a=>!raw.some(b=>a!==b&&a.start<b.end&&b.start<a.end&&
  ((b.end-b.start>a.end-a.start)||((b.end-b.start===a.end-a.start)&&b.equipment<a.equipment)))).sort((a,b)=>a.start-b.start||b.end-a.end||a.equipment.localeCompare(b.equipment));
}
/** Predicate-aware boundary: unlike an unconditional 'and' split, keep coordinated
 * objects (need an espresso machine AND grinder) under one intent, but break
 * when a new finite predicate appears (own a vacuum AND need a filter).
 * A context graph remains the source of modifier candidates, never authority.
 */
const CLAUSE_BOUNDARY175=/[.!?;:]|,\s*(?=(?:(?:i|we|they|she|he)\s+)?(?:just\s+)?(?:need|want|have|own|bought|buy|prefer|looking|shopping)\b)|\b(?:but|however|whereas|while|instead)\b|\band\s+(?:(?:i|we|they|she|he)\s+)?(?=(?:need|want|own|have|bought|buy|ordered|looking|shopping|prefer|cannot|don't|do\s+not)\b)/gi;
function localPredicateStart175(text:string,start:number):number{
 const prefix=text.slice(0,start);let last=0;
 for(const m of prefix.matchAll(CLAUSE_BOUNDARY175))last=m.index!+m[0].length;
 return last;
}
const splitClause=(text:string,start:number)=>text.slice(localPredicateStart175(text,start),start);
function localExcluded175(text:string,start:number):boolean{
 const before=splitClause(text.replace(/[‘’]/g,"'"),start).toLowerCase();
 // Negative particles must govern this mention, not an earlier product.
 return /\b(?:without|except|excluding|not|never|no)\s+(?:(?:using|having|buying|an?|the|any|another)\s+){0,3}$/.test(before)||
  /\b(?:can't|cannot|can not|don't|do not)\s+(?:buy|afford|use|want|need)\s+(?:(?:an?|the|any|another)\s+){0,3}$/.test(before);
}
function localRequested175(text:string,start:number):boolean{
 const before=splitClause(text.replace(/[‘’]/g,"'"),start).toLowerCase();
 // Question form is a purchase inquiry only when directly governing the item;
 // open comparisons and product-reference questions stay unverified.
 return /\b(?:which|what(?:'s| is) the best)\s+(?:(?:new|good|reliable|electric|pasta|coffee|water|stovetop|cordless|robot)\s+){0,5}$/.test(before);
}

function directRoleGuard(text:string,start:number,triggerStart:number,cat:string):boolean{
 const pre=text.slice(triggerStart,start);
 if(pre.length>125)return false;
 // Do not allow a generic mention about another subject to inherit ownership.
 if(/\b(?:who|which|that)\s+(?:have|has|own|owns|bought|need|needs)\b/i.test(pre))return false;
 if(cat==='USER_OWN'&&(prohibitedOwnership.test(text.slice(Math.max(0,triggerStart-5),Math.min(text.length,start)))||
  /(?:[$£€]\s*\d+|\b(?:total|budget|to spend|spending|cash)\b)/i.test(pre)))return false;
 if(cat==='REQUEST'&&/\b(?:do\s+not|don't|never|not\s+sure\s+(?:if|whether))\s+(?:want|need|buy)\b/i.test(pre))return false;
 // A negation on the request itself must not turn into a positive request.
 if(cat==='REQUEST'&&/\b(?:not|never)\s+(?:looking\s+for|shopping\s+for)\b/i.test(pre))return false;
 return true;
}
function suffixExclusion(text:string,end:number):boolean{
 return /^\s+(?:is|was|would\s+be|isn't|wasn't)\s+not\s+an?\s+option\b/i.test(text.slice(end,end+50))||
  /^\s+(?:is|was)\s+(?:not|never)\s+(?:possible|affordable)\b/i.test(text.slice(end,end+50));
}
function explicitBudget(text:string,countRequested:number):NeedGraph175['budget']{
 // Never assume currency or extend a price from a single product to all products.
 const numbers=[...text.matchAll(/(?:([$£€])\s*)(\d{2,6})(?:\s*[-–]\s*(?:[$£€])?\s*(\d{2,6}))?/g)];
 if(numbers.length!==1)return null;
 const m=numbers[0];const context=text.slice(Math.max(0,m.index!-55),Math.min(text.length,m.index!+m[0].length+55));
 if(!/\b(?:budget|spend|spending|under|below|up to|maximum|cap|total|price|cost)\b/i.test(context))return null;
 const currency=m[1]==='$'?'USD':m[1]==='£'?'GBP':'EUR';
 const min=m[3]?Number(m[2]):null,max=Number(m[3]??m[2]);
 if(max<=0||min!==null&&min>max)return null;
 return {currency,min,max,scope:countRequested>1&&/\b(?:both|together|combined|total|whole setup|all in)\b/i.test(text)?
  'shared_across_devices':'single_device_or_unresolved',validated:false};
}
export function analyzeNeedDiscourse175(input:{question:string;language:'en';inherited174?:TransferProbe174}):NeedGraph175 {
 const text=input?.question;
 if(input.language!=='en'||typeof text!=='string'||text.trim().length<3||text.length>4000)throw Error('phase175_invalid_english_input');
 const prior=researchCategoryTransfer174({question:text,language:'en'});
 if(input.inherited174&&JSON.stringify(prior)!==JSON.stringify(input.inherited174))throw Error('phase175_prior_not_recomputed');
 const mentions=safeAliasMentions(text);
 const targets=mentions.map((m,i)=>({id:`equipment_${i}`,start:m.start,end:m.end,type:'EQUIPMENT'}));
 // Curly apostrophes preserve character offsets when normalized to ASCII.
 const ctx=buildContextGraph154(text.replace(/[‘’]/g,"'"),targets,CONTEXT_RULES);
 const equipment=mentions.map((m,i):EquipmentMention175=>{
  const predicateStart=localPredicateStart175(text,m.start);
  const matches=ctx.edges.filter(e=>e.targetId===`equipment_${i}`)
   .map(e=>({...e,mod:ctx.modifiers.find(x=>x.id===e.modifierId)!}))
   .filter(x=>x.mod.end>predicateStart&&directRoleGuard(text,m.start,x.mod.start,x.category));
  const before=splitClause(text,m.start);
  const suffix=suffixExclusion(text,m.end)||
   (m.equipment==='reverse_osmosis_system'&&/\b(?:no|without)\s+(?:an?\s+)?$/i.test(before));
  const householdExisting=/\b(?:my\s+house|our\s+home)\s+(?:currently\s+)?(?:has|have)(?:\s+\w+){0,6}\s*$/i.test(before);
  const noOwnership=/\b(?:i|we)\s+(?:(?:currently|already)\s+)?(?:do\s+not|don't|never)\s+(?:have|own)(?:\s+\w+){0,6}\s*$/i.test(before)||
   /\b(?:i|we)\s+have\s+no\s+(?:(?:an?|any|old|working|electric|coffee|pasta|robot)\s+){0,5}$/i.test(before);
  const localRequest=/\b(?:need|want|looking\s+for|looking\s+to\s+buy|buy|recommend|shopping\s+for)\s+(?:(?:a|an|the|new|good|better)\s+){0,5}$/i.test(before);
  // Never treat 'I have 200 euros to spend on a kettle' as ownership.
  const localOwnership=!/\b(?:and|but)\s+(?:need|want|looking|buy|shopping)\b/i.test(before)&&
   /\b(?:i|we)\s+(?:already\s+|currently\s+|just\s+)?(?:have|own|got|bought|purchased|ordered)\s+(?:(?:an?|the|my|our|this|that|old|existing|current|broken|new|electric|drinking|robot|coffee|pasta|central|stovetop|cordless)\s+){0,6}$/i.test(before) ||
   /\bmy\s+(?:current|existing|old|broken)\s*$/i.test(before);
  const thirdOwned=/\b(?:my\s+parents|my\s+mom|my\s+mum|they|she|he)\s+(?:already\s+)?(?:have|has|own|owns|use|uses)(?:\s+\w+){0,5}\s*$/i.test(before);
  const nearest=(cats:string[])=>matches.filter(x=>cats.includes(x.category))
   .sort((a,b)=>Math.abs(m.start-a.mod.end)-Math.abs(m.start-b.mod.end))[0];
  const excluded=nearest(['EXCLUDE']);const req=nearest(['REQUEST']);const own=nearest(['USER_OWN']);
  const third=nearest(['THIRD_OWN']);const compared=nearest(['COMPARE']);const household=nearest(['HOUSEHOLD_EXISTING']);
  let role:Role175='unresolved',actor:EquipmentMention175['actor']='unknown';
  let ev:(typeof matches)[number]|undefined=undefined;
  const uncertainty=/\b(?:not\s+sure\s+(?:if|whether)|wondering\s+(?:if|whether)|unsure\s+(?:if|whether))\s+(?:(?:i|we)\s+)?(?:really\s+)?(?:need|want|should\s+buy)\s+(?:(?:an?|the)\s+)?$/i.test(before);
  if(noOwnership){role='explicitly_not_owned';actor='speaker';}
  else if(suffix||localExcluded175(text,m.start)||excluded){role='excluded';ev=excluded;}
  else if(uncertainty){role='unresolved';}
  else if(householdExisting||household){role='existing_in_household';ev=household;}
  else if(thirdOwned||third&&(!own||third.mod.start>own.mod.start)){
   role='third_party_owned';actor='third_party';ev=third;
  }
  else if(localOwnership&&!prohibitedOwnership.test(before)||own&&(!req||own.mod.start>req.mod.start)){
   // A prefixed purpose phrase, e.g. 'for my espresso machine', is context, not a shopping request.
   role='already_owned';actor='speaker';ev=own;
  }
  else if(req||localRequest||localRequested175(text,m.start)){role='requested';actor='speaker';ev=req;}
  else if(compared){role='compared';ev=compared;}
  // Standalone "Which <device>..." or "recommend <device>" with no exact modifier
  // is not a verified purchase target; keep unresolved for explicit follow-up.
  const proof=ev?{span:text.slice(ev.mod.start,ev.mod.end),start:ev.mod.start,end:ev.mod.end}:null;
  return {id:`equipment_${i}`,equipment:m.equipment,span:m.span,start:m.start,end:m.end,role,actor,mentionBasis:m.mentionBasis,
   roleEvidence:proof,roleCandidateOnly:true,referenceIdentityVerified:false};
 });
 // An explicit joint purchase-budget predicate can govern TWO named products.
 const joint=/\b(?:total\s+to\s+spend|budget\s+to\s+spend|to\s+spend)\s+on\s+both\s+/i.exec(text);
 if(joint){for(const e of equipment){
   if(e.role!=='unresolved'||e.start<joint.index+joint[0].length)continue;
   if(text.slice(joint.index+joint[0].length,e.start).length>90)continue;
   e.role='requested';e.actor='speaker';e.roleEvidence={span:joint[0].trim(),start:joint.index,end:joint.index+joint[0].trimEnd().length};
  }}
 const x=text.toLowerCase().replace(/[‘’]/g,"'");
 const compare=/\b(?:wondering if i (?:really )?need|which is better|should i (?:buy|get)|need (?:a|the)|better to|worth|instead of|versus|vs\.?|alternatives? to|rather than|or stick with|do i (?:really )?need)\b/.test(x)&&
  /\b(?:or|versus|vs\.?|instead of|rather than|alternatives?|do i (?:really )?need)\b/.test(x)||
  /\b(?:wondering if i (?:really )?need|do i (?:really )?need)\b/.test(x);
 if(compare){for(const a of equipment)if(a.role==='unresolved'||/\b(?:wondering if i (?:really )?need|do i (?:really )?need)\b/.test(x)&&a.role==='requested')a.role='compared';}
 const requested=uniq(equipment.filter(x=>x.role==='requested').map(x=>x.equipment)).sort();
 const others=uniq(equipment.filter(x=>x.role!=='requested').map(x=>x.equipment)).sort();
 const joined=/\b(?:both|together|combined|total|whole setup|all in)\b/i.test(text);
 const relationships:NeedGraph175['relationshipCandidates'][number][]=[];
 for(const a of equipment)for(const b of equipment){
  if(a.id===b.id)continue;
  if((a.role==='already_owned'||a.role==='existing_in_household')&&b.role==='requested')relationships.push({fromId:a.id,toId:b.id,relation:'existing_context_for_requested_device',reviewedByDomainExpert:false});
  if(joined&&a.role==='requested'&&b.role==='requested'&&a.id<b.id)relationships.push({fromId:a.id,toId:b.id,relation:'shared_purchase_goal',reviewedByDomainExpert:false});
  if(a.role==='compared'&&b.role==='compared'&&a.id<b.id)relationships.push({fromId:a.id,toId:b.id,relation:'compared_options',reviewedByDomainExpert:false});
 }
 const task:NeedGraph175['task']=compare||prior.task==='solution_comparison'?'solution_comparison':
  requested.length?'product_selection':prior.task==='use_or_troubleshoot'?'use_or_troubleshoot':'unresolved';
 const budget=explicitBudget(text,requested.length);
 const issues:string[]=[];
 if(!equipment.length)issues.push('no_equipment_anchor_verified');
 if(equipment.some(x=>x.mentionBasis==='bounded_water_context_inference'))issues.push('water_filter_category_from_local_contaminant_context_only');
 if(equipment.some(x=>x.mentionBasis==='bounded_pasta_context_inference'))issues.push('pasta_extruder_category_from_local_sentence_context_only');
 if(!requested.length&&task==='product_selection')issues.push('no_explicit_requested_equipment_role');
 if(equipment.some(m=>m.role==='unresolved'))issues.push('some_equipment_roles_unresolved');
 if(equipment.some(m=>m.role==='third_party_owned'))issues.push('third_party_context_must_not_become_user_ownership');
 if(equipment.some(m=>m.role==='existing_in_household'))issues.push('household_equipment_presence_is_not_legal_ownership');
 if(equipment.some(m=>m.role==='excluded'))issues.push('excluded_equipment_is_not_a_purchase_candidate');
 if(equipment.some(m=>m.role==='explicitly_not_owned'))issues.push('explicit_no_ownership_not_a_rejection_of_buying');
 if(equipment.some(m=>m.equipment==='kettle_unspecified'))issues.push('kettle_heating_method_unresolved');
 if(equipment.some(m=>m.role==='already_owned'||m.role==='existing_in_household')&&requested.length)issues.push('new_purchase_should_be_evaluated_against_existing_equipment');
 if(requested.length>1&&budget?.scope!=='shared_across_devices')issues.push('multiple_requested_devices_no_verified_shared_budget');
 if(task==='solution_comparison')issues.push('compare_alternatives_including_no_purchase_if_applicable');
 if(/\b(?:no\s+space|no\s+room|not\s+enough\s+space)\b/i.test(text))issues.push('space_constraint_requires_installed_dimensions');
 if(ctx.truncated)issues.push('context_graph_truncated');
 // Detect statements a rule cannot safely attach. Do not pretend the needs vanished.
 const unknown:string[]=[];
 if(/\b(?:arthritis|limited\s+mobility|can(?:not|'t)\s+lift|heavy|bending\s+down)\b/i.test(text))unknown.push('handling_accessibility_or_burden');
 if(/\b(?:whole\s+home|whole\s+house|entire\s+house)\b/i.test(text))unknown.push('whole_home_scope');
 if(/\b(?:PFAS|PFOA|PFOS|arsenic|microplastic|fluoride|lead)\b/i.test(text))unknown.push('specific_contaminant_and_verified_reduction_method');
 if(/\b(?:gas\s+stove|gas\s+hob|stovetop)\b/i.test(text))unknown.push('energy_source_compatibility');
 if(/\b(?:cleaning|clean|maintain|repair|parts|service)\b/i.test(text))unknown.push('maintenance_and_service_obligations');
 if(/\b(?:no\s+RO|without\s+(?:an?\s+)?RO|RO\s+is\s+not\s+an?\s+option|reverse\s+osmosis\s+is\s+not\s+an?\s+option)\b/i.test(text))unknown.push('reverse_osmosis_explicitly_unavailable');
 if(/\b(?:by\s+hand|without\s+(?:a\s+)?machine|not\s+buying\s+(?:a\s+)?machine)\b/i.test(text))unknown.push('manual_method_may_be_comparator');
 if(/\b(?:my\s+parents|my\s+mother|my\s+mom|my\s+mum|my\s+dad|my\s+father|for\s+my\s+parents)\b/i.test(text))unknown.push('purchaser_vs_user_is_distinct');
 const clarification=task==='solution_comparison'?null:equipment.some(m=>m.equipment==='kettle_unspecified')?
  'Do you need a stovetop kettle or an electric one?':requested.length>1&&budget?.scope!=='shared_across_devices'?
  'Is your budget for all the equipment together?':!requested.length&&equipment.length?
  'Are you choosing new equipment, or comparing ways to use what is already available?':null;
 const signature=sha(JSON.stringify({roles:equipment.map(e=>[e.equipment,e.role,e.actor]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
  task,requested,unknownNeeds:unknown.sort(),budget:budget?[budget.currency,budget.min,budget.max,budget.scope]:null}));
 return {phase:175,schemaVersion:'175.1',requestSha256:sha(text),inherited174:prior,equipment,requestedEquipment:requested,otherRelevantEquipment:others,
  relationshipCandidates:relationships,task,budget,unknownNeeds:uniq(unknown).sort(),unresolvedIssues:uniq(issues).sort(),
  clarification,knownRoleSignature:signature,
  domainSemanticUnderstandingValidated:false,sourceMeasurementsVerified:false,productEvidenceVerified:false,
  hardExclusionsAuthorized:false,rankingAuthorized:false,choiceChangeAuthorized:false};
}
