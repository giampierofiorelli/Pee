import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDocumentBytes228} from '../src/phase228_document_observer.js';
const load=(name:string)=>parseDocumentBytes228(readFileSync(`evaluation/phase240/SYNTHETIC-${name}.pdf`),'pdf');
test('240: unassigned icon column slots carry time and physical PDF coordinates, not inferred programme names',async()=>{
 const r=await load('program-slots');assert.equal(r.claimCount,0);
 assert.equal(r.visualTableSlots?.length,3);
 assert.deepEqual(r.visualTableSlots?.map(s=>s.durationSeconds.lower),[194,143,90]);
 for(const slot of r.visualTableSlots??[]){
  assert.equal(slot.kind,'unassigned_programme_duration');
  assert.equal(slot.association,'unresolved_icon_or_column_heading');
  assert.equal(slot.sourceRole,'manufacturer_layout_candidate_not_test');
  assert.equal(slot.page,1);assert.equal(slot.rankingAuthorized,false);
  assert.ok(slot.box[2]>slot.box[0]&&slot.box[3]>slot.box[1]);
  assert.deepEqual(slot.durationSeconds,{lower:slot.durationSeconds.lower,upper:slot.durationSeconds.lower});
 }
 assert.equal(r.scientificEvidenceAdmitted,false);assert.equal(r.rankingAuthorized,false);
});
test('240: source-authored thickness qualifier retains only unassigned time intervals',async()=>{
 const r=await load('grill-slots');assert.equal(r.claimCount,0);
 assert.deepEqual(r.visualTableSlots?.map(s=>s.durationSeconds),[
  {lower:300,upper:660},{lower:180,upper:240},{lower:420,upper:540},{lower:900,upper:1500},{lower:180,upper:300}]);
 assert.ok(r.visualTableSlots?.every(s=>s.kind==='unassigned_illustrated_food_time'));
});
test('240: unanchored warranty phone numbers and cooking-like durations cannot be attached',async()=>{
 const r=await load('numbers-no-cue');assert.equal(r.claimCount,0);assert.equal(r.visualTableSlots?.length??0,0);
});
test('240: malformed seconds are never repaired to a plausible different duration',async()=>{
 const r=await load('invalid-seconds');assert.deepEqual(r.visualTableSlots?.map(s=>s.durationSeconds.lower),[143,90,201]);
});
test('240: every slot is quarantined outside the claim and discrepancy registries',async()=>{
 const r=await load('program-slots');assert.equal(r.claimCount,0);assert.deepEqual(r.claims,[]);
 assert.equal(r.discrepancies?.edges?.length??0,0);
 assert.equal(r.rawDocumentStored,false);assert.equal(r.rawTextStored,false);
 assert.ok(r.reasonCodes.includes('pdf_visual_table_unassigned_slots_require_image_label_review'));
 assert.ok(r.visualTableSlots?.every(x=>!('food' in x)&&!('program' in x)&&!('model' in x)));
});
test('240: deterministic slot replay on identical input',async()=>{
 assert.deepEqual(await load('grill-slots'),await load('grill-slots'));
});
