/** Phase 122 — minimal internally implemented BM25 candidate retrieval.
 * Content is an explicitly supplied, locally held corpus; NO web access,
 * unlicensed reuse, external search service, source identity verification,
 * source qualification, product ranking or new factual claim.
 *
 * BM25 reference: Robertson & Zaragoza (2009/2010),
 * https://doi.org/10.1561/1500000019
 */
import type {ResearchPlan122,Metric122} from './phase122_native_question_to_research.js';
export interface IndexedPassage122 {
  passageId:string;sourceUrl:string;sourceIdentity:string;
  /** A caller-supplied rights-review assertion; THIS MODULE cannot authenticate it. */
  rightsReviewed:boolean;
  text:string;
}
export interface PassageHit122 {
  passageId:string;sourceUrl:string;sourceIdentity:string;
  /** Lexical relevance score, NOT evidence reliability or product quality. */
  lexicalScore:number;
}
export interface MetricRetrieval122 {metric:Metric122;hits:readonly PassageHit122[];
  retrievalIsEvidence:false;sourceIdentityVerified:false;}
export interface InternalRetrieval122 {purpose:'phase122_local_bm25_candidate_search';
  corpusPassages:number;queriesAttempted:number;results:readonly MetricRetrieval122[];
  publicRankingAuthorized:false; sourceRightsAuthenticated:false;}
const tokens=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().split(/[^a-z0-9]+/g).filter(t=>t.length>=2);
const valid=(p:IndexedPassage122)=>typeof p?.passageId==='string'&&
 /^[a-z][a-z0-9_]{1,100}$/.test(p.passageId)&&
 typeof p.sourceUrl==='string'&&/^https:\/\/[^\s]+$/.test(p.sourceUrl)&&
 typeof p.sourceIdentity==='string'&&/^[a-z][a-z0-9_]{1,90}$/.test(p.sourceIdentity)&&
 typeof p.text==='string'&&p.text.length>=20&&p.text.length<=50_000&&
 typeof p.rightsReviewed==='boolean';
/** Pure standard bag-of-words retrieval; neither external embeddings nor LLM. */
export function searchInternalPassages122(plan:ResearchPlan122,
 corpus:readonly IndexedPassage122[],topK=3):InternalRetrieval122 {
 if(plan.purpose!=='phase122_native_question_to_research_proposal'||
   !Array.isArray(corpus)||corpus.length>20_000||
   !Number.isSafeInteger(topK)||topK<1||topK>20||
   corpus.some(p=>!valid(p))||new Set(corpus.map(x=>x.passageId)).size!==corpus.length)
   throw Error('invalid_local_corpus_or_plan');
 // Exclude all passages the caller did not label rights-reviewed; an assertion
 // is not proof of rights. If source approval is unknown, use metadata only.
 const docs=[...corpus].filter(p=>p.rightsReviewed)
   .sort((a,b)=>a.passageId.localeCompare(b.passageId));
 const tks=docs.map(p=>tokens(p.text));
 const counts=tks.map(t=>{const m=new Map<string,number>();for(const w of t)m.set(w,(m.get(w)??0)+1);return m;});
 const df=new Map<string,number>();for(const m of counts)for(const w of m.keys())df.set(w,(df.get(w)??0)+1);
 const avg=tks.reduce((a,v)=>a+v.length,0)/Math.max(1,tks.length);
 let attempted=0;
 const results:MetricRetrieval122[]=plan.steps.map(step=>{
   // Source URLs in hits are not authenticated. Query templates are provided by
   // the preceding research plan, never remote model output.
   const q=step.queries.flatMap(x=>tokens(x));
   const unique=[...new Set(q)];attempted+=step.queries.length;
   const ranked=docs.map((d,i)=>{
     let score=0;const length=tks[i].length;
     for(const term of unique){
       const tf=counts[i].get(term)??0; if(!tf)continue;
       const freq=df.get(term)??0;
       const idf=Math.log(1+(docs.length-freq+0.5)/(freq+0.5));
       const k1=1.2,b=0.75;
       score+=idf*(tf*(k1+1))/(tf+k1*(1-b+b*length/avg));
     }
     return {passageId:d.passageId,sourceUrl:d.sourceUrl,sourceIdentity:d.sourceIdentity,
       lexicalScore:Math.round(score*1e8)/1e8};
   }).filter(h=>h.lexicalScore>0)
     .sort((a,b)=>b.lexicalScore-a.lexicalScore||a.passageId.localeCompare(b.passageId));
   return {metric:step.metric,hits:ranked.slice(0,topK),
     retrievalIsEvidence:false as const,sourceIdentityVerified:false as const};
 });
 return {purpose:'phase122_local_bm25_candidate_search',corpusPassages:docs.length,
    queriesAttempted:attempted,results,publicRankingAuthorized:false,sourceRightsAuthenticated:false};
}
