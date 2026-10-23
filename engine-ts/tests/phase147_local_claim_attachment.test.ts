import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readLocalClaimAttachment147} from '../src/phase147_local_claim_attachment.js';
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const input=(text:string)=>({document:{text,sha256:sha(text),source:{id:'fixture147',originalDocumentId:'fixture147',url:'https://example.org/review',title:'fixture',role:'original_product_test' as const}}});
const run=(text:string,max?:number)=>readLocalClaimAttachment147(input(text),max);
function verify(t:string){const o=run(t);for(const a of o.attachments){
 for(const s of [a.quantity,a.clause,...(a.condition?[a.condition]:[]),...(a.subject?[a.subject]:[]),...(a.numericRange?[a.numericRange]:[]),...a.protocolCues]){
  assert.equal(t.slice(s.start,s.end),s.literal);assert.equal(sha(s.literal),s.sha256);
 }
 assert.equal(a.productIdentityProven,false);assert.equal(a.canonicalWriteAuthorized,false);assert.equal(a.rankingAuthorized,false);
 }return o;}
test('manufacturer and observed same-sentence clauses are separate',()=>{
 const o=verify('The maker advertises 60 Wh, but the reviewer measured 54 Wh.');
 assert.deepEqual(o.attachments.map(x=>x.attribution),['manufacturer_claim_surface','test_report_surface']);
 assert.ok(o.attachments[0].clause.end<=o.attachments[1].clause.start);
});
test('advertised reading is not laboratory observation',()=>assert.equal(verify('The manufacturer claims 1500 W.').attachments[0].attribution,'manufacturer_claim_surface'));
test('unit alone does not imply test observation',()=>assert.equal(verify('The oven runs at 1400 W.').attachments[0].attribution,'undetermined'));
test('setting is separate from measurement',()=>assert.equal(verify('The oven was set to 180°C.').attachments[0].attribution,'setting_surface'));
test('observed reading is a textual cue only',()=>assert.equal(verify('The oven measured 165°C.').attachments[0].attribution,'test_report_surface'));
test('same clause competing claims abstains',()=>assert.equal(verify('The maker claims we measured 48 dB.').attachments[0].status,'abstain_ambiguous'));
test('ambiguous conditions within same clause abstain',()=>assert.equal(verify('In HDR and SDR modes it measured 650 nits.').attachments[0].status,'abstain_ambiguous'));
test('HDR and SDR separated by contrast do not contaminate each other',()=>{
 const x=verify('In HDR it measured 900 nits, but in SDR it measured 350 nits.');
 assert.equal(x.attachments[0].surfaceMode,'hdr');assert.equal(x.attachments[1].surfaceMode,'sdr');
 assert.notEqual(x.attachments[0].clause.literal,x.attachments[1].clause.literal);
});
test('mode word not promoted to tested product',()=>{
 const x=verify('Heavy Duty cycle measured 900 W.');assert.equal(x.attachments[0].productIdentityProven,false);
});
test('negation treated as caution not inverse assertion',()=>{
 const x=verify('The heater did not reach 180°C.');assert.equal(x.attachments[0].polarity,'explicit_negative_surface');
 assert.equal(x.attachments[0].status,'quarantined_local_hypothesis');
});
test('not only is not interpreted as a direct negation',()=>assert.equal(verify('The system not only used 800 W.').attachments[0].polarity,'undetermined'));
test('no transfer from pronoun to previous model',()=>{
 const x=verify('The Aster oven measured 180°C. It reached 165°C.');assert.equal(x.continuity.length,0);
});
test('different explicit models do not link',()=>{
 const x=verify('The Aster oven measured 180°C. The Bex oven measured 165°C.');assert.equal(x.continuity.length,0);
});
test('same named subject with same mode remains non-authoritative',()=>{
 const x=verify('The Aster oven measured 180°C in Turbo mode. The Aster oven measured 165°C in Turbo mode.');
 assert.equal(x.continuity[0]?.status,'same_surface_compatible_candidate');
 assert.equal(x.continuity[0]?.samePhysicalProductProven,false);
});
test('changed modes block links',()=>{
 const x=verify('The Aster oven measured 180°C in Turbo mode. The Aster oven measured 165°C in Eco mode.');
 assert.equal(x.continuity[0]?.status,'blocked_context_change');
});
test('absence of conditions does not prove comparable protocols',()=>{
 const x=verify('The Aster oven measured 180°C. The Aster oven measured 165°C.');
 assert.equal(x.continuity[0]?.status,'insufficient_condition');
});
test('repeated source names with different claims cannot be combined',()=>{
 const x=verify('The Aster oven measured 180°C in Turbo mode. The Aster oven advertises 165°C in Turbo mode.');
 assert.equal(x.continuity[0]?.status,'blocked_reporting_change');
});
test('changed polarity blocks repeated-subject continuity',()=>{
 const x=verify('The Aster oven measured 180°C in Turbo mode. The Aster oven did not measure 165°C in Turbo mode.');
 assert.equal(x.continuity[0]?.status,'blocked_polarity');
});
test('different measurement dimensions cannot imply continuity',()=>{
 const x=verify('The Aster oven measured 180°C. The Aster oven used 800 W.');assert.equal(x.continuity.length,0);
});
test('absence of numeric measurements is not proof of no features',()=>{
 const x=run('The oven cooks evenly.');assert.equal(x.attachments.length,0);assert.equal(x.accuracy,null);
});
test('no independent accuracy claims',()=>{
 const x=run('The TV reached 900 nits in HDR mode.');assert.equal(x.independentGoldAnnotations,0);
 assert.equal(x.rankingAuthorized,false);assert.equal(x.canonicalWriteAuthorized,false);
});
test('budget is bounded',()=>{for(const n of [0,-1,1.5,251])assert.throws(()=>run('The TV measured 900 nits.',n));});
test('budget exhaustion declares incomplete coverage',()=>{
 const x=run('The TV measured 900 nits and 800 nits.',1);assert.equal(x.attachments.length,1);
 assert.equal(x.coverageTruncated,true);assert.ok(x.truncationReasons.includes('claim_attachment_limit'));
});
test('original source digest mutation is rejected by prior pipeline',()=>{
 const i=input('The TV measured 900 nits.');i.document.sha256='0'.repeat(64);
 assert.throws(()=>readLocalClaimAttachment147(i));
});
test('all earlier typed compound surfaces remain included',()=>{
 const x=run('The player accepts 24-bit/192kHz and the TV reached 900 nits.');
 assert.equal(x.baseline146.compounds.length,1);assert.equal(x.attachments.length,2);
});
test('document-origin metadata does not authenticate observations',()=>{
 const x=run('The lab measured 1,400 nits.');assert.equal(x.sourceAuthenticated,false);
 assert.ok(x.attachments.every(y=>!y.sourceAuthenticated));
});

test('temperature range does not become a single exact measurement',()=>{
 const x=verify('Temperature 75 - 99 degrees Celsius (customisable)');
 assert.equal(x.attachments[0].numericRange?.literal,'75 - 99 degrees Celsius');
 assert.equal(x.attachments[0].status,'abstain_ambiguous');
});
test('power range is preserved with both endpoints',()=>{
 const x=verify('Power: 1430-1700W');assert.equal(x.attachments[0].numericRange?.literal,'1430-1700W');
 assert.equal(x.attachments[0].status,'abstain_ambiguous');
});
test('test window is retained as protocol cue not a measurement',()=>{
 const x=verify('a peak HDR brightness measurement of 1291 nits in the 2% window');
 assert.equal(x.attachments[0].protocolCues[0]?.literal,'2% window');
 assert.equal(x.attachments[0].protocolVerified,false);
});
test('test bench version is a raw cue, never authenticated protocol',()=>{
 const x=verify('In test bench 1.7, the TV measured 900 nits.');
 assert.equal(x.attachments[0].protocolCues[0]?.literal,'test bench 1.7');
 assert.equal(x.attachments[0].protocolVerified,false);
});
