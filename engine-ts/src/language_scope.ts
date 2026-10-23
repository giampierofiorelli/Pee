/** R3-P stage 1 (owner authorisation 2026-10-20, verbatim in .claude/skills/pee-guided-learning/references/
 * owner-r3p-authorisation-2026-10-20.md): one typed mechanism for clause boundaries, negation scope, polarity and
 * contrast, shared by the request readers and the document readers. The English words are data in the quantity-knowledge
 * pack (language.en.scope); this module holds only the algorithm.
 *
 * What it decides, and nothing else:
 *  - the clause around a position (sentence punctuation, comma, colon, parentheses, dashes, contrast markers);
 *  - whether a negator governs a position: same clause, at most maxScopeWords words after the negator, no number, no
 *    contrast marker and no scope ender ("and", "because", "which") in between, and not part of a fixed phrase that does not negate ("not only", "no doubt");
 *  - the kind of that negation: 'requirement' when a requirement word stands between the negator and the position ("I
 *    don't need more than 6 L", "it doesn't have to be"), otherwise 'proposition' ("nothing over 6 L");
 *  - the stance of a clause towards a term: 'indifferent' when a negated indifference predicate is in the term's clause
 *    ("noise doesn't bother me"), 'negated' when a negator governs the term ("I don't want wifi").
 * It never decides what a negated bound or cue means for a product: the readers do, each with its own documented rule. */
import type {QuantityKnowledge} from './quantity_knowledge.js';
import {readDefaultQuantityPack} from './quantity_pack_file.js';

export interface ScopeVocabulary {negators:string[];notNegating:string[];requirementWords:string[];contrastMarkers:string[];indifferencePredicates:string[];
 /** words that open a new proposition and so end a negator's scope ("not loud and cheap": cheap is not negated) */ scopeEnders:string[];
 /** documents: prepositions that open an adjunct outside the negated predicate */ adjunctPrepositions?:string[];maxScopeWords:number}
export interface Negation {negator:string;start:number;end:number;kind:'proposition'|'requirement'}
export interface Token {w:string;start:number;end:number;kind:'word'|'number'|'break'}

let V:ScopeVocabulary|null=null;
export function scopeVocabulary(qk?:QuantityKnowledge):ScopeVocabulary{
 if(qk)return qk.pack.language.en.scope??fail();
 // A6 (2026-10-21): the default pack's own scope section, read without importing quantity_knowledge (which uses this
 // module): the R3-P import cycle is removed. The loader validates no field of this section, so the words are the same.
 return V??=(readDefaultQuantityPack() as {language?:{en?:{scope?:ScopeVocabulary}}}).language?.en?.scope??fail();
}
function fail():never{throw Error('language_scope: the quantity-knowledge pack has no language.en.scope');}

/** Same-length lowercase text with typographic apostrophes made plain (offsets are those of the input). */
const low=(t:string)=>t.toLowerCase().replace(/[’‘]/g,"'");
/** Words, numbers and clause-breaking punctuation with their offsets. A dot is a break only before a space or the end and
 * never after min/max/approx/ca (S86b, S103); a comma breaks; a decimal point does not. */
export function tokens(text:string):Token[]{
 const out:Token[]=[];const t=low(text);
 for(const m of t.matchAll(/(\d+(?:[.,]\d+)*)|([\p{L}][\p{L}'-]*)|((?<!\b(?:min|max|approx|ca))[.!?](?=\s|$)|[;:,()\n–—])/gu)){
  const kind=m[1]?'number':m[2]?'word':'break';out.push({w:m[0],start:m.index!,end:m.index!+m[0].length,kind});}
 return out;
}
const isNegator=(v:ScopeVocabulary,w:string)=>v.negators.includes(w)||(v.negators.includes("n't")&&/n't$|^(?:dont|doesnt|didnt|isnt|wasnt|arent|werent|wont|wouldnt|cant|couldnt|shouldnt|mustnt|neednt|hasnt|havent|hadnt)$/.test(w));
/** Does a listed phrase (of one or more words) start at token i? Returns its length in tokens, 0 if not. */
function phraseAt(ts:readonly Token[],i:number,phrases:readonly string[]):number{
 let best=0;for(const p of phrases){const ws=p.split(/\s+/);if(ws.every((w,k)=>ts[i+k]?.kind==='word'&&ts[i+k].w===w))best=Math.max(best,ws.length);}return best;
}
/** Index of the first token starting at or after a position. */
const tokenAt=(ts:readonly Token[],pos:number)=>{let i=ts.findIndex(x=>x.start>=pos);return i<0?ts.length:i;};

/** The clause around [start,end): back to the previous break or contrast marker, on to the next one. */
export function clauseAround(text:string,start:number,end:number=start,v:ScopeVocabulary=scopeVocabulary()):{start:number;end:number;text:string}{
 const ts=tokens(text);let a=0,b=text.length;
 for(let i=0;i<ts.length;i++){const x=ts[i];const len=x.kind==='word'?phraseAt(ts,i,v.contrastMarkers):0;const isB=x.kind==='break'||len>0;
  if(!isB)continue;
  // the clause starts after a break or after the whole contrast marker ("but", "rather than")
  const after=len>0?ts[i+len-1].end:x.end;
  if(after<=start)a=after;
  else if(x.start>=end){b=x.start;break;}}
 return {start:a,end:b,text:text.slice(a,b)};
}

/** The negator that governs the words starting at `at`, if any (see the module statement for the scope rule). */
export function negationAt(text:string,at:number,v:ScopeVocabulary=scopeVocabulary(),o:{adjuncts?:boolean;maxWords?:number}={}):Negation|null{
 const ts=tokens(text);const j=tokenAt(ts,at);
 // walk back from the position over at most maxScopeWords words, stopping at a break, a number or a contrast marker
 let words=0;let requirement=false;
 for(let i=j-1;i>=0;i--){const x=ts[i];
  if(x.kind==='break'||x.kind==='number')return null;
  if(phraseAt(ts,i,v.contrastMarkers)>0||v.scopeEnders.includes(x.w))return null;
  // documents: an adjunct opened by a preposition is outside the negated predicate, unless the preposition follows the negator
  if(o.adjuncts&&(v.adjunctPrepositions??[]).includes(x.w)&&!(i>0&&isNegator(v,ts[i-1].w)))return null;
  if(isNegator(v,x.w)){
   if(phraseAt(ts,i,v.notNegating)>0)return null;
   // a requirement word right after the negator ("no need", "don't need", "doesn't have to") or between it and the position
   const between=ts.slice(i+1,j);if(between.some((_,k)=>phraseAt(between,k,v.requirementWords)>0))requirement=true;
   return {negator:x.w,start:x.start,end:x.end,kind:requirement?'requirement':'proposition'};}
  if(++words>(o.maxWords??v.maxScopeWords))return null;}
 return null;
}

/** The stance a clause takes towards the term at [start,end): indifferent, negated, or null (no stance).
 * 'indifferent': a negated indifference predicate ("doesn't bother", "not fussed", "isn't an issue", "don't really care")
 * whose subject (the term within four words before the negator) or object (the term within four words after the
 * predicate) is the term. 'negated': a negator governs the term (negationAt), with its kind. */
export function stanceAt(text:string,start:number,end:number,v:ScopeVocabulary=scopeVocabulary()):{stance:'indifferent'|'negated';negator:string;kind?:'proposition'|'requirement'}|null{
 const cl=clauseAround(text,start,end,v);const ts=tokens(cl.text);const off=cl.start;
 const m0=ts.findIndex(x=>x.end+off>start);const m1=(()=>{let k=m0;while(k+1<ts.length&&ts[k+1].start+off<end)k++;return k;})();
 for(let i=0;i<ts.length;i++){if(ts[i].kind!=='word'||!isNegator(v,ts[i].w)||phraseAt(ts,i,v.notNegating)>0)continue;
  for(let k=i+1;k<=i+3&&k<ts.length;k++){if(ts[k].kind!=='word')break;const len=phraseAt(ts,k,v.indifferencePredicates);if(!len)continue;
   const predEnd=k+len-1;
   if(m0>=0&&((m1<i&&i-m1<=4)||(m0>predEnd&&m0-predEnd<=4)))return {stance:'indifferent',negator:ts[i].w};}}
 const n=negationAt(text,start,v);return n?{stance:'negated',negator:n.negator,kind:n.kind}:null;
}

/** The text with every match of the patterns that a negator governs blanked out (same length, offsets kept), and the
 * negated matches found. Used by cue readers so a denied cue ("not the manufacturer's figures") is not a cue. Document
 * reading: a cue inside a prepositional adjunct is not negated ("we did not notice any noise from our unit"). */
/** `tight`: patterns whose negation must be adjacent (at most two words between): test and measurement cues, because a negated
 * observation is still the publisher's observation ("we did not notice any noise from our unit"); only the act itself
 * denied ("not measured", "did not test", "not our numbers") removes the cue. */
export function maskNegated(text:string,patterns:readonly RegExp[],v:ScopeVocabulary=scopeVocabulary(),tight:readonly RegExp[]=[]):{text:string;negated:{match:string;negator:string}[]}{
 let out=text;const negated:{match:string;negator:string}[]=[];
 for(const [p,isTight] of [...patterns.map(p=>[p,false] as const),...tight.map(p=>[p,true] as const)]){const re=new RegExp(p.source,p.flags.includes('g')?p.flags:p.flags+'g');
  for(const m of text.matchAll(re)){const n=negationAt(text,m.index!,v,{adjuncts:true,...(isTight?{maxWords:2}:{})});
   if(n&&n.kind==='proposition'){out=out.slice(0,m.index!)+' '.repeat(m[0].length)+out.slice(m.index!+m[0].length);negated.push({match:m[0],negator:n.negator});}}}
 return {text:out,negated};
}
