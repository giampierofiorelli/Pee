/** Phase247 — relational, source-graded category knowledge on the Phase246 store.
 *
 * Category items (goals, outcomes, mechanisms, measurement methods, failure modes...) become nodes; this module
 * adds typed relations between them and observed declared attributes, each with an explicit support grade:
 *  - hypothesis          assistant/operator framing, no source behind it;
 *  - method_reference    a cited professional test method MEASURES or ASSESSES the target (not a result);
 *  - reviewed            accepted by a verified reviewer receipt citing store revisions;
 *  - evidence_supported  reviewed AND citing an independent original-test revision (results, not a method page).
 * The graph compiles into the existing Phase116 CategoryModel116, whose audit reports goals no measured
 * endpoint covers. Nothing here ranks products or establishes performance.
 */
import {createHash} from 'node:crypto';
import type {KnowledgeStore246,ReviewReceipt246} from './phase246_knowledge_store.js';
import {validateModel116,auditCategoryTemplate116,type CategoryModel116,type LinkKind116} from './phase116_category_function_model.js';

/** Phase269: 'requires_condition' links a measurement to a test condition without which its results are not comparable. */
export type RelationKind247='enables'|'may_support'|'measured_by'|'may_risk'|'not_sufficient_for'|'requires_condition';
export type Support247='hypothesis'|'method_reference'|'reviewed'|'evidence_supported';
export interface RelationInput247 {categoryId:string;from:string;to:string;kind:RelationKind247;qualification:string;
 support:'hypothesis'|'method_reference';sourceRevisionIds?:readonly string[];}
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const REF=/^(?:item:cat_[0-9a-f]{20}|attr:[a-z0-9][a-z0-9 ]{0,59})$/;

function sourceType(store:KnowledgeStore246,revisionId:string):string|null{
 return (store.db.prepare('SELECT s.source_type FROM revisions r JOIN sources s USING(source_id) WHERE r.revision_id=?').get(revisionId) as {source_type:string}|undefined)?.source_type??null;
}
function itemExists(store:KnowledgeStore246,categoryId:string,ref:string):boolean{
 if(ref.startsWith('attr:'))return true;
 return !!store.db.prepare('SELECT 1 FROM category_items WHERE item_id=? AND category_id=?').get(ref.slice(5),categoryId);
}
/** Adds a relation (idempotent). A method reference must cite a revision from an original-test or editorial
 * publisher; a hypothesis cites nothing it does not have. */
export function addRelation247(store:KnowledgeStore246,r:RelationInput247,at=new Date().toISOString()):string{
 if(!/^[a-z][a-z0-9_]{0,79}$/.test(r.categoryId)||!REF.test(r.from)||!REF.test(r.to)||r.from===r.to)throw Error('247_invalid_relation_ref');
 if(!['enables','may_support','measured_by','may_risk','not_sufficient_for','requires_condition'].includes(r.kind))throw Error('247_invalid_relation_kind');
 if(!r.qualification||r.qualification.length>300||/[<>\r\n]/.test(r.qualification))throw Error('247_invalid_qualification');
 if(!itemExists(store,r.categoryId,r.from)||!itemExists(store,r.categoryId,r.to))throw Error('247_unknown_item');
 const revs=[...(r.sourceRevisionIds??[])];
 for(const id of revs)if(!sourceType(store,id))throw Error('246_unknown_source_revision');
 if(r.support==='method_reference'&&!revs.some(id=>['independent_original_test','editorial'].includes(sourceType(store,id)!)))throw Error('247_method_reference_requires_test_publisher_source');
 if(r.support!=='hypothesis'&&r.support!=='method_reference')throw Error('247_reviewed_support_requires_review');
 const id='rel_'+sha([r.categoryId,r.from,r.to,r.kind].join('|')).slice(0,20);
 if(!store.db.prepare('SELECT 1 FROM category_relations WHERE relation_id=?').get(id)){
  store.db.prepare('INSERT INTO category_relations VALUES (?,?,?,?,?,?,?,?,NULL,?,?)').run(id,r.categoryId,r.from,r.to,r.kind,r.support,r.qualification,
   JSON.stringify(revs.sort()),at,at);
  store.event('category_relation_added',{relationId:id,categoryId:r.categoryId,kind:r.kind,support:r.support},at);
  store.invalidate(['category:'+r.categoryId],'category_relation_added');
 }
 return id;
}
/** Promotion needs a verified receipt; 'evidence_supported' also needs an independent original-test revision. */
export function reviewRelation247(store:KnowledgeStore246,relationId:string,to:'reviewed'|'evidence_supported',receipt:ReviewReceipt246,
 verify:(r:ReviewReceipt246)=>boolean):void{
 const rel=store.db.prepare('SELECT * FROM category_relations WHERE relation_id=?').get(relationId) as Record<string,string>|undefined;
 if(!rel)throw Error('247_unknown_relation');
 if(!verify||!verify(receipt)||!receipt.sourceRevisionIds.length)throw Error('246_review_not_verified');
 for(const id of receipt.sourceRevisionIds)if(!sourceType(store,id))throw Error('246_unknown_source_revision');
 if(to==='evidence_supported'&&!receipt.sourceRevisionIds.some(id=>sourceType(store,id)==='independent_original_test'))
  throw Error('247_evidence_requires_independent_original_test');
 store.db.prepare('UPDATE category_relations SET support=?,review_json=?,updated_at=? WHERE relation_id=?').run(to,JSON.stringify(receipt),receipt.reviewedAt,relationId);
 store.event('category_relation_reviewed',{relationId,to,reviewId:receipt.reviewId},receipt.reviewedAt);
 store.invalidate(['category:'+rel.category_id],'category_relation_reviewed');
}
export type Sufficiency247='establishes'|'informs_only'|'unclear';
export type AssessmentBasis247='teaching_source_statement'|'blind_source_verification'|'reviewed_receipt';
export interface RelationAssessmentInput247 {relationId:string;value:Sufficiency247;basis:AssessmentBasis247;citation:string;assessor:string;note?:string;
 independence?:'same_model_not_independent'|'human_reviewer'}
/** S78: records an assessment of whether a measured_by relation establishes its outcome (journaled, idempotent by content).
 * A 'teaching_source_statement' or 'blind_source_verification' must cite where the source says so; a reviewed receipt
 * is recorded by reviewRelation247, not here. A later assessment by the same basis and assessor supersedes the earlier. */
export function assessRelation247(store:KnowledgeStore246,a:RelationAssessmentInput247,at=new Date().toISOString()):string{
 const rel=store.db.prepare('SELECT category_id,kind FROM category_relations WHERE relation_id=?').get(a.relationId) as {category_id:string;kind:string}|undefined;
 if(!rel)throw Error('247_unknown_relation');if(rel.kind!=='measured_by')throw Error('247_sufficiency_only_for_measured_by');
 if(!['establishes','informs_only','unclear'].includes(a.value))throw Error('247_invalid_sufficiency');
 if(!['teaching_source_statement','blind_source_verification'].includes(a.basis))throw Error('247_invalid_assessment_basis');
 if(!a.citation||a.citation.trim().length<3||a.citation.length>400||/[<>\r\n]/.test(a.citation))throw Error('247_assessment_needs_citation');
 if(!/^[a-z0-9][a-z0-9_.:-]{1,79}$/i.test(a.assessor))throw Error('247_invalid_assessor');
 const independence=a.independence??'same_model_not_independent';
 const id='ras_'+sha([a.relationId,'sufficiency',a.value,a.basis,a.citation,a.assessor].join('|')).slice(0,20);
 if(store.db.prepare('SELECT 1 FROM relation_assessments WHERE assessment_id=?').get(id))return id;
 store.db.exec('BEGIN IMMEDIATE');
 try{
  store.db.prepare('INSERT INTO relation_assessments VALUES (?,?,?,?,?,?,?,?,?,?,NULL)').run(id,a.relationId,'sufficiency',a.value,a.basis,a.citation,a.assessor,a.note?.slice(0,300)??null,independence,at);
  store.db.prepare("UPDATE relation_assessments SET superseded_by=? WHERE relation_id=? AND aspect='sufficiency' AND basis=? AND assessor=? AND assessment_id<>? AND superseded_by IS NULL").run(id,a.relationId,a.basis,a.assessor,id);
  store.event('category_relation_assessed',{relationId:a.relationId,assessmentId:id,aspect:'sufficiency',value:a.value,basis:a.basis},at);
  store.invalidate(['category:'+rel.category_id],'category_relation_assessed');
  store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
 return id;
}
/** S78: the current sufficiency of a measured_by relation from its active assessments. Positive only when some source-
 * citing assessment says 'establishes' and none says otherwise; a disagreement is 'contested' (never establishes). */
/** S85 (owner decision: a same-model assessment of the owner's teaching package is not, by itself, sufficient positive
 * evidence for public ranking; source independence and assessor independence are distinct; no blanket human approval).
 * What, besides the assessments' verdict, supports an 'established' state for ranking:
 *  - 'independent_assessor': an 'establishes' assessment by an assessor independent of the model (human_reviewer);
 *  - 'original_evidence': the relation was promoted to evidence_supported (a verified receipt citing an independent
 *    original-test revision, reviewRelation247);
 *  - 'reviewed_receipt': the relation was promoted to reviewed by a verified receipt citing its source revisions.
 * null: the verdict rests on same-model readings only. Never a basis when the state is not 'established'. */
export type RankingBasis247='independent_assessor'|'original_evidence'|'reviewed_receipt';
export function sufficiencyOf247(store:KnowledgeStore246,relationId:string):{state:'established'|'informs_only'|'unclear'|'contested'|'unassessed';
 assessments:{value:string;basis:string;citation:string;assessor:string;independence:string}[];rankingBasis:RankingBasis247|null}{
 const rows=store.db.prepare("SELECT value,basis,citation,assessor,independence FROM relation_assessments WHERE relation_id=? AND aspect='sufficiency' AND superseded_by IS NULL ORDER BY assessment_id").all(relationId) as {value:string;basis:string;citation:string;assessor:string;independence:string}[];
 if(!rows.length)return {state:'unassessed',assessments:[],rankingBasis:null};
 const v=new Set(rows.map(r=>r.value));
 const state=v.size>1?'contested':v.has('establishes')?'established':v.has('informs_only')?'informs_only':'unclear';
 let rankingBasis:RankingBasis247|null=null;
 if(state==='established'){const support=(store.db.prepare('SELECT support FROM category_relations WHERE relation_id=?').get(relationId) as {support:string}|undefined)?.support;
  rankingBasis=rows.some(r=>r.value==='establishes'&&r.independence==='human_reviewer')?'independent_assessor':
   support==='evidence_supported'?'original_evidence':support==='reviewed'?'reviewed_receipt':null;}
 return {state,assessments:rows,rankingBasis};
}
/** Relations of a category whose item endpoints are active. Audit S77 (A2-F3): a relation of a retired or superseded
 * item stays in the table (history) but is no longer returned; consumers had shown such relations as raw refs and counted
 * them (4 dehumidifier relations). Attribute endpoints (`attr:`) are not items and are kept. */
export function relations247(store:KnowledgeStore246,categoryId:string){
 const active=new Set((store.db.prepare('SELECT item_id FROM category_items WHERE category_id=? AND superseded_by IS NULL').all(categoryId) as {item_id:string}[]).map(r=>'item:'+r.item_id));
 const live=(ref:string)=>!ref.startsWith('item:')||active.has(ref);
 return (store.db.prepare('SELECT * FROM category_relations WHERE category_id=? ORDER BY relation_id').all(categoryId) as Record<string,string>[]).filter(r=>live(r.from_ref)&&live(r.to_ref)).map(r=>({
  relationId:r.relation_id,from:r.from_ref,to:r.to_ref,kind:r.kind as RelationKind247,support:r.support as Support247,qualification:r.qualification,
  sourceRevisionIds:JSON.parse(r.source_revision_ids_json) as string[]}));
}

/** Declared-attribute vocabulary of a category: which attributes product pages declare (labels only), on how
 * many distinct active products and source types. Frequency describes pages, not importance or performance. */
export function attributeVocabulary247(store:KnowledgeStore246,categoryId:string,minProducts=2){
 const rows=store.db.prepare(`SELECT rp.property_key,rp.property_label,rp.product_id,s.source_type FROM revision_properties rp
  JOIN revisions r USING(revision_id) JOIN sources s USING(source_id) JOIN products p ON p.product_id=rp.product_id
  WHERE r.state='current' AND p.identity_state NOT IN ('unsupported_after_rederivation','merged') AND p.category_hypotheses_json LIKE ?`).all('%"'+categoryId+'"%') as
  {property_key:string;property_label:string;product_id:string;source_type:string}[];
 const products=new Set(rows.map(r=>r.product_id)).size;
 const by=new Map<string,{labels:Set<string>;products:Set<string>;sourceTypes:Set<string>}>();
 for(const r of rows){const e=by.get(r.property_key)??{labels:new Set(),products:new Set(),sourceTypes:new Set()};
  e.labels.add(r.property_label);e.products.add(r.product_id);e.sourceTypes.add(r.source_type);by.set(r.property_key,e);}
 const attributes=[...by].filter(([,e])=>e.products.size>=minProducts).map(([key,e])=>({key,labels:[...e.labels].sort().slice(0,5),
  products:e.products.size,sourceTypes:[...e.sourceTypes].sort()})).sort((a,b)=>b.products-a.products||a.key.localeCompare(b.key));
 return {categoryId,productsWithDeclarations:products,attributes,
  note:'Counts of pages declaring an attribute (labels only, no values). Frequency of declaration is not evidence of importance or performance.'};
}

const KIND116:Record<RelationKind247,LinkKind116|null>={enables:'enables',may_support:'may_support',measured_by:'measured_by',may_risk:'may_risk',not_sufficient_for:null,requires_condition:null};
/** Compiles store items + relations into a Phase116 model and runs its audit. Goals: user_goals/performance_outcomes
 * items; mechanisms: mechanisms items; endpoints: quality_measurements items; failure modes: failure_modes_safety
 * items linked by may_risk. Relations without a Phase116 counterpart (not_sufficient_for) stay in the store. */
export function compileTo116(store:KnowledgeStore246,categoryId:string){
 const items=store.categoryItems246(categoryId);
 const nodeId=(i:{itemId:string;concept:{id:string}|null})=>(i.concept?.id??'i_'+i.itemId.slice(4)).slice(0,60);
 const goals=items.filter(i=>i.section==='user_goals'||(i.section==='performance_outcomes'&&i.concept));
 const mechs=items.filter(i=>i.section==='mechanisms');
 const ends=items.filter(i=>i.section==='quality_measurements');
 // Items sharing a concept id are one node (several statements about the same concept); the first item's
 // statement describes it. Items without a concept are their own nodes.
 const idOf=new Map<string,string>();const seen=new Set<string>();
 const conceptNode=new Map<string,string>();
 const take=(list:typeof items)=>list.filter(i=>{
  if(i.concept&&conceptNode.has(i.concept.id)){idOf.set('item:'+i.itemId,conceptNode.get(i.concept.id)!);return false;}
  let id=nodeId(i);while(seen.has(id))id=(id+'_x').slice(-60);seen.add(id);idOf.set('item:'+i.itemId,id);
  if(i.concept)conceptNode.set(i.concept.id,id);return true;});
 const gNodes=take(goals),mNodes=take(mechs),eNodes=take(ends);
 const model:CategoryModel116={categoryId,modelVersion:'v247_store',
  functions:gNodes.map(i=>({id:idOf.get('item:'+i.itemId)!,description:i.statement.slice(0,200),kind:i.section==='user_goals'?'primary_goal' as const:'secondary_goal' as const})),
  mechanisms:mNodes.map(i=>({id:idOf.get('item:'+i.itemId)!,description:i.statement.slice(0,200),stage:'during' as const,cadence:'unspecified' as const,target:categoryId})),
  endpoints:eNodes.map(i=>({id:idOf.get('item:'+i.itemId)!,target:categoryId,endpoint:'unspecified' as const,methodScope:i.statement.slice(0,200)})),
  links:[],failureModes:[],sourceUrls:[]};
 const rels=relations247(store,categoryId);
 for(const r of rels){const k=KIND116[r.kind];const a=idOf.get(r.from),b=idOf.get(r.to);
  if(k&&a&&b&&a!==b&&!model.links.some(l=>l.from===a&&l.to===b&&l.kind===k))(model.links as {from:string;to:string;kind:LinkKind116;qualification:string}[]).push({from:a,to:b,kind:k,qualification:`[${r.support}] ${r.qualification}`.slice(0,300)});}
 for(const r of rels)if(r.kind==='may_risk'){const f=items.find(i=>'item:'+i.itemId===r.from&&i.section==='failure_modes_safety');const g=idOf.get(r.to);
  if(f&&g)(model.failureModes as {id:string;affects:string;description:string}[]).push({id:('f_'+f.itemId.slice(4)).slice(0,60),affects:g,description:f.statement.slice(0,200)});}
 const urls=new Set<string>();
 for(const r of rels)for(const id of r.sourceRevisionIds){const u=(store.db.prepare('SELECT url FROM revisions WHERE revision_id=?').get(id) as {url:string}|undefined)?.url;if(u)urls.add(u);}
 const final:CategoryModel116={...model,sourceUrls:[...urls].sort()};
 if(!final.functions.length||!final.endpoints.length)return {model:null,audit:null,reason:'no_goals_or_measurement_methods_yet'};
 validateModel116(final);
 return {model:final,audit:auditCategoryTemplate116(final),reason:null};
}

/** Research priorities derived from the graph state (deterministic, no ranking of products). */
export function researchPriorities247(store:KnowledgeStore246,categoryId:string){
 const items=store.categoryItems246(categoryId);const rels=relations247(store,categoryId);
 const label=(ref:string)=>ref.startsWith('attr:')?`declared attribute "${ref.slice(5)}"`:(items.find(i=>'item:'+i.itemId===ref)?.statement.slice(0,90)??ref);
 const conceptOf=(ref:string)=>items.find(i=>'item:'+i.itemId===ref)?.concept?.id??ref;
 const measured=new Set(rels.filter(r=>r.kind==='measured_by').map(r=>conceptOf(r.to)));
 const goalSeen=new Set<string>();
 const goals=items.filter(i=>(i.section==='user_goals'||(i.section==='performance_outcomes'&&i.concept))&&!goalSeen.has(i.concept?.id??i.itemId)&&!!goalSeen.add(i.concept?.id??i.itemId));
 const vocab=attributeVocabulary247(store,categoryId).attributes;
 const related=new Set(rels.flatMap(r=>[r.from,r.to]));
 const out:{priority:number;kind:string;subject:string;action:string}[]=[];
 for(const g of goals)if(!measured.has(g.concept?.id??'item:'+g.itemId))out.push({priority:1,kind:'goal_without_measurement_method',subject:g.statement.slice(0,120),action:'find an original test method that measures this outcome'});
 for(const r of rels)if(r.support==='hypothesis')out.push({priority:2,kind:'unsupported_relation',subject:`${label(r.from)} ${r.kind} ${label(r.to)}`,action:'find independent evidence for or against this relation'});
 for(const r of rels)if(r.support==='method_reference')out.push({priority:3,kind:'method_known_results_missing',subject:`${label(r.from)} ${r.kind} ${label(r.to)}`,action:'obtain original test results that use this method (rights permitting)'});
 for(const a of vocab)if(!related.has('attr:'+a.key))out.push({priority:4,kind:'declared_attribute_unexplained',subject:`"${a.labels[0]}" declared for ${a.products} products`,action:'establish which outcome, if any, this attribute affects before using it'});
 return out.sort((a,b)=>a.priority-b.priority||a.subject.localeCompare(b.subject));
}

// ---------------------------------------------------------------------------------------------------------------------
// A6 (first increment, 2026-10-21): moved unchanged from phase253_request_advice.ts, where it created the R3-P import
// cycle need_interpretation <-> phase253. It reads only this module's relations and sufficiency verdicts and the
// store's category items. phase253 re-exports it.
/** Phase269: what category knowledge says about each recognised need. Measurements are 'measurement' concept items;
 * 'measured_by' links a measurement to the outcome it establishes, 'not_sufficient_for' marks a proxy (a declared
 * attribute or a measurement), 'requires_condition' the test conditions without which results are not comparable. */
export interface NeedKnowledge269 {need:string;kind:string|null;relevant:string[];proxies:string[];conditions:string[];notes:Map<string,string>;statements:Map<string,string>;
 /** S78: per measurement linked by measured_by: its relation, the assessed sufficiency, and ITS required conditions. */
 byMeasure:Map<string,{relationId:string;sufficiency:'established'|'informs_only'|'unclear'|'contested'|'unassessed';conditions:string[];
  /** S85: what supports an established verdict for ranking beyond same-model readings (null: nothing) */
  rankingBasis:RankingBasis247|null}>}
export function needKnowledge269(store:KnowledgeStore246,category:string,needs:readonly string[]):NeedKnowledge269[]{
 const items=store.categoryItems246(category);const rels=relations247(store,category);
 const byRef=new Map(items.map(i=>['item:'+i.itemId,i]));
 const measureOf=(ref:string)=>{const i=byRef.get(ref);return i?.concept?.kind==='measurement'?i.concept.id:null;};
 const attrId=(ref:string)=>'attr:'+ref.slice(5).replace(/\s+/g,'_');
 return needs.map(need=>{
  const targets=new Set(items.filter(i=>i.concept?.id===need&&i.concept.kind!=='measurement').map(i=>'item:'+i.itemId));
  const into=rels.filter(r=>targets.has(r.to));
  const relevant=[...new Set(into.filter(r=>r.kind==='measured_by').map(r=>measureOf(r.from)).filter((x):x is string=>!!x))].sort();
  const notes=new Map<string,string>();const proxies:string[]=[];
  for(const r of into.filter(r=>r.kind==='not_sufficient_for')){const id=r.from.startsWith('attr:')?attrId(r.from):measureOf(r.from);if(id&&!proxies.includes(id)){proxies.push(id);notes.set(id,r.qualification);}}
  const relevantRefs=new Set(items.filter(i=>i.concept?.kind==='measurement'&&relevant.includes(i.concept.id)).map(i=>'item:'+i.itemId));
  const conditions=[...new Set(rels.filter(r=>r.kind==='requires_condition'&&relevantRefs.has(r.from)).map(r=>measureOf(r.to)).filter((x):x is string=>!!x))].sort();
  const statements=new Map(items.filter(i=>i.concept?.kind==='measurement').map(i=>[i.concept!.id,i.statement.replace(/\s*\[[^\]]*\]\s*$/,'')]));
  const byMeasure:NeedKnowledge269['byMeasure']=new Map();
  for(const r of into.filter(r=>r.kind==='measured_by')){const m=measureOf(r.from);if(!m)continue;
   const conds=[...new Set(rels.filter(x=>x.kind==='requires_condition'&&x.from===r.from).map(x=>measureOf(x.to)).filter((x):x is string=>!!x))].sort();
   const prev=byMeasure.get(m);const so=sufficiencyOf247(store,r.relationId);const suff=so.state;
   // two measured_by relations for one measurement (two items of the same id): the weaker sufficiency holds
   const rank={established:4,informs_only:2,unclear:1,unassessed:0,contested:-1} as const;
   // S85: the weaker relation decides; with equal verdicts, a missing ranking basis is weaker
   if(!prev||rank[suff]<rank[prev.sufficiency]||(rank[suff]===rank[prev.sufficiency]&&!so.rankingBasis))
    byMeasure.set(m,{relationId:r.relationId,sufficiency:suff,conditions:[...new Set([...(prev?.conditions??[]),...conds])].sort(),rankingBasis:so.rankingBasis});
   else byMeasure.set(m,{...prev,conditions:[...new Set([...prev.conditions,...conds])].sort()});}
  return {need,kind:items.find(i=>i.concept?.id===need)?.concept?.kind??null,relevant,proxies:proxies.sort(),conditions,notes,statements,byMeasure};
 });
}
