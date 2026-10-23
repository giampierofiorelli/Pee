import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trainNativeModel123,proposeNativeIntent123,planNativeResearch123,
  type LabeledQuestion123} from '../src/phase123_native_learned_intent.js';
const corpus=JSON.parse(readFileSync('research/phase123_training_examples.json','utf8')) as {
 samples:LabeledQuestion123[]};
const trained=corpus.samples.filter((_,i)=>i%5!==4);
const calibration=corpus.samples.filter((_,i)=>i%5===4);
const model=trainNativeModel123(trained,calibration);
const ctx={verifiedCategory:'floor_cleaning_robot' as const};
const coverage={candidateCount:0,verifiedMetricKeys:[] as [],
 hasIndependentlyReviewedQualityPolicy:false,protocolComparable:false};
const ask=(q:string)=>proposeNativeIntent123(model,q,ctx);

test('training is entirely local and deterministic for the same frozen samples',()=>{
  const second=trainNativeModel123(trained,calibration);
  assert.equal(second.hash,model.hash);
  assert.equal(second.acceptedSimilarity,model.acceptedSimilarity);
  assert.equal(second.acceptedMargin,model.acceptedMargin);
  assert.deepEqual(ask('miglior robot aspirapolvere qualità prezzo'),
    proposeNativeIntent123(second,'miglior robot aspirapolvere qualità prezzo',ctx));
});
test('model training and evaluation samples are disjoint',()=>{
 const a=new Set(trained.map(x=>x.id));for(const c of calibration)assert.equal(a.has(c.id),false);
});
test('model reports similarity and margin, never manufactured confidence',()=>{
  const p=ask('il migliore robot aspirapolvere per convenienza');
  assert.ok(p.bestSimilarity>=0&&p.bestSimilarity<=1);
  assert.ok(p.separation>=0&&p.separation<=1);
  assert.equal(p.publicationAuthorized,false);
  assert.equal('probability' in p,false);
});
test('no floor robot category is guessed for generic robots without context',()=>{
  const p=proposeNativeIntent123(model,'qual è il robot migliore');
  assert.equal(p.status,'needs_context');assert.equal(p.label,null);
});
test('explicit robot cleaner category may ground scope without conversation history',()=>{
  const p=proposeNativeIntent123(model,'Quale robot aspirapolvere conviene acquistare');
  assert.notEqual(p.status,'needs_context');
});
test('negation is a constraint review even when classifier would recognize a goal',()=>{
  for(const q of ['non voglio lavaggio nel robot','find a robot without mopping',
    'mostrami robot che non salgano le scale','robot mai con serbatoio da svuotare']){
    const p=ask(q);assert.equal(p.status,'needs_constraint_review');assert.equal(p.label,null);
  }
});
test('multiple independent requested rankings are not silently merged',()=>{
 for(const q of ['voglio sia i migliori sia quelli piu convenienti',
  '1 miglior robot 2 migliore qualità prezzo']){
  assert.equal(ask(q).status,'needs_constraint_review');
 }
});
test('other-domain questions do not become product recommendations',()=>{
  const r=planNativeResearch123(model,'Come riparare il motore del robot',coverage,ctx);
  assert.equal(r.publicRankingAuthorized,false);
  assert.equal(r.searchExecuted,false);
});
test('novel capability has only an evidence-research proposal, no inferred mechanism',()=>{
  const q='Trovami i robot che sono in grado di salire gli scalini';
  const p=planNativeResearch123(model,q,coverage,ctx);
  assert.equal(p.publicRankingAuthorized,false);
  assert.equal(p.evidenceVerified,false);
  assert.equal(p.searchExecuted,false);
  assert.ok(['continue_research','investigate_unknown_goal','semantic_review'].includes(p.next));
  if(p.next==='continue_research'){
    assert.ok(p.unmet.includes('independent_capability_verification'));
    assert.equal(p.objective,null);
  }
});
test('unknown request may investigate what user means rather than invent winner',()=>{
  const q='E se cercassimo robot con vapore?';
  const p=planNativeResearch123(model,q,coverage,ctx);
  assert.equal(p.publicRankingAuthorized,false);
  assert.ok(['continue_research','investigate_unknown_goal','semantic_review'].includes(p.next));
  if(p.next==='investigate_unknown_goal'){
    assert.ok(p.unmet.includes('source_grounded_capability_definition'));
    assert.ok(p.researchQueries.includes(q));
  }
});
test('the best-value branch inherits cost and price evidence obligations',()=>{
  const p=planNativeResearch123(model,'robot migliore qualità prezzo',coverage,ctx);
  assert.equal(p.next,'continue_research');assert.equal(p.objective,'best_value');
  assert.ok(p.unmet.includes('market_price'));
  assert.ok(p.unmet.includes('cost_of_ownership'));
});
test('research hints do not imply source acquisition or evidence verification',()=>{
  const p=planNativeResearch123(model,'robot migliore qualità prezzo',coverage,ctx);
  assert.equal(p.publicRankingAuthorized,false);
  assert.equal(p.searchExecuted,false);
  assert.equal(p.evidenceVerified,false);
  assert.ok(p.researchQueries.length>0);
});
test('no training duplicate by normalized string',()=>{
  const dup=[...trained,{...trained[0],id:'NEW',text:trained[0].text.toUpperCase()}];
  assert.throws(()=>trainNativeModel123(dup,calibration),/invalid_training_sample_or_duplicate/);
});
test('training rejects class scarcity',()=>{
  const poor=trained.filter(x=>x.label!=='capability');
  assert.throws(()=>trainNativeModel123(poor,calibration),/insufficient_per_class/);
});
test('calibration must not contain training examples',()=>{
  assert.throws(()=>trainNativeModel123(trained,[...calibration,trained[0]]),/invalid_calibration_split/);
});
test('question length and coverage are validated',()=>{
  assert.throws(()=>ask('hi'),/invalid_question/);
  assert.throws(()=>planNativeResearch123(model,'best robot vacuum',{
    ...coverage,candidateCount:-3},ctx),/bad_coverage/);
});
test('same normalized reformulation is stable and lacks any public ranking',()=>{
  const a=ask('miglior robot aspirapolvere qualità prezzo');
  const b=ask('MIGLIOR ROBOT ASPIRAPOLVERE QUALITÀ PREZZO!!!');
  assert.equal(a.label,b.label);assert.equal(a.status,b.status);
  assert.equal(a.publicationAuthorized,false);
});

test('verified conversation context resolves elliptical references without guessing new domain',()=>{
 const p=proposeNativeIntent123(model,'quale mi costringe meno spesso a liberarlo dai cavi',ctx);
 assert.notEqual(p.status,'needs_context');
});
test('an explicit different known category blocks floor-cleaner context inference',()=>{
 for(const q of ['best dishwasher','migliori lavastoviglie','best headphones']){
   const p=proposeNativeIntent123(model,q,ctx);assert.equal(p.status,'needs_context');
 }
});
test('capability query never turns raw query words into a verified cleaning result',()=>{
 const p=planNativeResearch123(model,'robot che vola sul pavimento',coverage,ctx);
 assert.equal(p.publicRankingAuthorized,false);assert.equal(p.evidenceVerified,false);
});
test('ranking remains blocked even when caller reports all known metric bits',()=>{
 const p=planNativeResearch123(model,'robot migliore qualità prezzo',{
   candidateCount:17,verifiedMetricKeys:['product_discovery','product_identity',
   'expert_quality_floor','cleaning_outcome','market_price','cost_of_ownership','test_comparability'],
   hasIndependentlyReviewedQualityPolicy:true,protocolComparable:true},ctx);
 assert.equal(p.publicRankingAuthorized,false);assert.equal(p.searchExecuted,false);
});

test('preserves bounded Phase122 alternative when native learner abstains',()=>{
 const q='E una come gestirebbe sistemare la classifica per quanto riguarda i migliori robot che riescono a essere molto autonomi e quindi richiedono meno intervento umano';
 const p=planNativeResearch123(model,q,coverage,ctx);
 assert.equal(p.legacyBoundedCandidate,'least_human_work');
 assert.equal(p.publicRankingAuthorized,false);
});
test('a rule-based alternative cannot silently override a contradictory learned intent',()=>{
 const p=planNativeResearch123(model,'robot migliore qualità prezzo',coverage,ctx);
 assert.equal(p.legacyBoundedCandidate,'best_value');
 assert.equal(p.parserDisagreement,false);
});
