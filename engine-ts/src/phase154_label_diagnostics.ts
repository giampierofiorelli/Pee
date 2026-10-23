/**
 * Direct TypeScript port of key Snorkel LFAnalysis label matrix calculations.
 * Upstream: Snorkel (Apache-2.0), copyright notices and original source/test
 * in third_party/phase154_reference_sources/snorkel-main/.
 * These are descriptive vote counts, NEVER probabilities of factual truth.
 */
export interface LFRow154{name:string;polarity:number[];coverage:number;overlap:number;conflict:number;
 normalizedOverlap:number;normalizedConflict:number;empiricalAccuracy:number|null;}
export interface LFAnalysis154{rows:number;functions:number;labelCoverage:number;labelOverlap:number;labelConflict:number;
 byFunction:LFRow154[];unverifiedVotes:true;}
const rate=(n:number,d:number)=>d?n/d:0;
export function analyzeLabelMatrix154(matrix:readonly (readonly number[])[],names?:readonly string[],gold?:readonly number[]):LFAnalysis154{
 const n=matrix.length,m=n?matrix[0].length:(names?.length??0);
 if(matrix.some(r=>r.length!==m||r.some(x=>!Number.isSafeInteger(x)||x< -1||x>1_000_000)))throw Error('invalid_label_matrix_154');
 if(names&&(names.length!==m||names.some(s=>!s)))throw Error('invalid_label_names_154');
 if(gold&&(gold.length!==n||gold.some(x=>!Number.isSafeInteger(x)||x<0)))throw Error('invalid_gold_labels_154');
 if(n>200_000||m>1000)throw Error('label_matrix_budget_154');
 let coverage=0,overlap=0,conflict=0;
 const per=Array.from({length:m},(_,j)=>({name:names?.[j]??`lf_${j}`,votes:0,overlaps:0,conflicts:0,correct:0,
  polarity:new Set<number>()}));
 for(let i=0;i<n;i++){
  const row=matrix[i],used:number[]=[];
  for(let j=0;j<m;j++)if(row[j]!== -1){used.push(j);per[j].votes++;per[j].polarity.add(row[j]);if(gold&&row[j]===gold[i])per[j].correct++;}
  if(used.length)coverage++;if(used.length>1)overlap++;
  const different=used.length>1&&new Set(used.map(j=>row[j])).size>1;
  if(different)conflict++;
  for(const j of used){if(used.length>1)per[j].overlaps++;if(different)per[j].conflicts++;}
 }
 return {rows:n,functions:m,labelCoverage:rate(coverage,n),labelOverlap:rate(overlap,n),labelConflict:rate(conflict,n),
  byFunction:per.map(f=>({name:f.name,polarity:[...f.polarity].sort((a,b)=>a-b),coverage:rate(f.votes,n),overlap:rate(f.overlaps,n),
   conflict:rate(f.conflicts,n),normalizedOverlap:rate(f.overlaps,f.votes),normalizedConflict:rate(f.conflicts,f.overlaps),
   empiricalAccuracy:gold?rate(f.correct,f.votes):null})),unverifiedVotes:true};
}
