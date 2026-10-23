import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trainNativeModel123,type LabeledQuestion123} from '../src/phase123_native_learned_intent.js';
import {composeQuestion125,compareResearchAttempt125,validateSchema125,
 floorRobotSchema125,retrieveComposedCandidates125,type CategorySchema125} from '../src/phase125_compositional_dialogue_frame.js';
const reg=[floorRobotSchema125];
const established={categoryId:'floor_cleaning_robot',categoryVerified:true};
const check=(q:string)=>composeQuestion125(q,reg,established);
const values=(q:string)=>check(q).goals;
const aspect=(q:string,id:string)=>check(q).aspects.find(a=>a.aspectId===id);

test('general performance hypothesis without forced vacuum-versus-mop inference',()=>{
 const c=check('Qual è il miglior robot?');assert.deepEqual(c.goals,['performance']);
 assert.equal(c.scope,'general');assert.equal(c.aspects.length,0);
 assert.equal(c.status,'candidate_needs_evidence');assert.equal(c.rankingAuthorized,false);
});
test('general value remains distinct from best performance',()=>{
 const c=check('Migliore robot qualità prezzo');assert.deepEqual(c.goals,['value']);
 assert.ok(c.evidenceObligations.includes('local_current_price'));
});
test('best value English stays one objective',()=>assert.deepEqual(
 values('What is the best value robot vacuum?'),['value']));
test('dual explicit objectives can coexist rather than collapse into value',()=>{
 const c=check('I want best overall robot vacuum and best value robot vacuum');
 assert.deepEqual(c.goals,['performance','value']);
});
test('autonomy framed as reduced manual work',()=>{
 const c=check('What robot vacuum needs less maintenance?');assert.deepEqual(c.goals,['autonomy']);
 assert.ok(c.evidenceObligations.includes('human_maintenance_minutes'));
 assert.ok(c.evidenceObligations.includes('unattended_completion'));
});
test('autonomy idiom is recognized with verified context, not a product fact',()=>{
 const c=check("What's the closest thing to set it and forget it right now?");
 assert.equal(c.categoryFrom,'verified_context');assert.deepEqual(c.goals,['autonomy']);
 assert.equal(c.sourceMeasurementsVerified,false);
});
test('hard mopping exclusion survives longer contextual request',()=>{
 const c=check('Best robot vacuum for pet hair on carpets that does not have a mopping function');
 assert.equal(aspect('Best robot vacuum for pet hair on carpets that does not have a mopping function','mopping')?.role,'excluded');
 assert.equal(c.scope,'personal');assert.ok(c.evidenceObligations.includes('verify_absence_of_mopping'));
});
test('does not include mopping function is strong exclusion too',()=>{
 assert.equal(aspect('Best robot vacuum for pets which does NOT include a mopping function','mopping')?.role,'excluded');
});
test('does not NEED mopping never becomes a hard product exclusion',()=>{
 const c=check('Best robot vacuum, I do not need mopping');
 assert.notEqual(c.aspects.find(a=>a.aspectId==='mopping')?.role,'excluded');
});
test('negation in front of an aspect and explicit switch should not bleed through conjunction',()=>{
 const c=check('Best robot vacuum with carpet performance and without mopping');
 assert.equal(c.aspects.find(x=>x.aspectId==='carpet')?.role,'environment');
 assert.equal(c.aspects.find(x=>x.aspectId==='mopping')?.role,'excluded');
});
test('surface environment is not an excluded device function',()=>{
 const c=check('Best robot vacuum for a home without carpets');
 assert.equal(c.aspects.find(a=>a.aspectId==='carpet')?.role,'environment_absent');
 assert.ok(!c.evidenceObligations.includes('carpet_debris_pickup'));
});
test('explicit currencies and price range are not collapsed into an invented average',()=>{
 const c=check('Best robot vacuum for pet hair, 95% carpet. Budget $400-500');
 assert.deepEqual(c.userBudget,{currency:'USD',min:400,max:500});
 assert.equal(c.scope,'personal');assert.ok(c.evidenceObligations.includes('pet_hair_pickup'));
});
test('price mentioned without budget phrasing is not user budget',()=>{
 assert.equal(check('Is the $999 robot vacuum best?').userBudget,null);
});
test('unparsed budget triggers review',()=>{
 const c=check('Best robot vacuum, budget $600 and £400');
 assert.equal(c.status,'requires_semantic_review');assert.ok(c.hazards.includes('unparsed_or_conflicting_budget'));
});
test('unknown feature is exposed rather than certified',()=>{
 const c=check('Best robot vacuum with quantum-wash emitters');
 assert.ok(c.unknownCapabilitySpans.some(x=>x.includes('quantum')));
 assert.equal(c.status,'requires_semantic_review');
 assert.equal(c.rankingAuthorized,false);
});
test('known steam capability is a research obligation but not a floor test',()=>{
 const c=check('Find me a robot vacuum with steam');
 assert.deepEqual(c.goals,['capability_discovery']);
 assert.ok(c.evidenceObligations.includes('actual_floor_steam_application'));
 assert.equal(c.sourceMeasurementsVerified,false);
});
test('stair capability remains separate from a threshold claim',()=>{
 const c=check('Trovami robot che siano in grado di salire gli scalini');
 assert.deepEqual(c.goals,['capability_discovery']);
 assert.ok(c.evidenceObligations.includes('staircase_traversal'));
});
test('category is not inferred from bare robot without verified context',()=>{
 const c=composeQuestion125('Qual è il miglior robot?',reg);
 assert.equal(c.categoryId,null);assert.equal(c.status,'requires_context');
});
test('no verified comparative set means no invented choice',()=>{
 const c=check('Which one would you choose?');
 assert.equal(c.candidateReference,'unresolved');assert.equal(c.status,'requires_context');
});
test('verified candidate list is pinned independent of ordering',()=>{
 const s={...established,candidates:['robot_b','robot_a'],candidatesVerified:true,contextTurnId:'t100'};
 const c=composeQuestion125('Which one would you choose?',reg,s);
 assert.deepEqual(c.candidateIds,['robot_a','robot_b']);assert.equal(c.candidateReference,'verified_context');
 assert.equal(c.rankingAuthorized,false);
});
test('unverified candidate list is rejected even if category is verified',()=>{
 const c=composeQuestion125('Which one would you choose?',reg,
  {...established,candidates:['robot_a','robot_b'],contextTurnId:'t100'});
 assert.equal(c.candidateReference,'unresolved');
});
test('previous confirmed value goal inherited only in anchored comparative context',()=>{
 const s={...established,candidates:['robot_a','robot_b'],candidatesVerified:true,
   contextTurnId:'t100',confirmedGoals:['value' as const]};
 assert.deepEqual(composeQuestion125('Which of these?',reg,s).goals,['value']);
 assert.deepEqual(composeQuestion125('Which of these?',reg,established).goals,[]);
});
test('conflicting categories cannot silently use conversational context',()=>{
 const dishwasher:CategorySchema125={id:'dishwasher',schemaReviewId:'approved',aliases:['dishwasher'],aspects:[]};
 const c=composeQuestion125('Best robot vacuum or dishwasher?', [...reg,dishwasher],established);
 assert.equal(c.status,'requires_semantic_review');assert.ok(c.hazards.includes('multiple_explicit_categories'));
});
test('new schema can reuse frame without product-specific new parser code',()=>{
 const dishwasher:CategorySchema125={id:'dishwasher',schemaReviewId:'reviewed_pilot',
  aliases:['dishwasher','lavastoviglie'],aspects:[
   {id:'glassware',kind:'environment',aliases:['glasses','bicchieri'],evidenceKeys:['glass_cleaning']}]};
 const c=composeQuestion125('Best dishwasher for glasses', [dishwasher]);
 assert.equal(c.categoryId,'dishwasher');assert.equal(c.scope,'personal');
 assert.ok(c.evidenceObligations.includes('glass_cleaning'));
});
test('multiple schema entries with same ID and invalid metadata fail closed',()=>{
 assert.throws(()=>composeQuestion125('Best robot vacuum',[...reg,...reg]),/duplicate_category_schema/);
 assert.throws(()=>validateSchema125({...floorRobotSchema125,schemaReviewId:''}),/invalid_reviewed_category_schema/);
});
test('semantic uncertainty does not automatically exclude a feature',()=>{
 const c=check('Best robot vacuum but not sure if I need mopping');
 assert.ok(c.hazards.includes('logical_scope_needs_review'));
 assert.notEqual(c.aspects.find(a=>a.aspectId==='mopping')?.role,'excluded');
});
test('punctuation and case preserving semantics for known goal',()=>{
 assert.deepEqual(values('MIGLIOR ROBOT, QUALITÀ PREZZO?!'),values('miglior robot qualita prezzo'));
});
test('sidecar retains Phase124 source gate and never elevates proposals to rankings',()=>{
 const {samples}=JSON.parse(readFileSync('research/phase123_training_examples.json','utf8')) as {samples:LabeledQuestion123[]};
 const model=trainNativeModel123(samples.filter((_,i)=>i%5!==4),samples.filter((_,i)=>i%5===4));
 const c=compareResearchAttempt125(model,'Best robot vacuum with steam',
   {verifiedCategory:'floor_cleaning_robot'},[],[],reg,established);
 assert.equal(c.next,'acquire_or_review_evidence');
 assert.equal(c.previous.publicRankingAuthorized,false);
 assert.equal(c.rankingAuthorized,false);assert.equal(c.originalSourceAuthenticated,false);
 assert.equal(c.frame.interpretationConfirmed,false);
});

test('contradictory positive and negative mentions of one function require review',()=>{
 const c=check('Best robot vacuum with mopping but without mopping');
 assert.equal(c.status,'requires_semantic_review');
 assert.ok(c.hazards.includes('contradictory_aspect_polarity'));
});
test('negation of the best-performance claim does not count as approved meaning',()=>{
 const c=check('Not the best robot vacuum, I want something different');
 assert.equal(c.status,'requires_semantic_review');
 assert.ok(c.hazards.includes('negated_goal_requires_review'));
});

test('Italian grammatical autonomy variations do not need separate exact-question patterns',()=>{
 assert.deepEqual(values('Il robot più autonomo per la mia casa?'),['autonomy']);
 assert.deepEqual(values('Quali robot sono più autonomi?'),['autonomy']);
});
test('best with an autonomy modifier is not silently a second general performance request',()=>{
 assert.deepEqual(values('Best robot vacuum requiring less maintenance'),['autonomy']);
});
test('paraphrases produce identical goal sets and requirement sets under same verified context',()=>{
 const a=check('Miglior robot qualità-prezzo');const b=check('migliore robot qualita prezzo');
 assert.deepEqual(a.goals,b.goals);assert.deepEqual(a.evidenceObligations,b.evidenceObligations);
});

test('new composed goal queries actual local BM25 and preserves evidence safety gates',()=>{
 const {passages}=JSON.parse(readFileSync('research/phase124_editorial_passages.json','utf8')) as {
  passages:{passageId:string;sourceUrl:string;sourceIdentity:string;rightsReviewed:boolean;text:string}[]};
 const question='Trovami robot che siano in grado di salire gli scalini';
 const frame=check(question),result=retrieveComposedCandidates125(frame,question,passages);
 assert.ok(result.attemptedQueries>0);
 assert.ok(result.hits.some(x=>x.passageId==='rover_ifa_notes'));
 assert.equal(result.sourceFactsAuthenticated,false);assert.equal(result.validatedMeasurements,false);
 assert.equal(result.rankingAuthorized,false);
});
test('unresolved comparative references and negations do not trigger composed source search',()=>{
 const question='Which one would you choose?';const f=check(question);
 const p=[{passageId:'unreviewed',sourceUrl:'https://example.org/a',sourceIdentity:'publisher_one',
   rightsReviewed:true,text:'The Roborock robot has advanced technology and features.'}];
 assert.equal(retrieveComposedCandidates125(f,question,p).attemptedQueries,0);
});
test('unreviewed passages excluded even when lexical match exists',()=>{
 const question='Best robot vacuum for pet hair';const f=check(question);
 const p=[{passageId:'unreviewed',sourceUrl:'https://example.org/a',sourceIdentity:'publisher_one',
  rightsReviewed:false,text:'The best robot vacuum for pet hair results tested on carpet.'}];
 const r=retrieveComposedCandidates125(f,question,p);
 assert.equal(r.hits.length,0);assert.ok(r.attemptedQueries>0);
});
test('composed retrieval cannot be reused for an altered user query',()=>{
 const q='Best robot vacuum';const f=check(q);
 assert.equal(retrieveComposedCandidates125(f,q+' cheaper',[]).attemptedQueries,0);
});

test('a mopping prohibition must not bleed into a subsequent 95% carpet description',()=>{
 const q='Best robot vacuum for pet hair that does NOT include a mopping function (95% carpet). Budget $400-500';
 const c=check(q);
 assert.equal(c.aspects.find(x=>x.aspectId==='mopping')?.role,'excluded');
 assert.equal(c.aspects.find(x=>x.aspectId==='carpet')?.role,'environment');
 assert.ok(c.evidenceObligations.includes('carpet_debris_pickup'));
});
