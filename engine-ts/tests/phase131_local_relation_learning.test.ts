import test from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 parseMarked131,trainRelations131,calibrateMargin131,predictRelation131,
 proposeRelation131,assertRelationAnchoring131,evaluateRelations131,
 type RelationExample131,type RelationDocument131
} from '../src/phase131_local_relation_learning.js';
const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
const cases:RelationExample131[]=[];
const statements:{s:string;o:string;t:string;l:RelationExample131['label']}[]=[
 {s:'CADR',o:'air cleaning',t:'CADR measures air cleaning under this method.',l:'measures'},
 {s:'efficiency',o:'output',t:'Efficiency quantifies output for the trial.',l:'measures'},
 {s:'brush pressure',o:'stain removal',t:'Brush pressure may improve stain removal.',l:'contributes_to'},
 {s:'roller rinse',o:'smearing',t:'Roller rinse can influence smearing.',l:'contributes_to'},
 {s:'score',o:'tile',t:'Score was recorded at tile.',l:'conditioned_on'},
 {s:'pickup',o:'four runs',t:'Pickup was tested under four runs.',l:'conditioned_on'},
 {s:'heated dock',o:'sterile floor',t:'Heated dock does not establish sterile floor.',l:'not_evidence_of'},
 {s:'heat',o:'sanitation',t:'Heat cannot prove sanitation.',l:'not_evidence_of'},
 {s:'door colour',o:'pickup',t:'Door colour appears alongside pickup in the index.',l:'unrelated'},
 {s:'battery',o:'shower spray',t:'Battery and shower spray are in different appendices.',l:'unrelated'}
];
for(const x of statements){const text=x.t.toLowerCase(),sb=text.indexOf(x.s.toLowerCase()),ob=text.indexOf(x.o.toLowerCase());
 assert.ok(sb>=0&&ob>=0);cases.push({text:x.t,subject:{start:sb,end:sb+x.s.length},object:{start:ob,end:ob+x.o.length},label:x.l});}
const model=trainRelations131(cases);
const cal=calibrateMargin131(model,cases,0.8);
test('trained locally deterministic across identical samples',()=>{
 assert.equal(trainRelations131(cases).modelVersion,model.modelVersion);
 assert.equal(model.trainingCount,10);
 assert.equal(model.algorithm,'multinomial_naive_bayes_from_scratch');
});
test('marked spans exclude marker syntax and preserve source offsets',()=>{
 const x=parseMarked131('The <S>CADR</S> measures <O>air cleaning</O>.','measures');
 assert.equal(x.text.slice(x.subject.start,x.subject.end),'CADR');
 assert.equal(x.text.slice(x.object.start,x.object.end),'air cleaning');
 assert.equal(x.text,'The CADR measures air cleaning.');
});
test('malformed overlapping entity markers rejected',()=>{
 assert.throws(()=>parseMarked131('<S>one <O>two</O></S>','measures'));
 assert.throws(()=>parseMarked131('<S>one</S> and <S>two</S> <O>three</O>','measures'));
});
test('model abstains at unachievable margin and cannot authorize ranking',()=>{
 const p=predictRelation131(model,cases[0],1e6);assert.equal(p.accepted,false);
 assert.equal(p.rankingAuthorized,false);assert.equal(p.label,'abstain');
});
test('invalid calibration and absent relation training class are rejected',()=>{
 assert.throws(()=>trainRelations131(cases.slice(0,5)));
 assert.throws(()=>calibrateMargin131(model,[],0.9));
 assert.throws(()=>predictRelation131(model,cases[0],-1));
});
test('test diagnostics distinguish coverage from accuracy among accepted',()=>{
 const report=evaluateRelations131(model,cases,cal.margin);
 assert.equal(report.size,cases.length);assert.equal(report.correct+report.wrong+report.abstained,report.size);
 assert.ok(report.coverage>=0&&report.coverage<=1);
});
function doc(text:string):RelationDocument131{return {text,sha256:digest(text),source:{
 id:'source_one',originalDocumentId:'doc_one',title:'Example provided snippet',
 url:'https://example.org/review',role:'original_expert_method'}};}
test('provenance ensures exact digest/source; proposed relation never a ranked fact',()=>{
 const d=doc('CADR measures air cleaning under this method.');
 const lowCal={...cal,margin:0};
 const proposal=proposeRelation131({document:d,subject:{start:0,end:4},object:{start:14,end:26},model,calibration:lowCal});
 if(proposal){
  assert.equal(proposal.rankingAuthorized,false);
  assert.equal(proposal.status,'hypothesis_requires_scientific_review');
  assert.equal(assertRelationAnchoring131(proposal,d),true);
  assert.equal(assertRelationAnchoring131(proposal,{...d,text:d.text+' X'}),false);
  assert.equal(assertRelationAnchoring131(proposal,{...d,source:{...d.source,id:'other'}}),false);
 }
 assert.throws(()=>proposeRelation131({document:{...d,sha256:'wrong'},subject:cases[0].subject,object:cases[0].object,model,calibration:lowCal}));
});
test('negative qualifier BEFORE subject included in evidence span',()=>{
 const text='No independent study verifies that hot dock rinse proves sterile floor.';
 const d=doc(text);const s=text.indexOf('hot dock rinse'),o=text.indexOf('sterile floor');
 const p=proposeRelation131({document:d,subject:{start:s,end:s+14},object:{start:o,end:o+13},model,calibration:{...cal,margin:0}});
 if(p){const evidence=d.text.slice(p.evidenceSpan.start,p.evidenceSpan.end);assert.ok(evidence.startsWith('No independent study'));
  assert.ok(evidence.includes('sterile floor'));}
});
test('cross-sentence pair cannot be presented as one local relation',()=>{
 const text='CADR measures particulate delivery. Floor sterilization has different requirements.';
 const d=doc(text);const s=text.indexOf('CADR'),o=text.indexOf('Floor sterilization');
 assert.equal(proposeRelation131({document:d,subject:{start:s,end:s+4},object:{start:o,end:o+19},model,calibration:{...cal,margin:0}}),null);
});
test('claimed relation cannot transfer to a different product review',()=>{
 const d=doc('CADR measures air cleaning under this method.');
 const p=proposeRelation131({document:d,subject:{start:0,end:4},object:{start:14,end:26},model,calibration:{...cal,margin:0}});
 if(p)assert.equal(assertRelationAnchoring131(p,{...d,source:{...d.source,originalDocumentId:'other_doc'}}),false);
});

test('relation followups cannot turn a statistical claim into a performance ranking',async()=>{
 const {planRelationReview131}=await import('../src/phase131_local_relation_learning.js');
 const d=doc('CADR measures air cleaning under this method.');
 const p=proposeRelation131({document:d,subject:{start:0,end:4},object:{start:14,end:26},model,calibration:{...cal,margin:0}});
 if(p){const plans=planRelationReview131([p,p]);assert.equal(plans.length,1);assert.equal(plans[0].productRankingBlocked,true);
  assert.notEqual(plans[0].request.length,0);
  assert.throws(()=>planRelationReview131([{...p,rankingAuthorized:true as false}]));}
});
