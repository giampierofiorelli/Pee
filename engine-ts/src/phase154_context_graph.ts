/**
 * Port/adaptation of the ConTextRule/ConTextModifier/ConTextGraph algorithms
 * from medSpaCy (MIT, copyright 2020 medspacy). Original Python files and MIT
 * licence are retained in third_party/phase154_reference_sources/medspacy-master.
 *
 * A transparent, bounded lexical context graph, NOT a clinical NLP pipeline,
 * learned NER, entity identity verifier, or scientific truth inference.
 */
export type ContextDirection154='FORWARD'|'BACKWARD'|'BIDIRECTIONAL'|'TERMINATE'|'PSEUDO';
export interface ContextRule154{
 literal:string;category:string;direction:ContextDirection154;
 maxScopeTokens?:number;maxTargets?:number;
 allowedTypes?:string[];excludedTypes?:string[];terminatedBy?:string[];
}
export interface ContextTarget154{id:string;start:number;end:number;type:string;}
export interface ContextModifier154{id:string;literal:string;category:string;direction:ContextDirection154;
 start:number;end:number;scopeStart:number;scopeEnd:number;ruleIndex:number;}
export interface ContextEdge154{targetId:string;modifierId:string;category:string;trigger:{start:number;end:number;literal:string};}
export interface ContextGraph154{modifiers:ContextModifier154[];edges:ContextEdge154[];truncated:boolean;
 reasons:string[];unverifiedLexicalInterpretation:true;}
interface Token{start:number;end:number;literal:string;sentence:number;}
const overlaps=(a:number,b:number,c:number,d:number)=>a<d&&c<b;
function tokens(t:string):Token[]{
 const out:Token[]=[];let sentence=0;let lastEnd=0;
 for(const m of t.matchAll(/[\p{L}\p{N}]+(?:['’/-][\p{L}\p{N}]+)*|[^\s]/gu)){
  if(out.length&&/[.!?]/.test(t.slice(lastEnd,m.index!))||/\n\s*\n/.test(t.slice(lastEnd,m.index!)))sentence++;
  const v=m[0];out.push({start:m.index!,end:m.index!+v.length,literal:v,sentence});lastEnd=m.index!+v.length;
  if(/^[.!?]$/.test(v))sentence++;
 }
 return out;
}
function tokenAt(toks:Token[],position:number):number{
 let l=0,r=toks.length;
 while(l<r){const k=(l+r)>>1;if(toks[k].end<=position)l=k+1;else r=k;}return l;
}
function boundaries(toks:Token[],i:number):[number,number]{
 const s=toks[i]?.sentence;if(s===undefined)return [0,toks.length];
 let a=i,b=i+1;while(a>0&&toks[a-1].sentence===s)a--;while(b<toks.length&&toks[b].sentence===s)b++;return [a,b];
}
/** Pure deterministic graph builder. Inputs are evidence offsets, not identities. */
export function buildContextGraph154(text:string,targets:ContextTarget154[],rules:readonly ContextRule154[],maxMatches=600):ContextGraph154{
 if(typeof text!=='string'||text.length>2_000_000)throw Error('invalid_context_text_154');
 if(!Number.isSafeInteger(maxMatches)||maxMatches<1||maxMatches>5000)throw Error('invalid_context_budget_154');
 if(rules.length>1000)throw Error('too_many_context_rules_154');
 const toks=tokens(text);
 for(const t of targets)if(!Number.isSafeInteger(t.start)||!Number.isSafeInteger(t.end)||t.start<0||t.end<=t.start||t.end>text.length)throw Error('invalid_target_span_154');
 for(const r of rules){
  if(!r.literal||r.literal.length>120||!r.category||r.category.length>90)throw Error('invalid_context_rule_154');
  if(!['FORWARD','BACKWARD','BIDIRECTIONAL','TERMINATE','PSEUDO'].includes(r.direction))throw Error('invalid_context_direction_154');
  if(r.allowedTypes&&r.excludedTypes)throw Error('exclusive_target_types_154');
  for(const n of [r.maxTargets,r.maxScopeTokens])if(n!==undefined&&(!Number.isSafeInteger(n)||n<1||n>5000))throw Error('invalid_context_limit_154');
 }
 type Match={rule:ContextRule154;ruleIndex:number;start:number;end:number;};
 const raw:Match[]=[];let truncated=false;
 const lower=text.toLowerCase();
 outer:for(let k=0;k<rules.length;k++){
  const r=rules[k],lit=r.literal.toLowerCase();let at=0;
  while((at=lower.indexOf(lit,at))>=0){const end=at+lit.length;
   const word=(v:string)=>/[\p{L}\p{N}]/u.test(v);
   if((!word(lit[0])||!at||!word(text[at-1]))&&(!word(lit[lit.length-1])||end===text.length||!word(text[end]))){
    if(raw.length>=maxMatches){truncated=true;break outer;}
    raw.push({rule:r,ruleIndex:k,start:at,end});
   }
   at=end;
  }
 }
 // medSpaCy-style pruning: an overlapping PSEUDO span suppresses the matched
 // trigger, then prefer the longest non-pseudo modifier on overlapping spans.
 const pseudos=raw.filter(m=>m.rule.direction==='PSEUDO');
 const candidate=raw.filter(m=>m.rule.direction!=='PSEUDO'&&!pseudos.some(p=>overlaps(m.start,m.end,p.start,p.end)));
 candidate.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start||a.ruleIndex-b.ruleIndex);
 const pruned:Match[]=[];
 for(const m of candidate)if(!pruned.some(x=>overlaps(m.start,m.end,x.start,x.end)))pruned.push(m);
 pruned.sort((a,b)=>a.start-b.start||a.end-b.end);
 const scoped=pruned.map((m,i)=>{
  const t=tokenAt(toks,m.start);const e=tokenAt(toks,m.end-1);const [ss,se]=boundaries(toks,t);
  const endToken=Math.min(toks.length,e+1);
  const cap=m.rule.maxScopeTokens;
  let a=ss,b=se;
  if(m.rule.direction==='FORWARD'){a=endToken;if(cap!==undefined)b=Math.min(b,a+cap);}
  else if(m.rule.direction==='BACKWARD'){b=t;if(cap!==undefined)a=Math.max(a,b-cap);}
  else if(m.rule.direction==='BIDIRECTIONAL'&&cap!==undefined){a=Math.max(a,t-cap);b=Math.min(b,endToken+cap);}
  else if(m.rule.direction==='TERMINATE'){a=t;b=endToken;}
  return {m,id:`ctx154_${m.start}_${m.end}_${i}`,a,b};
 });
 // Scope limiting by contrast terminators and repeating modifiers (ConText).
 for(const x of scoped){
  if(['TERMINATE','PSEUDO'].includes(x.m.rule.direction))continue;
  for(const y of scoped){if(y===x)continue;
   const rr=x.m.rule,other=y.m.rule;
   const terminates=other.direction==='TERMINATE'||other.category===rr.category||rr.terminatedBy?.includes(other.category);
   if(!terminates)continue;
   if(other.category===rr.category&&(JSON.stringify(other.allowedTypes??null)!==JSON.stringify(rr.allowedTypes??null)||JSON.stringify(other.excludedTypes??null)!==JSON.stringify(rr.excludedTypes??null)))continue;
   const yi=tokenAt(toks,y.m.start),ye=tokenAt(toks,y.m.end-1)+1;
   if(yi>=x.b||ye<=x.a)continue;
   if((rr.direction==='FORWARD'||rr.direction==='BIDIRECTIONAL')&&y.m.start>=x.m.end)x.b=Math.min(x.b,yi);
   if((rr.direction==='BACKWARD'||rr.direction==='BIDIRECTIONAL')&&y.m.end<=x.m.start)x.a=Math.max(x.a,ye);
  }
 }
 const modifiers=scoped.map(x=>({id:x.id,literal:text.slice(x.m.start,x.m.end),category:x.m.rule.category,direction:x.m.rule.direction,
  start:x.m.start,end:x.m.end,scopeStart:toks[x.a]?.start??text.length,scopeEnd:toks[x.b-1]?.end??(toks[x.a]?.start??text.length),ruleIndex:x.m.ruleIndex}));
 const edges:ContextEdge154[]=[];
 for(const x of scoped){if(x.m.rule.direction==='TERMINATE')continue;
  let count=0;const r=x.m.rule;
  for(const target of targets){
   if(r.allowedTypes&&!r.allowedTypes.includes(target.type)||r.excludedTypes?.includes(target.type))continue;
   if(overlaps(x.m.start,x.m.end,target.start,target.end))continue;
   // Scope is token anchored; require the whole target inside its scope
   // rather than accepting a single-character overlap.
   const sa=toks[x.a]?.start??text.length,sb=toks[x.b-1]?.end??sa;
   if(x.a>=x.b||target.start<sa||target.end>sb)continue;
   if(r.maxTargets!==undefined&&count>=r.maxTargets)break;
   edges.push({targetId:target.id,modifierId:x.id,category:r.category,
    trigger:{start:x.m.start,end:x.m.end,literal:text.slice(x.m.start,x.m.end)}});count++;
  }
 }
 return {modifiers,edges,truncated,reasons:truncated?['context_match_budget_exceeded']:[],unverifiedLexicalInterpretation:true};
}
/** Product-review configuration; not borrowed clinical vocabulary. */
export const PRODUCT_REVIEW_CONTEXT_RULES154:readonly ContextRule154[]=[
 {literal:'not tested',category:'TEST_NOT_PERFORMED',direction:'FORWARD',maxScopeTokens:16},
 {literal:'did not test',category:'TEST_NOT_PERFORMED',direction:'FORWARD',maxScopeTokens:16},
 {literal:'never tested',category:'TEST_NOT_PERFORMED',direction:'FORWARD',maxScopeTokens:16},
 {literal:'not included',category:'EXCLUDED_FROM_TEST',direction:'FORWARD',maxScopeTokens:16},
 {literal:'was not tested',category:'TEST_NOT_PERFORMED',direction:'BACKWARD',maxScopeTokens:12},
 {literal:'is not tested',category:'TEST_NOT_PERFORMED',direction:'BACKWARD',maxScopeTokens:12},
 {literal:'was excluded',category:'EXCLUDED_FROM_TEST',direction:'BACKWARD',maxScopeTokens:12},
 {literal:'excluding',category:'EXCLUDED_FROM_TEST',direction:'FORWARD',maxScopeTokens:16},
 {literal:'compared with',category:'COMPARISON_TARGET',direction:'FORWARD',maxScopeTokens:14},
 {literal:'compared to',category:'COMPARISON_TARGET',direction:'FORWARD',maxScopeTokens:14},
 {literal:'unlike',category:'COMPARISON_TARGET',direction:'FORWARD',maxScopeTokens:14},
 {literal:'perhaps',category:'UNCERTAIN_REFERENCE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'possibly',category:'UNCERTAIN_REFERENCE',direction:'FORWARD',maxScopeTokens:9},
 {literal:'but',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:'however',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:'whereas',category:'CONTRAST_BOUNDARY',direction:'TERMINATE'},
 {literal:',',category:'CLAUSE_SEPARATOR',direction:'TERMINATE'},
];
