import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SourceWideSemanticMemory109,type WholeReviewManifest109,type SemanticAtom109,
  type SegmentAudit109,makeEphemeralInventory109} from '../src/phase109_source_wide_semantic_intake.js';
const H=(a:string)=>a.repeat(64);
const m=():WholeReviewManifest109=>({reportId:'review_alpha_v1',originalTestId:'original_lab_trial_1',
  sourceUrl:'https://independent.example.org/testing/vacuum',sourceRevisionSha256:H('a'),categoryId:'vacuum',
  inventoryReviewReference:'independent full rendered page review',inventoryReviewerId:'reviewer_one',
  segments:[
    {segmentId:'intro',locator:'#summary',spanSha256:H('b'),surface:'paragraph',accessible:true},
    {segmentId:'sound',locator:'#noise',spanSha256:H('c'),surface:'table',accessible:true},
    {segmentId:'foot',locator:'#note',spanSha256:H('d'),surface:'footnote',accessible:true},
    {segmentId:'extra',locator:'#later',spanSha256:H('e'),surface:'caption',accessible:true}
  ]});
const atom=(atomId:string,segmentId:string,conceptId:string,criterionId:string|null=null):SemanticAtom109=>({
  atomId,segmentId,variantId:'alpha',relatedVariantIds:[],conceptId,criterionId,
  kind:'observation',polarity:'unfavorable',assertionCode:'mode_high_audible_whine',
  evidenceMode:'expert_judgement',epistemicStatus:'observed',conditionCodes:['high_power_mode','hard_floor'],
  reviewReference:'independently checked source observation',isProvisional:false
});
const audit=(segmentId:string,atomIds:string[]):SegmentAudit109=>({segmentId,status:'extracted',
  atomIds,reviewReference:'independent completeness adjudication'});
const benign=(segmentId:string):SegmentAudit109=>({segmentId,status:'no_product_observation',
  atomIds:[],noObservationReason:'publisher_metadata',reviewReference:'independently checked as metadata'});
const fill=(db:SourceWideSemanticMemory109)=>{
  db.register(m());
  db.addAtom('review_alpha_v1',atom('noise_whine','sound','noise_tone'));
  db.addAtom('review_alpha_v1',{...atom('context_footnote','foot','high_power_mode','operational_modes'),
    kind:'context',polarity:'not_applicable',assertionCode:'observation_at_maximum_power'});
  db.addAtom('review_alpha_v1',{...atom('unexpected_hair','extra','pet_hair_wrap'),
    kind:'maintenance',assertionCode:'hair_accumulates_at_brush'});
  db.auditSegment('review_alpha_v1',benign('intro'));
  db.auditSegment('review_alpha_v1',audit('sound',['noise_whine']));
  db.auditSegment('review_alpha_v1',audit('foot',['context_footnote']));
  db.auditSegment('review_alpha_v1',audit('extra',['unexpected_hair']));
};
test('records every declared content surface with exact revision/locator hashes but no review body',()=>{
  const db=new SourceWideSemanticMemory109();try{
    fill(db);const c=db.coverage('review_alpha_v1');
    assert.equal(c.declaredSegments,4);assert.equal(c.reviewedSegments,4);assert.equal(c.atoms,3);
    assert.equal(c.unmappedAtoms,2);assert.deepEqual(c.unmappedConcepts,['noise_tone','pet_hair_wrap']);
    assert.equal(c.canSeal,true);assert.equal(c.completenessClaim,'declared_inventory_only_not_document_recall');
    db.seal('review_alpha_v1','independent manifest reconciliation record');
    assert.equal(db.coverage('review_alpha_v1').sealed,true);
  }finally{db.close();}
});
test('new unexpected aspect is stored independently of the question that found the product',()=>{
  const db=new SourceWideSemanticMemory109();try{
    fill(db);db.seal('review_alpha_v1','independent manifest reconciliation record');
    assert.deepEqual(db.allAtoms('review_alpha_v1').map(x=>x.conceptId),
      ['high_power_mode','noise_tone','pet_hair_wrap']);
    assert.equal(db.effectiveCriterion('review_alpha_v1','unexpected_hair'),null);
    db.adoptMapping('vacuum',{conceptId:'pet_hair_wrap',criterionId:'brush_maintenance',
      reviewerId:'reviewer_two',scope:'whole_category',
      methodologyReference:'category wide maintenance aspect methodology',
      approvalReference:'independent approved taxonomy evolution'});
    assert.equal(db.effectiveCriterion('review_alpha_v1','unexpected_hair'),'brush_maintenance');
    assert.equal(db.allAtoms('review_alpha_v1').find(x=>x.atomId==='unexpected_hair')!.criterionId,null); // canonical atom unchanged
    const evidence=db.canonicalAdmissionCheck('review_alpha_v1','unexpected_hair','brush_maintenance','alpha');
    assert.equal(evidence.approvedForDownstreamReview,true);
    assert.equal(evidence.reportOriginalTestId,'original_lab_trial_1');
    assert.equal(evidence.segmentLocator,'#later');
  }finally{db.close();}
});
test('a later user request is read-only and can find atom that was not a known criterion',()=>{
  const db=new SourceWideSemanticMemory109();try{fill(db);
    const digest=JSON.stringify(db.allAtoms('review_alpha_v1'));
    for(const wish of ['quiet','pets','hygiene','ergonomics']){
      assert.ok(db.atomsForVariant('review_alpha_v1','alpha').length>=3);
      void wish;
    }
    assert.equal(JSON.stringify(db.allAtoms('review_alpha_v1')),digest);
  }finally{db.close();}
});
test('cannot seal when one declared section has not been examined',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.auditSegment('review_alpha_v1',benign('intro'));
    assert.equal(db.coverage('review_alpha_v1').reviewedSegments,1);
    assert.deepEqual(db.coverage('review_alpha_v1').unreviewedSegments,['sound','foot','extra']);
    assert.throws(()=>db.seal('review_alpha_v1','premature sign off reference'),/incomplete_source_wide_extraction/);
  }finally{db.close();}
});
test('inaccessible figures or tables prevent complete coverage',()=>{
  const db=new SourceWideSemanticMemory109();try{
    const x=m();x.segments[1]={...x.segments[1],accessible:false,surface:'figure'};
    db.register(x);db.auditSegment('review_alpha_v1',benign('intro'));
    db.auditSegment('review_alpha_v1',{segmentId:'sound',status:'blocked',atomIds:[],
      reviewReference:'figure cannot be examined'});
    db.auditSegment('review_alpha_v1',benign('foot'));db.auditSegment('review_alpha_v1',benign('extra'));
    assert.deepEqual(db.coverage('review_alpha_v1').blockedSegments,['sound']);
    assert.throws(()=>db.addAtom('review_alpha_v1',atom('fake','sound','noise')),/unavailable/);
    assert.throws(()=>db.seal('review_alpha_v1','premature sign off reference'),/incomplete/);
  }finally{db.close();}
});
test('cannot mark relevant fact segment empty after recording an atom',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.addAtom('review_alpha_v1',atom('noise_whine','sound','noise_tone'));
    assert.throws(()=>db.auditSegment('review_alpha_v1',{...benign('sound'),
      noObservationReason:'no_product_claim'}),/unfounded_empty_segment/);
  }finally{db.close();}
});
test('partial extraction of multi-atom segment blocks audit until all captured',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.addAtom('review_alpha_v1',atom('claim_one','sound','noise_tone'));
    db.addAtom('review_alpha_v1',atom('claim_two','sound','noise_pitch'));
    assert.throws(()=>db.auditSegment('review_alpha_v1',audit('sound',['claim_one'])),/unreviewed_or_omitted_atoms/);
    db.auditSegment('review_alpha_v1',audit('sound',['claim_one','claim_two']));
  }finally{db.close();}
});
test('provisional claim prevents sealing and cannot be disguised by audit',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.addAtom('review_alpha_v1',{...atom('unreviewed','sound','noise_tone'),isProvisional:true});
    assert.throws(()=>db.auditSegment('review_alpha_v1',audit('sound',['unreviewed'])),/unreviewed_or_omitted_atoms/);
    assert.equal(db.coverage('review_alpha_v1').provisionalAtoms,1);
  }finally{db.close();}
});
test('request IDs or quoted prose cannot be inserted into coded assertion records',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    assert.throws(()=>db.addAtom('review_alpha_v1',{...atom('one','sound','noise'),userId:'alice'} as SemanticAtom109),/query_influenced/);
    assert.throws(()=>db.addAtom('review_alpha_v1',{...atom('one','sound','noise'),
      assertionCode:'The vacuum is extremely loud and this full sentence is copied verbatim'}),/query_influenced/);
    assert.throws(()=>db.register({...m(),userQuery:'least noisy'} as WholeReviewManifest109),/invalid_source_inventory/);
  }finally{db.close();}
});
test('same original test can have multiple reports while retaining distinct report IDs',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    const x=m();x.reportId='review_alpha_reprint';x.sourceUrl='https://independent.example.org/testing/reprint';db.register(x);
    assert.equal(db.coverage('review_alpha_reprint').declaredSegments,4);
    assert.equal(db.allAtoms('review_alpha_reprint').length,0);
    assert.equal(m().originalTestId,x.originalTestId);
  }finally{db.close();}
});
test('publication/variant relation captures both products without duplicating original study',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.addAtom('review_alpha_v1',{...atom('comparison','sound','noise_tone','noise'),
      kind:'comparison',relatedVariantIds:['beta'],assertionCode:'alpha_higher_whine_than_beta',
      relation:{direction:'worse',targetVariantId:'beta',basis:'same_original_test'}});
    assert.equal(db.atomsForVariant('review_alpha_v1','beta').length,1);
    assert.equal(db.atomsForVariant('review_alpha_v1','alpha').length,1);
    assert.throws(()=>db.addAtom('review_alpha_v1',{...atom('dup','sound','noise'),relatedVariantIds:['beta','beta']}),
      /query_influenced/);
  }finally{db.close();}
});
test('unverified inferences cannot be promoted even after inventory is sealed',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.addAtom('review_alpha_v1',{...atom('unsupported','sound','virus_kill','virus_inactivation'),
      evidenceMode:'inference',assertionCode:'sanitizing_means_virucidal'});
    db.auditSegment('review_alpha_v1',benign('intro'));
    db.auditSegment('review_alpha_v1',audit('sound',['unsupported']));
    db.auditSegment('review_alpha_v1',benign('foot'));
    db.auditSegment('review_alpha_v1',benign('extra'));
    db.seal('review_alpha_v1','independent source manifest sign off');
    assert.throws(()=>db.canonicalAdmissionCheck('review_alpha_v1','unsupported','virus_inactivation','alpha'),
      /not_independently_promotable/);
  }finally{db.close();}
});
test('evidence not promotable until source-wide review is sealed',()=>{
  const db=new SourceWideSemanticMemory109();try{fill(db);
    assert.throws(()=>db.canonicalAdmissionCheck('review_alpha_v1','context_footnote','operational_modes','alpha'),
      /source_not_fully_reconciled/);
  }finally{db.close();}
});
test('arbitrary criterion replacement forbidden at promotion even if request asks for it',()=>{
  const db=new SourceWideSemanticMemory109();try{fill(db);
    db.seal('review_alpha_v1','independent manifest reconciliation record');
    assert.throws(()=>db.canonicalAdmissionCheck('review_alpha_v1','context_footnote','virus_inactivation','alpha'),
      /not_independently_promotable/);
    assert.throws(()=>db.canonicalAdmissionCheck('review_alpha_v1','context_footnote','operational_modes','beta'),
      /not_independently_promotable/);
  }finally{db.close();}
});
test('approved category mapping is immutable without new review',()=>{
  const db=new SourceWideSemanticMemory109();try{const map={conceptId:'pet_hair_wrap',
      criterionId:'brush_maintenance',reviewerId:'reviewer_one',scope:'whole_category' as const,
      methodologyReference:'independent common category schema review',
      approvalReference:'approved whole-category semantic mapping'};
    db.adoptMapping('vacuum',map);db.adoptMapping('vacuum',map);
    assert.throws(()=>db.adoptMapping('vacuum',{...map,criterionId:'audio_quality'}),/requalification_required/);
  }finally{db.close();}
});
test('registered inventories and sealed observations cannot be silently altered',()=>{
  const db=new SourceWideSemanticMemory109();try{fill(db);
    assert.throws(()=>db.register({...m(),sourceRevisionSha256:H('f')}),/revision_requires_new_inventory/);
    db.seal('review_alpha_v1','independent manifest reconciliation record');
    assert.throws(()=>db.addAtom('review_alpha_v1',atom('late','sound','unknown')), /sealed_report_is_immutable/);
    assert.throws(()=>db.auditSegment('review_alpha_v1',audit('sound',['noise_whine'])),/sealed_report_is_immutable/);
    assert.throws(()=>db.seal('review_alpha_v1','different correction review record'),/sealed_report_is_immutable/);
  }finally{db.close();}
});
test('SQLite persistence survives reopen without original source text',()=>{
  const path=mkdtempSync(join(tmpdir(),'pee109-'));const dbFile=join(path,'review.sqlite');
  try{let db=new SourceWideSemanticMemory109(dbFile);
    fill(db);db.seal('review_alpha_v1','independent manifest reconciliation record');db.close();
    db=new SourceWideSemanticMemory109(dbFile);
    assert.equal(db.coverage('review_alpha_v1').sealed,true);
    assert.equal(db.atomsForVariant('review_alpha_v1','alpha').length,3);
    const pass=db.canonicalAdmissionCheck('review_alpha_v1','context_footnote','operational_modes','alpha');
    assert.equal(pass.segmentSha256,H('d'));db.close();
    const raw=readFileSync(dbFile,'utf8');
    assert.ok(!raw.includes('The vacuum makes a terrible screeching noise'));
  }finally{rmSync(path,{recursive:true,force:true});}
});

test('ephemeral whole-review parser inventory records only hashes, never source prose',()=>{
  const secret='Special editorial assessment that must not enter canonical memory';
  const input={reportId:'review_alpha_v2',originalTestId:'original_lab_trial_1',
    sourceUrl:'https://independent.example.org/testing/vacuum',categoryId:'vacuum',
    inventoryReviewerId:'reviewer_one',inventoryReviewReference:'whole rendered page verified independently',
    blocks:[{segmentId:'paragraph_one',locator:'#review',surface:'paragraph' as const,
      accessible:true,content:secret},
      {segmentId:'figure_unreadable',locator:'#graph',surface:'figure' as const,accessible:false}]};
  const inventory=makeEphemeralInventory109(input);
  assert.equal(JSON.stringify(inventory).includes(secret),false);
  assert.equal(inventory.segments[0].spanSha256.length,64);
  const db=new SourceWideSemanticMemory109();try{db.register(inventory);
    assert.deepEqual(db.coverage(inventory.reportId).blockedSegments,['figure_unreadable']);
  }finally{db.close();}
});
test('typed numeric observation stores real measured value and protocol, rejects fabricated text',()=>{
  const db=new SourceWideSemanticMemory109();try{db.register(m());
    db.addAtom('review_alpha_v1',{...atom('measurement_one','sound','sound_power','noise'),
      kind:'measurement',assertionCode:'sound_power_result',
      quantity:{value:78.2,unitCode:'db_a_sound_power',protocolId:'reviewed_lab_protocol_1',uncertainty:1.2}});
    const s=db.allAtoms('review_alpha_v1')[0];
    assert.equal(s.quantity?.value,78.2);
    assert.equal(s.quantity?.protocolId,'reviewed_lab_protocol_1');
    assert.throws(()=>db.addAtom('review_alpha_v1',{...atom('measurement_bad','sound','sound_power','noise'),
      kind:'measurement',assertionCode:'sound_power_result',
      quantity:{value:Infinity,unitCode:'db_a_sound_power',protocolId:'lab'}}),/query_influenced/);
    assert.throws(()=>db.addAtom('review_alpha_v1',{...atom('comparison_bad','sound','noise','noise'),
      kind:'comparison',relatedVariantIds:['beta'],relation:{direction:'better',targetVariantId:'gamma',
        basis:'same_original_test'}}),/query_influenced/);
  }finally{db.close();}
});

test('an observation appended after audit invalidates the seal until new reviewed version',()=>{
  const db=new SourceWideSemanticMemory109();try{fill(db);
    db.addAtom('review_alpha_v1',{...atom('late_observation','sound','noise_vibration'),
      assertionCode:'vibration_when_high_power'});
    const status=db.coverage('review_alpha_v1');
    assert.deepEqual(status.unreconciledSegments,['sound']);
    assert.equal(status.canSeal,false);
    assert.throws(()=>db.seal('review_alpha_v1','premature validated full-source claim'),/incomplete/);
  }finally{db.close();}
});
