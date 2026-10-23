import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readCompoundConditions146} from '../src/phase146_compound_conditions.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const h=(x:string)=>createHash('sha256').update(x).digest('hex');
const input=(text:string):ReaderInput139=>({document:{text,sha256:h(text),source:{id:'phase146_fixture',originalDocumentId:'trial_146',url:'https://example.org/review',title:'Constructed example',role:'original_product_test'}},pageIdentity:{reviewedProductId:'aster',reviewedVariantId:'main',reviewedAliases:['Aster']}});
const run=(t:string,b?:number)=>readCompoundConditions146(input(t),b);
const check=(text:string,s:{start:number;end:number;literal:string;sha256:string})=>{assert.equal(text.slice(s.start,s.end),s.literal);assert.equal(h(s.literal),s.sha256);};
test('24-bit/192kHz captured as a single compound, not merely kHz',()=>{
 const t='The CD unit handles 24-bit/192kHz files.'; const c=run(t).compounds[0];
 assert.equal(c.evidence.literal,'24-bit/192kHz');assert.equal(c.kind,'digital_audio_format_surface');
 assert.deepEqual(c.components.map(p=>p.kind),['bit_depth','sample_rate']);
 assert.equal(c.components[0].canonicalValue,24);assert.equal(c.components[1].canonicalValue,192000);
 assert.equal(c.components[1].evidence.literal,'192kHz');check(t,c.evidence);c.components.forEach(p=>check(t,p.evidence));
 assert.equal(c.interpretation,'format_or_compatibility_unspecified');assert.equal(c.canonicalWriteAuthorized,false);
});
test('16 bit / 44.1 kHz normalized without confusing bits and frequency',()=>{
 const c=run('The format is 16 bit / 44.1 kHz.').compounds[0];assert.equal(c.components[0].value,16);
 assert.equal(c.components[1].canonicalValue,44100);assert.equal(c.components[1].evidence.literal,'44.1 kHz');
});
test('sample rate without bit depth is not a complete digital-audio compound',()=>assert.equal(run('The player claims 192 kHz.').compounds.length,0));
test('bit depth alone does not imply sample rate',()=>assert.equal(run('It supports 24-bit files.').compounds.length,0));
test('ordinary CD-DA 16-bit/44.1kHz does not imply device can play high-res files',()=>{
 const c=run('CD-DA uses 16-bit/44.1kHz.').compounds[0];assert.equal(c.subjectVerified,false);assert.equal(c.protocolVerified,false);
});
test('negated product support still only yields a quoted format surface',()=>{
 const c=run('The unit does not support 24-bit/192kHz files.').compounds[0];assert.equal(c.interpretation,'format_or_compatibility_unspecified');
});
test('wrong separator is not silently grouped',()=>assert.equal(run('20-bit audio and 96kHz upsampling.').compounds.length,0));
test('caps on bit-depth reject implausible groups',()=>assert.equal(run('The number 99-bit/192kHz appears.').compounds.length,0));
test('speaker 88 dB/W/m has typed dimensions rather than bare volume',()=>{
 const t='The speaker has 88 dB/W/m sensitivity.';const c=run(t).compounds[0];assert.equal(c.kind,'speaker_sensitivity_surface');
 assert.deepEqual(c.components.map(p=>p.kind),['sound_level_ratio','power_reference','distance_reference']);
 assert.equal(c.interpretation,'sensitivity_specification_not_measured_output');assert.equal(c.components[0].value,88);
 c.components.forEach(p=>check(t,p.evidence));
});
test('quoted 1W/1m notation is recognized without claiming an SPL test',()=>{
 const c=run('Rated at 90 dB/1W/1m.').compounds[0];assert.equal(c.components[1].evidence.literal,'1W');assert.equal(c.components[2].evidence.literal,'1m');
 assert.equal(c.protocolVerified,false);
});
test('speaker power without acoustic ratio is not a sensitivity',()=>assert.equal(run('Rated 90 W power.').compounds.length,0));
test('sensitivity compound does not turn to measured sound pressure output',()=>{
 const c=run('The manufacturer quotes 87 dB/W/m.').compounds[0];assert.equal(c.sourceAuthenticated,false);assert.equal(c.rankingAuthorized,false);
});
test('HDR peak ten percent window attaches to luminance candidate',()=>{
 const t='In HDR peak 10% window the TV measured 1,362 cd/m².'; const d=run(t).displayConditions[0];
 assert.equal(d.mode,'HDR');assert.equal(d.metric,'peak');assert.equal(d.windowPercent,10);assert.equal(d.ambiguous,false);
 assert.equal(d.windowEvidence?.literal,'10% window');check(t,d.windowEvidence!);assert.equal(d.protocolVerified,false);
});
test('SDR sustained window is distinct from peak HDR',()=>{
 const d=run('In SDR sustained 100% window it measured 300 nits.').displayConditions[0];
 assert.equal(d.mode,'SDR');assert.equal(d.metric,'sustained');assert.equal(d.windowPercent,100);
});
test('window percent does not become a quantity measurement',()=>{
 const x=run('At HDR 10% window the panel measured 900 nits.');assert.equal(x.baseline145.measurements.length,1);
 assert.equal(x.baseline145.measurements[0].canonicalValue,900);assert.equal(x.displayConditions[0].windowPercent,10);
});
test('opposite modes on one line produce unverified condition',()=>{
 const d=run('The HDR and SDR reading was 900 nits in a 10% window.').displayConditions[0];
 assert.equal(d.mode,'undetermined');assert.equal(d.ambiguous,true);
});
test('conflicting window sizes prevent choosing a window',()=>{
 const d=run('For 2% and 10% window, the reading was 900 nits.').displayConditions[0];
 assert.equal(d.windowPercent,null);assert.equal(d.ambiguous,true);
});
test('do not force a window where only brightness is provided',()=>{
 const d=run('The television measured 950 cd/m².').displayConditions[0];assert.equal(d.windowPercent,null);
 assert.ok(d.reasons.includes('window_test_condition_not_found'));
});
test('an acoustic measurement has no HDR window',()=>assert.equal(run('The speaker registered 80 dB.').displayConditions.length,0));
test('explicit repeated oven identity permits only a quarantined cross-sentence candidate',()=>{
 const t='The Aster oven was set to 180°C. The Aster oven reached 165°C.';const p=run(t).temperaturePairs[0];
 assert.equal(p.linkType,'repeated_explicit_subject_candidate');assert.equal(p.setpoint.literal,'180°C');
 assert.equal(p.reading.literal,'165°C');assert.equal(p.samePhysicalDeviceProven,false);
 assert.equal(p.measurementProtocolVerified,false);assert.equal(p.canonicalWriteAuthorized,false);
 p.evidence.forEach(e=>check(t,e));
});
test('no link from a pronoun across sentences',()=>assert.equal(run('The Aster oven was set to 180°C. It reached 165°C.').temperaturePairs.length,0));
test('other oven must not be linked',()=>assert.equal(run('The Aster oven was set to 180°C. The Bex oven reached 165°C.').temperaturePairs.length,0));
test('paragraph boundaries disallow linking',()=>assert.equal(run('The Aster oven was set to 180°C.\n\nThe Aster oven measured 165°C.').temperaturePairs.length,0));
test('measurements with no set cue do not form accuracy pair',()=>assert.equal(run('The Aster oven reached 180°C. The Aster oven reached 165°C.').temperaturePairs.length,0));
test('two setpoints do not form a pair',()=>assert.equal(run('The Aster oven was set to 180°C. The Aster oven was set to 165°C.').temperaturePairs.length,0));
test('different dimensions cannot be paired',()=>assert.equal(run('The Aster oven was set to 180°C. The Aster oven consumed 1 kWh.').temperaturePairs.length,0));
test('identical repeated surface in same sentence is still not identity proof',()=>{
 const p=run('The Aster oven was set to 180°C and the Aster oven measured 165°C.').temperaturePairs[0];
 assert.equal(p.linkType,'same_sentence_candidate');assert.equal(p.sensorCalibrationVerified,false);
});
test('source digest mutation is rejected upstream',()=>{const i=input('The unit offers 24-bit/192kHz.');i.document.sha256='0'.repeat(64);assert.throws(()=>readCompoundConditions146(i));});
test('reject invalid compound limits',()=>{for(const b of [0,-1,1.4,201])assert.throws(()=>run('The unit uses 24-bit/192kHz.',b));});
test('compound budget creates an explicit truncation flag',()=>{
 const d=run('24-bit/192kHz and 16-bit/44.1kHz.',1);assert.equal(d.compounds.length,1);assert.equal(d.coverageTruncated,true);
 assert.ok(d.truncationReasons.includes('compound_candidate_limit'));
});
test('missing compounds are not negative evidence',()=>{const d=run('It plays discs.');assert.equal(d.compounds.length,0);assert.equal(d.candidateOnly,true);});
test('entire result is a non-authoritative proposal',()=>{
 const d=run('The Aster oven was set to 180°C. The Aster oven reached 165°C. The unit supports 24-bit/192kHz.');
 assert.equal(d.sourceAuthenticated,false);assert.equal(d.rankingAuthorized,false);assert.equal(d.canonicalWriteAuthorized,false);
 assert.equal(d.independentGoldAnnotations,0);assert.equal(d.accuracy,null);
 assert.ok(d.compounds.every(c=>!c.canonicalWriteAuthorized&&!c.rankingAuthorized));
});
test('original 145 measurements remain present, unaltered and quarantined',()=>{
 const d=run('The TV measured 800 nits in HDR 10% window.');assert.equal(d.baseline145.measurements.length,1);
 assert.equal(d.baseline145.canonicalWriteAuthorized,false);
});
test('A-weighted acoustic readings do not imply sensitivity ratio',()=>assert.equal(run('Sound pressure was 52 dBA.').compounds.length,0));
test('audio and thermal units in the same source remain different candidate types',()=>{
 const d=run('The oven reached 200°C. The player accepts 24-bit/192kHz.');
 assert.equal(d.compounds.length,1);assert.equal(d.baseline145.measurements.some(m=>m.dimension==='temperature'),true);
 assert.equal(d.temperaturePairs.length,0);
});
