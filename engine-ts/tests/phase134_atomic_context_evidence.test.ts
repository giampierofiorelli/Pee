import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectAtomicCandidate134,inspectCandidateSet134,inspectLearnedProposal134,modifiersForPair134,auditSignals134,
 type AtomicEvidenceCandidate134,type IndependentSignal134} from '../src/phase134_atomic_context_evidence.js';
import type {Label132} from '../src/phase132_contextual_relation_guard.js';
import type {RelationDocument131} from '../src/phase131_local_relation_learning.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const doc=(text:string):RelationDocument131=>({text,sha256:sha(text),source:{id:'review_source',originalDocumentId:'review_v1',
 title:'Author controlled excerpt',url:'https://example.org/verified-review',role:'original_product_test'}});
const span=(text:string,word:string)=>{const i=text.indexOf(word);assert.ok(i>=0,`Missing: ${word}`);return {start:i,end:i+word.length};};
const sample=(text:string,s:string,o:string,label:Label132='measures',id='candidate_1')=>{
 const d=doc(text);const c:AtomicEvidenceCandidate134={id,label,subjectSpan:span(text,s),objectSpan:span(text,o),
  evidenceSpan:{start:0,end:text.length},sourceId:d.source.id,originalDocumentId:d.source.originalDocumentId,
  documentSha256:d.sha256,evidenceSha256:sha(text)};return {d,c};
};
const check=(text:string,s:string,o:string,label:Label132='measures')=>{
 const {d,c}=sample(text,s,o,label);return inspectAtomicCandidate134({document:d,candidate:c});
};
test('explicit affirmative link is quarantined as a candidate, never canonical truth',()=>{
 const x=check('The airflow metric measures particle delivery.','airflow metric','particle delivery');
 assert.equal(x.status,'quarantined_candidate');assert.deepEqual(x.reasons,['clear_bounded_context']);
 assert.equal(x.rankingAuthorized,false);assert.equal(x.canonicalWriteAuthorized,false);assert.equal(x.independentReviewRequired,true);
});
test('no evidence blocks positive measurement relationship',()=>{
 const x=check('No evidence establishes that the steam feature measures surface sterilization.','steam feature','surface sterilization');
 assert.equal(x.status,'rejected_candidate');assert.ok(x.reasons.includes('unsupported_polarity'));
 assert.ok(x.modifiers.some(m=>m.kind==='lack_of_evidence'&&m.literal==='No evidence'));
});
test('no evidence supports ONLY hypothesis of missing proof, not proof of ineffectiveness',()=>{
 const x=check('No evidence establishes that the steam feature measures surface sterilization.','steam feature','surface sterilization','not_evidence_of');
 assert.equal(x.status,'quarantined_candidate');assert.ok(x.reasons.includes('absence_of_evidence_not_proof_of_absence'));
});
test('does not improve is NOT the same as no evidence',()=>{
 const x=check('The steam attachment does not improve stain removal.','steam attachment','stain removal','not_evidence_of');
 assert.equal(x.status,'rejected_candidate');assert.ok(x.modifiers.some(m=>m.kind==='direct_negation'));
});
test('contrast splits claims: negation of B cannot spill onto A',()=>{
 const t='The airflow metric measures particle delivery, but no evidence links it to gas removal.';
 const a=check(t,'airflow metric','particle delivery');
 assert.equal(a.status,'quarantined_candidate');assert.equal(a.modifiers.length,0);
 const b=check(t,'it','gas removal');assert.equal(b.status,'rejected_candidate');
});
test('contrast does not license relations spanning clauses',()=>{
 const t='The airflow metric measures particle delivery, but gas removal is unverified.';
 const x=check(t,'airflow metric','gas removal');assert.equal(x.status,'abstain_for_review');
 assert.ok(x.reasons.includes('cross_clause'));
});
test('multi-sentence relation stays unknown without resolved coreference',()=>{
 const x=check('The robot has a heated dock. It removes more soil after two passes.','heated dock','more soil');
 assert.equal(x.status,'abstain_for_review');assert.ok(x.reasons.includes('cross_clause'));
});
test('uncertainty requires review rather than positive factual inference',()=>{
 const x=check('The fan setting may improve particulate capture.','fan setting','particulate capture','contributes_to');
 assert.equal(x.status,'abstain_for_review');assert.ok(x.modifiers.some(m=>m.kind==='uncertainty'));
});
test('hypothetical if cannot become an observed performance claim',()=>{
 const x=check('If the seals are intact, the chamber improves particle removal.','chamber','particle removal','contributes_to');
 assert.equal(x.status,'abstain_for_review');assert.ok(x.reasons.includes('hypothetical_not_observed'));
});
test('manufacturer attribution remains visible, never equated to independent verification',()=>{
 const x=check('The manufacturer claims that its heater improves hygiene.','heater','hygiene','contributes_to');
 assert.equal(x.status,'quarantined_candidate');assert.ok(x.reasons.includes('attributed_not_independent'));
});
test('pseudo-negation not only does not reverse polarity',()=>{
 const x=check('Not only does the fan improve particle flow.','fan','particle flow','contributes_to');
 assert.equal(x.status,'quarantined_candidate');assert.ok(x.modifiers.some(m=>m.kind==='pseudo_negation'));
 assert.ok(!x.modifiers.some(m=>m.kind==='direct_negation'));
});
test('not necessarily is genuine ambiguity, not evidence of absence',()=>{
 const x=check('A heating system does not necessarily improve hygiene.','heating system','hygiene','contributes_to');
 assert.equal(x.status,'abstain_for_review');assert.ok(x.modifiers.some(m=>m.kind==='ambiguous_negation'));
});
test('qualified negatives do not attach to another independent clause',()=>{
 const t='There is no evidence of hygiene. However, the air metric measures particle delivery.';
 const x=check(t,'air metric','particle delivery');assert.equal(x.status,'quarantined_candidate');
});
test('a mismatching document digest fails without a fabricated absence conclusion',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const x=inspectAtomicCandidate134({document:{...d,text:d.text+'tamper'},candidate:c});
 assert.equal(x.status,'invalid_source');assert.equal(x.sourceVerified,false);
});
test('a matching body but swapped source identity is rejected',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 assert.equal(inspectAtomicCandidate134({document:{...d,source:{...d.source,id:'another_source'}},candidate:c}).status,'invalid_source');
});
test('a swapped review originalDocumentId fails source authenticity gate',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 assert.equal(inspectAtomicCandidate134({document:{...d,source:{...d.source,originalDocumentId:'other_doc'}},candidate:c}).status,'invalid_source');
});
test('truncated evidence hashes are rejected',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 assert.equal(inspectAtomicCandidate134({document:d,candidate:{...c,evidenceSha256:'abc'}}).status,'invalid_source');
});
test('false offset that excludes either entity never passes',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const x=inspectAtomicCandidate134({document:d,candidate:{...c,evidenceSpan:{start:0,end:10},evidenceSha256:sha(d.text.slice(0,10))}});
 assert.equal(x.status,'invalid_source');
});
test('signal audit records two distinct declared families but does not certify independence',()=>{
 const s:IndependentSignal134[]=[{id:'learned',family:'local_model',vote:'supports_candidate',version:'v1'},
 {id:'lex',family:'lexical_scope',vote:'supports_candidate',version:'v1'}];
 assert.equal(auditSignals134(s).status,'aligned_hypothesis');assert.equal(auditSignals134(s).independenceNotVerified,true);
});
test('correlated votes from one family are not counted as two independent',()=>{
 const s:IndependentSignal134[]=[{id:'x',family:'same_rules',vote:'supports_candidate',version:'1'},
 {id:'y',family:'same_rules',vote:'supports_candidate',version:'2'}];
 assert.equal(auditSignals134(s).status,'insufficient_independent_signals');
});
test('opposing signals are not silently averaged, even when one abstains',()=>{
 const s:IndependentSignal134[]=[{id:'x',family:'model',vote:'supports_candidate',version:'1'},
 {id:'y',family:'rule',vote:'opposes_candidate',version:'1'},
 {id:'z',family:'human_unreviewed',vote:'abstains',version:'1'}];
 const x=check('The metric measures airflow.','metric','airflow');assert.equal(x.status,'quarantined_candidate');
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const inspected=inspectAtomicCandidate134({document:d,candidate:c,signals:s});
 assert.equal(inspected.status,'abstain_for_review');assert.ok(inspected.reasons.includes('signal_conflict'));
 assert.equal(inspected.signalAudit.abstentions,1);
});
test('duplicate signal ID rejected instead of double-counting',()=>{
 assert.throws(()=>auditSignals134([{id:'x',family:'one',vote:'supports_candidate',version:'1'},
  {id:'x',family:'two',vote:'supports_candidate',version:'1'}]));
});
test('no signals is explicit, not a truth assertion',()=>{
 assert.equal(auditSignals134([]).status,'no_signals');assert.equal(auditSignals134([{id:'x',family:'r',vote:'abstains',version:'1'}]).status,'no_signals');
});
test('opposite labels on same source span are treated as unresolved alternative interpretations',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const alternatives=[c,{...c,id:'other_candidate',label:'not_evidence_of' as const}];
 const r=inspectCandidateSet134({document:d,candidates:alternatives});
 assert.equal(r.overall,'needs_review');assert.equal(r.rankingAuthorized,false);
 assert.ok(r.decisions.some(x=>x.status==='abstain_for_review'));
});
test('candidate order cannot alter canonical decision list',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const cc={...c,id:'alternative',label:'not_evidence_of' as const};
 assert.deepEqual(inspectCandidateSet134({document:d,candidates:[c,cc]}),
  inspectCandidateSet134({document:d,candidates:[cc,c]}));
});
test('duplicate candidate identities are rejected',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 assert.throws(()=>inspectCandidateSet134({document:d,candidates:[c,c]}));
});
test('empty candidate set is no_candidates, not negative evidence',()=>{
 assert.equal(inspectCandidateSet134({document:doc('Any review.'),candidates:[]}).overall,'no_candidates');
});
test('unbounded sets and invalid signal votes fail closed',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 assert.throws(()=>inspectCandidateSet134({document:d,candidates:Array.from({length:51},(_,i)=>({...c,id:`x_${i}`}))}));
 assert.throws(()=>auditSignals134([{id:'bad',family:'f',version:'1',vote:'anything' as IndependentSignal134['vote']}]));
});
test('scope graph preserves original document offsets',()=>{
 const {d,c}=sample('No evidence suggests that the metric measures airflow.','metric','airflow');
 const x=inspectAtomicCandidate134({document:d,candidate:c});
 assert.ok(x.modifiers.every(m=>d.text.slice(m.span.start,m.span.end)===m.literal));
 assert.ok(x.modifiers.every(m=>m.scope.start<=c.subjectSpan.start&&m.scope.end>=c.objectSpan.end));
});

test('Phase131 provenance-constrained relation flows into Phase134 as a reviewed hypothesis',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const p={subject:'metric',object:'airflow',label:'measures' as const,subjectSpan:c.subjectSpan,
  objectSpan:c.objectSpan,evidenceSpan:c.evidenceSpan,sourceId:c.sourceId,originalDocumentId:c.originalDocumentId,
  sourceContentSha256:c.documentSha256,evidenceSha256:c.evidenceSha256,margin:1,
  status:'hypothesis_requires_scientific_review' as const,rankingAuthorized:false as const};
 const inspected=inspectLearnedProposal134({document:d,proposal:p});
 assert.equal(inspected.status,'quarantined_candidate');assert.equal(inspected.canonicalWriteAuthorized,false);
 assert.equal(inspected.independentReviewRequired,true);
 assert.throws(()=>inspectLearnedProposal134({document:{...d,source:{...d.source,id:'other'}},proposal:p}));
});
test('A Phase131 accepted candidate cannot bypass Phase132 scope on retrospective negatives',()=>{
 const {d,c}=sample('No evidence establishes that the metric measures airflow.','metric','airflow');
 const p={subject:'metric',object:'airflow',label:'measures' as const,subjectSpan:c.subjectSpan,
  objectSpan:c.objectSpan,evidenceSpan:c.evidenceSpan,sourceId:c.sourceId,originalDocumentId:c.originalDocumentId,
  sourceContentSha256:c.documentSha256,evidenceSha256:c.evidenceSha256,margin:1,
  status:'hypothesis_requires_scientific_review' as const,rankingAuthorized:false as const};
 assert.throws(()=>inspectLearnedProposal134({document:d,proposal:p}));
});


test('opposing-only signal does not impersonate a conflict or become truth',()=>{
 const votes:IndependentSignal134[]=[{id:'critical_source',family:'source_review',version:'1',vote:'opposes_candidate'}];
 assert.equal(auditSignals134(votes).status,'opposing_signals_only');
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const out=inspectAtomicCandidate134({document:d,candidate:c,signals:votes});
 assert.equal(out.status,'abstain_for_review');assert.ok(out.reasons.includes('signal_opposition'));
 assert.equal(out.canonicalWriteAuthorized,false);
});
test('contracted English negation blocks unsafe positive claims',()=>{
 const p=check("The motor doesn't improve dust removal.",'motor','dust removal','contributes_to');
 assert.equal(p.status,'rejected_candidate');
 assert.ok(p.modifiers.some(m=>m.kind==='direct_negation'&&m.literal==="doesn't"));
});
test('source format is checked but metadata and hash alone do not assert editorial truth',()=>{
 const {d,c}=sample('The metric measures airflow.','metric','airflow');
 const p=inspectAtomicCandidate134({document:d,candidate:c});
 assert.equal(p.status,'quarantined_candidate');assert.equal(p.independentReviewRequired,true);
});
