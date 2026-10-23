/**
 * Phase156: TypeScript adaptation of GLiNER2's generic word-window chunking
 * and deterministic overlap resolver, not its learned neural NER model.
 * Upstream: gliner2/inference/chunking.py and gliner2/inference/overlap.py
 * in user's GLiNER2 archive (Apache-2.0). Exact upstream source and licence
 * retained under third_party/phase156_reference_sources/gliner2.
 */
export type OverlapPolicy156='allow'|'nested'|'disallow'|'longest';
export interface WeightedSpan156 {start:number;end:number;score:number;}
export interface WordWindow156 {text:string;startChar:number;endChar:number;startWord:number;endWord:number;}
export function wordWindows156(text:string,chunkSize=384,chunkOverlap=64):WordWindow156[]{
 if(typeof text!=='string'||text.length>2_000_000||!Number.isSafeInteger(chunkSize)||chunkSize<1||chunkSize>5000||
  !Number.isSafeInteger(chunkOverlap)||chunkOverlap<0||chunkOverlap>=chunkSize)throw Error('invalid_word_windows_156');
 const words=[...text.matchAll(/\S+/g)].map(m=>({start:m.index!,end:m.index!+m[0].length}));
 if(!words.length)return [{text,startChar:0,endChar:text.length,startWord:0,endWord:0}];
 const out:WordWindow156[]=[];
 for(let i=0;i<words.length;i+=chunkSize-chunkOverlap){
  const j=Math.min(i+chunkSize,words.length),a=words[i].start,b=words[j-1].end;
  out.push({text:text.slice(a,b),startChar:a,endChar:b,startWord:i,endWord:j});
  if(j===words.length)break;
 }
 return out;
}
export function resolveSpans156<T extends WeightedSpan156>(items:readonly T[],policy:OverlapPolicy156='disallow'):T[]{
 if(!['allow','nested','disallow','longest'].includes(policy))throw Error('invalid_overlap_policy_156');
 if(items.length>20000)throw Error('overlap_candidate_limit_156');
 for(const x of items)if(!Number.isSafeInteger(x.start)||!Number.isSafeInteger(x.end)||x.start<0||x.end<=x.start||
  !Number.isFinite(x.score))throw Error('invalid_weighted_span_156');
 const index=items.map((item,i)=>({item,i}));
 const cmp=(a:typeof index[number],b:typeof index[number])=>b.item.score-a.item.score||a.item.start-b.item.start||a.item.end-b.item.end||a.i-b.i;
 const ranked=index.sort(cmp),seen=new Set<string>();
 const distinct=ranked.filter(r=>{const k=`${r.item.start}:${r.item.end}`;if(seen.has(k))return false;seen.add(k);return true;});
 if(policy==='allow')return distinct.map(r=>r.item);
 const contained=(a:WeightedSpan156,b:WeightedSpan156)=>b.start<=a.start&&a.end<=b.end;
 const intersects=(a:WeightedSpan156,b:WeightedSpan156)=>a.start<b.end&&b.start<a.end;
 if(policy==='longest')return distinct.filter(r=>!distinct.some(s=>s!==r&&contained(r.item,s.item)&&
  (r.item.start>s.item.start||r.item.end<s.item.end))).map(r=>r.item);
 if(policy==='nested'){
  const kept:typeof distinct=[];
  for(const r of distinct)if(!kept.some(s=>intersects(r.item,s.item)&&!contained(r.item,s.item)&&!contained(s.item,r.item)))kept.push(r);
  return kept.map(r=>r.item);
 }
 // GLiNER2: weighted interval scheduling for the optimal set of disjoint spans.
 const ordered=[...distinct].sort((a,b)=>a.item.end-b.item.end||a.item.start-b.item.start||b.item.score-a.item.score||a.i-b.i);
 const ends=ordered.map(x=>x.item.end);
 const prior:number[]=[];
 for(let i=0;i<ordered.length;i++){
  let lo=0,hi=i,needle=ordered[i].item.start;
  while(lo<hi){const mid=(lo+hi)>>1;if(ends[mid]<=needle)lo=mid+1;else hi=mid;}
  prior.push(lo-1);
 }
 type Solution={score:number;selection:number[]};const dp:Solution[]=[{score:0,selection:[]}];
 const rankSelection=(ids:number[])=>ids.map(i=>ordered[i]).sort(cmp).map(r=>r.i);
 for(let i=0;i<ordered.length;i++){
  const before=dp[prior[i]+1],yes={score:before.score+ordered[i].item.score,selection:[...before.selection,i]};
  const no=dp[i];let prefer=false;
  if(yes.score>no.score+1e-12)prefer=true;
  else if(Math.abs(yes.score-no.score)<=1e-12){
   if(yes.selection.length>no.selection.length)prefer=true;
   else if(yes.selection.length===no.selection.length){
    const y=rankSelection(yes.selection),n=rankSelection(no.selection);
    for(let k=0;k<y.length;k++){if(y[k]!==n[k]){prefer=y[k]<n[k];break;}}
   }
  }
  dp.push(prefer?yes:no);
 }
 return dp[ordered.length].selection.map(i=>ordered[i]).sort(cmp).map(r=>r.item);
}
