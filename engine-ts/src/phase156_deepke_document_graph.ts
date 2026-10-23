/**
 * Phase156: Document-level mention graph adapted from DeepKE DocRED's
 * document preprocessing data model (`sents`, `vertexSet`, `h`, `t`, `evidence`)
 * in deepke/relation_extraction/document/prepro.py (MIT).
 * DeepKE's torch encoder and trained relation classifier are NOT imported:
 * this module accepts only upstream candidate mentions and explicit evidence,
 * it never predicts a relation from embeddings or establishes SKU identity.
 * Original source and MIT licence in third_party/phase156_reference_sources.
 */
export interface GraphMention156 {id:string;start:number;end:number;surface:string;role:string;contextCategories:string[];}
export interface GraphRelation156 {headMentionId:string;tailMentionId:string;type:string;evidenceStart:number;evidenceEnd:number;}
export interface EvidenceSentence156 {id:number;start:number;end:number;sha256?:string;}
export interface DocumentVertex156 {id:string;writtenSurface:string;mentionIds:string[];sentenceIds:number[];identityVerified:false;}
export interface DocumentEdge156 {head:string;tail:string;type:string;evidenceSentenceIds:number[];proposedOnly:true;}
export interface DocumentGraph156 {sentences:EvidenceSentence156[];vertices:DocumentVertex156[];edges:DocumentEdge156[];
 unresolvedRelationCount:number;unanchoredMentionCount:number;identityVerified:false;canonicalWriteAuthorized:false;rankingAuthorized:false;}
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const overlaps=(a:number,b:number,c:number,d:number)=>a<d&&c<b;
export function evidenceSentences156(text:string):EvidenceSentence156[]{
 if(typeof text!=='string'||text.length>2_000_000)throw Error('invalid_document_graph_text_156');
 const out:EvidenceSentence156[]=[];let start=0;
 // A blank line or terminal punctuation followed by whitespace marks a
 // sentence boundary; decimal points and abbreviated units are preserved.
 for(let i=0;i<text.length;i++){
  const c=text[i],next=text[i+1]??'';
  const boundary=c==='\n'||((c==='.'||c==='?'||c==='!')&&(i===text.length-1||/\s/.test(next))&&
   !(c==='.'&&/\b(?:cu|ft|vs|etc|e\.g)\.$/i.test(text.slice(Math.max(start,i-6),i+1))));
  if(boundary){if(text.slice(start,i+1).trim())out.push({id:out.length,start,end:i+1});start=i+1;}
 }
 if(text.slice(start).trim())out.push({id:out.length,start,end:text.length});
 return out;
}
export function buildDocumentGraph156(text:string,mentions:readonly GraphMention156[],relations:readonly GraphRelation156[]):DocumentGraph156{
 if(mentions.length>20000||relations.length>25000)throw Error('document_graph_budget_156');
 const sentences=evidenceSentences156(text),byId=new Map<string,GraphMention156>();
 for(const m of mentions){if(m.start<0||m.end>text.length||m.start>=m.end||text.slice(m.start,m.end)!==m.surface||byId.has(m.id))
  throw Error('invalid_document_mention_156');byId.set(m.id,m);}
 // In DeepKE vertexSet is a supplied grouping, not learned by prepro.py.
 // We group *only identical written surfaces*; cross-form SKU merges are not inferred.
 const vertices=new Map<string,DocumentVertex156>();let unanchored=0;
 for(const m of mentions){
  const k=norm(m.surface),found=sentences.filter(s=>m.start>=s.start&&m.end<=s.end).map(s=>s.id);
  if(!found.length)unanchored++;
  let v=vertices.get(k);if(!v){v={id:`surface_${vertices.size}`,writtenSurface:m.surface,mentionIds:[],sentenceIds:[],identityVerified:false};vertices.set(k,v);}
  v.mentionIds.push(m.id);v.sentenceIds.push(...found);
 }
 const vertexList=[...vertices.values()].map(v=>({...v,mentionIds:[...new Set(v.mentionIds)].sort(),sentenceIds:[...new Set(v.sentenceIds)].sort((a,b)=>a-b)}));
 const member=new Map<string,string>();for(const v of vertexList)for(const id of v.mentionIds)member.set(id,v.id);
 const edges=new Map<string,DocumentEdge156>();let missing=0;
 for(const r of relations){
  const head=byId.get(r.headMentionId),tail=byId.get(r.tailMentionId);
  if(!head||!tail||r.evidenceStart<0||r.evidenceEnd>text.length||r.evidenceEnd<=r.evidenceStart){missing++;continue;}
  const h=member.get(head.id)!,t=member.get(tail.id)!;
  if(h===t){missing++;continue;}
  const eids=sentences.filter(s=>overlaps(s.start,s.end,r.evidenceStart,r.evidenceEnd)).map(s=>s.id);
  if(!eids.length){missing++;continue;}
  const key=`${h}|${t}|${r.type}`,edge=edges.get(key);
  if(edge)edge.evidenceSentenceIds.push(...eids);
  else edges.set(key,{head:h,tail:t,type:r.type,evidenceSentenceIds:[...eids],proposedOnly:true});
 }
 return {sentences,vertices:vertexList,edges:[...edges.values()].map(e=>({...e,evidenceSentenceIds:[...new Set(e.evidenceSentenceIds)].sort((a,b)=>a-b)})),
  unresolvedRelationCount:missing,unanchoredMentionCount:unanchored,identityVerified:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
