/** Phase177: web-first product-decision state. English UI actions are the
 * authority for editing requirements; NLP suggestions cannot silently become
 * confirmed hard criteria. Research-only: no product rank/exclusion authority.
 * Hashes are deterministic integrity checks, NOT signatures/authentication.
 */
import {createHash} from 'node:crypto';

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const keyOk=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_.-]{0,90}$/.test(s)&&!s.split('.').some(p=>['__proto__','prototype','constructor'].includes(p));
const descriptionOk=(s:unknown):s is string=>typeof s==='string'&&s.length>=3&&s.length<=300&&s.trim()===s&& !/[\u0000-\u001f]/.test(s);
const plain=(value:unknown):boolean=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
export type CriterionStatus177='candidate'|'confirmed'|'denied'|'withdrawn'|'unknown';
export type CriterionPriority177='hard'|'high'|'normal'|'low';
export type CriterionValue177=
 {kind:'boolean';value:boolean}|
 {kind:'choice';value:string}|
 {kind:'quantity';value:number;unit:string;
  /** S103: the limit itself does not satisfy the criterion (strict bound) */ exclusive?:true};
export type Task177='product_selection'|'solution_comparison'|'use_or_troubleshoot'|'unresolved';
export interface Criterion177{
 key:string;label:string;value:CriterionValue177;status:CriterionStatus177;
 priority:CriterionPriority177;
 provenance:{source:'english_intake_candidate'|'user_web_control'|'user_explicit_confirmation'|'user_request_statement';referenceHash:string|null};
 /** Confirmation is an explicit UI/user action; not the outcome of language inference. */
}
export interface ChoiceScope177 {task:Task177;category:string|null;}
export interface DecisionSnapshot177 {
 phase:177;schemaVersion:'177.1';decisionId:string;revision:number;
 parentHash:string|null;changeHash:string|null;stateHash:string;
 scope:ChoiceScope177;criteria:readonly Criterion177[];
 /** Same confirmed choice must have same rank-input key irrespective of wording,
  * ordering, revision path or which user is speaking. Not proof of semantic equivalence. */
 rankInputFingerprint:string;
 userNeedIndependentlyValidated:false;engineeringEvidenceVerified:false;
 productEvidenceVerified:false;rankingAuthorized:false;exclusionsAuthorized:false;
}
export type DecisionAction177=
 {type:'set_scope';source:'user_web_control'|'user_explicit_confirmation'|'user_request_statement';scope:ChoiceScope177}|
 {type:'propose_candidate';source:'english_intake_candidate';key:string;label:string;value:CriterionValue177;referenceHash:string}|
 {type:'set_criterion';source:'user_web_control'|'user_explicit_confirmation';key:string;label:string;value:CriterionValue177;priority:CriterionPriority177}|
 {type:'confirm_candidate';source:'user_web_control'|'user_explicit_confirmation';key:string;priority:CriterionPriority177}|
 {type:'set_priority';source:'user_web_control'|'user_explicit_confirmation';key:string;priority:CriterionPriority177}|
 {type:'mark_criterion';source:'user_web_control'|'user_explicit_confirmation';key:string;status:'denied'|'withdrawn'|'unknown'}|
 /** Phase253: a requirement the user stated verbatim in the request ("at least 5 litres"), parsed without ambiguity.
  * It is confirmed with its own provenance and the sha256 of the verbatim span, so it stays distinguishable from both
  * a UI confirmation and an NLP inference. It never overwrites a user-control decision and can be withdrawn by one.
  * Inferred needs ("for a family") must still enter as propose_candidate. */
 {type:'state_in_request';source:'user_request_statement';key:string;label:string;value:CriterionValue177;priority:CriterionPriority177;referenceHash:string};
export interface DecisionRevision177 {
 previousHash:string;nextHash:string;revision:number;
 actionHash:string;rankInputsChanged:boolean;criteriaChanged:readonly string[];
 rankingAuthorized:false;exclusionsAuthorized:false;
}
const statusOk=(v:unknown):v is CriterionStatus177=>['candidate','confirmed','denied','withdrawn','unknown'].includes(String(v));
const priorityOk=(v:unknown):v is CriterionPriority177=>['hard','high','normal','low'].includes(String(v));
function validatedValue(v:unknown):CriterionValue177{
 if(!plain(v))throw Error('phase177_invalid_criterion_value');
 const x=v as unknown as CriterionValue177;
 if(x.kind==='boolean'&&typeof x.value==='boolean'&&Object.keys(x).sort().join(',')==='kind,value')return {kind:x.kind,value:x.value};
 if(x.kind==='choice'&&typeof x.value==='string'&&x.value.length>0&&x.value.length<=120&&x.value.trim()===x.value&&!/[\u0000-\u001f]/.test(x.value)&&Object.keys(x).sort().join(',')==='kind,value')return {kind:x.kind,value:x.value};
 if(x.kind==='quantity'&&typeof x.value==='number'&&Number.isFinite(x.value)&&Math.abs(x.value)<=1e12&&keyOk(x.unit)&&Object.keys(x).sort().join(',')==='kind,unit,value')return {kind:x.kind,value:x.value,unit:x.unit};
 // S103: a strict limit ("more than 4 L", "under £120") excludes the limit itself; absent means inclusive (unchanged)
 if(x.kind==='quantity'&&typeof x.value==='number'&&Number.isFinite(x.value)&&Math.abs(x.value)<=1e12&&keyOk(x.unit)&&x.exclusive===true&&Object.keys(x).sort().join(',')==='exclusive,kind,unit,value')return {kind:x.kind,value:x.value,unit:x.unit,exclusive:true};
 throw Error('phase177_invalid_criterion_value');
}
function validatedScope(scope:ChoiceScope177):ChoiceScope177{
 if(!plain(scope)||!['product_selection','solution_comparison','use_or_troubleshoot','unresolved'].includes(scope.task)||
  (scope.category!==null&&!keyOk(scope.category))||Object.keys(scope).sort().join(',')!=='category,task')throw Error('phase177_invalid_scope');
 return {task:scope.task,category:scope.category};
}
const sorted=(criteria:readonly Criterion177[])=>[...criteria].sort((a,b)=>a.key.localeCompare(b.key,'en'));
function rankKey(scope:ChoiceScope177,criteria:readonly Criterion177[]):string{
 return hash(JSON.stringify({scope,confirmed:sorted(criteria).filter(c=>c.status==='confirmed').map(c=>[c.key,c.value,c.priority])}));
}
function statePayload(s:Omit<DecisionSnapshot177,'stateHash'|'rankInputFingerprint'|'userNeedIndependentlyValidated'|'engineeringEvidenceVerified'|'productEvidenceVerified'|'rankingAuthorized'|'exclusionsAuthorized'>):string{
 return JSON.stringify({phase:177,schemaVersion:'177.1',decisionId:s.decisionId,revision:s.revision,parentHash:s.parentHash,changeHash:s.changeHash,scope:s.scope,criteria:sorted(s.criteria)});
}
function sealed(s:Omit<DecisionSnapshot177,'stateHash'|'rankInputFingerprint'|'userNeedIndependentlyValidated'|'engineeringEvidenceVerified'|'productEvidenceVerified'|'rankingAuthorized'|'exclusionsAuthorized'>):DecisionSnapshot177{
 const criteria=sorted(s.criteria).map(c=>({key:c.key,label:c.label,value:validatedValue(c.value),status:c.status,priority:c.priority,provenance:{...c.provenance}}));
 const data={...s,scope:validatedScope(s.scope),criteria};
 const result:DecisionSnapshot177={...data,stateHash:hash(statePayload(data)),rankInputFingerprint:rankKey(data.scope,criteria),userNeedIndependentlyValidated:false,engineeringEvidenceVerified:false,productEvidenceVerified:false,rankingAuthorized:false,exclusionsAuthorized:false};
 for(const c of criteria){Object.freeze(c.value);Object.freeze(c.provenance);Object.freeze(c);}
 Object.freeze(criteria);Object.freeze(result.scope);return Object.freeze(result);
}
export function assertDecisionSnapshot177(s:DecisionSnapshot177):void{
 if(!s||s.phase!==177||s.schemaVersion!=='177.1'||!keyOk(s.decisionId)||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision>500||
  (s.parentHash!==null&&!/^[0-9a-f]{64}$/.test(s.parentHash))||
  (s.changeHash!==null&&!/^[0-9a-f]{64}$/.test(s.changeHash))||
  s.userNeedIndependentlyValidated!==false||s.engineeringEvidenceVerified!==false||s.productEvidenceVerified!==false||s.rankingAuthorized!==false||s.exclusionsAuthorized!==false||
  !Array.isArray(s.criteria)||s.criteria.length>100)throw Error('phase177_invalid_snapshot');
 validatedScope(s.scope);
 const ids=new Set<string>();
 for(const c of s.criteria){
  if(!keyOk(c?.key)||ids.has(c.key)||!descriptionOk(c.label)||!statusOk(c.status)||!priorityOk(c.priority)||
    !plain(c.provenance)||!['english_intake_candidate','user_web_control','user_explicit_confirmation','user_request_statement'].includes(c.provenance.source)||
    (c.provenance.referenceHash!==null&&!/^[0-9a-f]{64}$/.test(c.provenance.referenceHash)))throw Error('phase177_invalid_snapshot_criterion');
  if(c.status==='candidate'&&c.provenance.source!=='english_intake_candidate')throw Error('phase177_invalid_candidate_provenance');
  if(c.status==='confirmed'&&c.provenance.source==='english_intake_candidate')throw Error('phase177_unconfirmed_nlp_promotion');
  if(c.provenance.source==='user_request_statement'&&c.provenance.referenceHash===null)throw Error('phase177_request_statement_requires_span_hash');
  validatedValue(c.value);ids.add(c.key);
 }
 if(s.stateHash!==hash(statePayload(s))||s.rankInputFingerprint!==rankKey(s.scope,s.criteria))throw Error('phase177_snapshot_integrity_mismatch');
}
export function createDecision177(decisionId:string):DecisionSnapshot177{
 if(!keyOk(decisionId))throw Error('phase177_invalid_decision_id');
 return sealed({phase:177,schemaVersion:'177.1',decisionId,revision:0,parentHash:null,changeHash:null,
  scope:{task:'unresolved',category:null},criteria:[]});
}
export function applyDecisionAction177(s:DecisionSnapshot177,action:DecisionAction177):{snapshot:DecisionSnapshot177;delta:DecisionRevision177}{
 assertDecisionSnapshot177(s);
 if(!plain(action)||typeof action.type!=='string')throw Error('phase177_invalid_action');
 if(!['set_scope','propose_candidate','set_criterion','confirm_candidate','set_priority','mark_criterion','state_in_request'].includes(action.type))throw Error('phase177_unknown_action');
 if(s.revision>=500)throw Error('phase177_revision_limit');
 const items=sorted(s.criteria),map=new Map(items.map(c=>[c.key,c]));
 let scope=s.scope;let changed:string[]=[];
 if(action.type==='set_scope'){
  // Phase253: a product the user names in the request may set the scope of a fresh request snapshot.
  if(!['user_web_control','user_explicit_confirmation','user_request_statement'].includes(action.source))throw Error('phase177_untrusted_scope_edit');
  scope=validatedScope(action.scope);
 }else{
  if(!keyOk(action.key))throw Error('phase177_invalid_criterion_key');
  const old=map.get(action.key);
  if(action.type==='propose_candidate'){
   if(action.source!=='english_intake_candidate'||!descriptionOk(action.label)||! /^[a-f0-9]{64}$/.test(action.referenceHash))throw Error('phase177_untrusted_suggestion');
   if(!old){map.set(action.key,{key:action.key,label:action.label,value:validatedValue(action.value),status:'candidate',priority:'normal',provenance:{source:action.source,referenceHash:action.referenceHash}});changed=[action.key];}
   // A new NLP suggestion can NEVER overwrite any existing user decision.
  }else if(action.type==='state_in_request'){
   if(action.source!=='user_request_statement'||!descriptionOk(action.label)||!priorityOk(action.priority)||!/^[a-f0-9]{64}$/.test(action.referenceHash))throw Error('phase177_invalid_request_statement');
   // A request statement never overrides a decision made through user controls.
   if(!old||old.provenance.source==='english_intake_candidate'||old.provenance.source==='user_request_statement'){
    map.set(action.key,{key:action.key,label:action.label,value:validatedValue(action.value),status:'confirmed',priority:action.priority,
     provenance:{source:'user_request_statement',referenceHash:action.referenceHash}});changed=[action.key];}
  }else{
   if(!['user_web_control','user_explicit_confirmation'].includes(action.source))throw Error('phase177_user_control_required');
   if(action.type==='set_criterion'){
    if(!descriptionOk(action.label)||!priorityOk(action.priority))throw Error('phase177_bad_criterion_edit');
    map.set(action.key,{key:action.key,label:action.label,value:validatedValue(action.value),status:'confirmed',priority:action.priority,
     provenance:{source:action.source,referenceHash:null}});changed=[action.key];
   }else{
    if(!old)throw Error('phase177_unknown_criterion');
    if(action.type==='confirm_candidate'){
     if(old.status!=='candidate'||!priorityOk(action.priority))throw Error('phase177_candidate_not_confirmable');
     map.set(action.key,{...old,status:'confirmed',priority:action.priority,provenance:{source:action.source,referenceHash:old.provenance.referenceHash}});
    }else if(action.type==='set_priority'){
     if(old.status!=='confirmed'||!priorityOk(action.priority))throw Error('phase177_priority_requires_confirmation');
     map.set(action.key,{...old,priority:action.priority,provenance:{source:action.source,referenceHash:old.provenance.referenceHash}});
    }else if(action.type==='mark_criterion'){
     if(!['denied','withdrawn','unknown'].includes(action.status))throw Error('phase177_invalid_status_edit');
     map.set(action.key,{...old,status:action.status,provenance:{source:action.source,referenceHash:old.provenance.referenceHash}});
    }else throw Error('phase177_unknown_action');
    changed=[action.key];
   }
  }
 }
 const eventHash=hash(JSON.stringify(action));
 const next=sealed({phase:177,schemaVersion:'177.1',decisionId:s.decisionId,revision:s.revision+1,
  parentHash:s.stateHash,changeHash:eventHash,scope,criteria:[...map.values()]});
 return {snapshot:next,delta:{previousHash:s.stateHash,nextHash:next.stateHash,revision:next.revision,actionHash:eventHash,
  rankInputsChanged:next.rankInputFingerprint!==s.rankInputFingerprint,criteriaChanged:changed,
  rankingAuthorized:false,exclusionsAuthorized:false}};
}
/** Browser Undo is a NEW audited revision. No historical state is deleted.
 * A caller must possess the exact parent snapshot; this is NOT a login or signature proof. */
export function undoDecision177(current:DecisionSnapshot177,parent:DecisionSnapshot177){
 assertDecisionSnapshot177(current);assertDecisionSnapshot177(parent);
 if(current.decisionId!==parent.decisionId||current.revision!==parent.revision+1||current.parentHash!==parent.stateHash)throw Error('phase177_undo_parent_mismatch');
 const next=sealed({phase:177,schemaVersion:'177.1',decisionId:current.decisionId,revision:current.revision+1,parentHash:current.stateHash,
  changeHash:hash(JSON.stringify({type:'undo',target:parent.stateHash})),scope:parent.scope,criteria:parent.criteria});
 return {snapshot:next,delta:{previousHash:current.stateHash,nextHash:next.stateHash,revision:next.revision,
  rankInputsChanged:next.rankInputFingerprint!==current.rankInputFingerprint,criteriaChanged:sorted([...parent.criteria,...current.criteria]).map(c=>c.key).filter((v,i,a)=>a.indexOf(v)===i),rankingAuthorized:false,exclusionsAuthorized:false}};
}
/** Safe for intent-parity comparisons of structured CONFIRMED requirements only. */
export function compareDecisions177(a:DecisionSnapshot177,b:DecisionSnapshot177){
 assertDecisionSnapshot177(a);assertDecisionSnapshot177(b);
 const mA=new Map(a.criteria.map(c=>[c.key,c])),mB=new Map(b.criteria.map(c=>[c.key,c]));
 const keys=[...new Set([...mA.keys(),...mB.keys()])].sort();
 const changes=keys.filter(k=>JSON.stringify(mA.get(k)??null)!==JSON.stringify(mB.get(k)??null));
 return {rankInputsEqual:a.rankInputFingerprint===b.rankInputFingerprint,
  changeInConfirmedInputs:a.rankInputFingerprint!==b.rankInputFingerprint,
  changedCriterionKeys:changes,scopeChanged:JSON.stringify(a.scope)!==JSON.stringify(b.scope),
  realProductRankingHasBeenCompared:false,rankingAuthorized:false};
}
/** One web gesture may update several criteria; commit it as ONE reversible revision.
 * Pre-validation is all-or-nothing. Empty batches are a genuine no-op.
 */
export function applyDecisionBatch177(s:DecisionSnapshot177,actions:readonly DecisionAction177[]){
 assertDecisionSnapshot177(s);
 if(!Array.isArray(actions)||actions.length>100)throw Error('phase177_invalid_action_batch');
 if(actions.length===0)return {snapshot:s,delta:null};
 if(s.revision+actions.length>500)throw Error('phase177_revision_limit');
 let draft=s;
 for(const a of actions)draft=applyDecisionAction177(draft,a).snapshot;
 const next=sealed({phase:177,schemaVersion:'177.1',decisionId:s.decisionId,revision:s.revision+1,
  parentHash:s.stateHash,changeHash:hash(JSON.stringify(actions)),scope:draft.scope,criteria:draft.criteria});
 return {snapshot:next,delta:{previousHash:s.stateHash,nextHash:next.stateHash,revision:next.revision,
  actionHash:hash(JSON.stringify(actions)),rankInputsChanged:next.rankInputFingerprint!==s.rankInputFingerprint,
  criteriaChanged:[...new Set(actions.filter(a=>a.type!=='set_scope').map(a=>(a as Exclude<DecisionAction177,{type:'set_scope'}>).key))].sort(),
  rankingAuthorized:false,exclusionsAuthorized:false}};
}
