import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectReferenceSurfaceSafety152,scanPossibleModelSurfaces152} from '../src/phase152_product_surface_safety.js';
import {recoverTypedDocumentReferences151} from '../src/phase151_type_aware_discourse_recovery.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const sha=(t:string)=>createHash('sha256').update(t).digest('hex');
const input=(t:string,aliases:string[]=[]):ReaderInput139=>({document:{text:t,sha256:sha(t),source:{id:'p152',originalDocumentId:'p152',url:'https://example.net/reviews/source',title:'Constructed review',role:'original_product_test'}},
 ...(aliases.length?{pageIdentity:{reviewedProductId:'unverified',reviewedVariantId:'unverified',reviewedAliases:aliases}}:{})});
const read=(t:string,aliases:string[]=[])=>inspectReferenceSurfaceSafety152(input(t,aliases));
const link=(t:string,mention:string,aliases:string[]=[])=>(()=>{const g=read(t,aliases),p=g.links.find(x=>x.mention.literal===mention);assert.ok(p,mention);return {g,p};})();
const veto='abstain_overlooked_named_competitor';
test('catch Sony BRAVIA 9 II unindexed competitor of LG C6 2026',()=>{
 const {g,p}=link('This TV was evaluated. LG C6 2026 performed better. Sony BRAVIA 9 II was brighter.','This TV');
 assert.equal(p.phase151Decision,'retained_phase149');assert.equal(p.decision,veto);
 assert.deepEqual(g.possibleSurfaces.map(s=>s.span.literal),['LG C6 2026','Sony BRAVIA 9 II']);
 assert.deepEqual(p.interferingSurfaceIds,[g.possibleSurfaces[1].id]);
});
test('a suffix to the already indexed model is not a separate competing product',()=>{
 const {g,p}=link('This TV was evaluated. LG C6 2026 performed better.','This TV');
 assert.equal(g.possibleSurfaces[0].recognizedByBaseline,true);assert.equal(p.decision,'retained_phase149');
});
test('catch unindexed Marantz CD 70 as possible competitor',()=>{
 const g=read('This player was evaluated. Marantz CD 70 performed well. TEAC VRDS-701 was also tested.');
 assert.ok(g.possibleSurfaces.some(s=>s.span.literal==='Marantz CD 70'));
});
test('simple direct model mention retains original tentative reference only',()=>{
 const {p}=link('This player sounded balanced. TEAC VRDS-701 includes a DAC.','This player');assert.equal(p.decision,p.phase151Decision);
});
test('numbered series can flag a separately named lineup',()=>{
 const g=read('LG C6 was reviewed. Philips 5000 Series was also demonstrated. This TV was evaluated.');
 assert.ok(g.possibleSurfaces.some(s=>s.span.literal==='Philips 5000 Series'));
});
test('review mode HDR 1000 is not mistaken for a commercial product',()=>{
 const g=read('LG C6 was tested. HDR 1000 was enabled. This TV was brighter.');
 assert.deepEqual(g.possibleSurfaces.map(s=>s.span.literal),['LG C6']);
});
test('Heavy Duty cycle does not become a product',()=>{
 const g=read('Aster X100 was reviewed. Heavy Duty 60 was selected. This model was quieter.');
 assert.ok(!g.possibleSurfaces.some(s=>s.span.literal.includes('Heavy Duty')));
});
test('measurements like 60 dB are not products',()=>{
 const g=read('LG C6 reached 60 dB and 120 Hz in a constructed lab statement. This TV was evaluated.');
 assert.ok(g.possibleSurfaces.every(s=>!s.span.literal.includes('60 dB')));
});
test('another model in an unrelated paragraph does not block the local link',()=>{
 const {p}=link('This player sounded balanced. TEAC VRDS-701 has a DAC.\n\nThe appendix compares Sony BRAVIA 9 II.','This player');
 assert.equal(p.decision,p.phase151Decision);
});
test('non-technical product name without digits remains a declared blind spot',()=>{
 const g=read('This coffee machine was discussed. Chefman Coffee Station Pro was reviewed.');
 assert.ok(g.possibleSurfaces.every(s=>s.span.literal!=='Chefman Coffee Station Pro'));
 assert.ok(g.scannerBlindSpots.includes('all_word_names_without_model_codes'));
});
test('existing abstentions are never upgraded to candidate decisions',()=>{
 const {p}=link('This TV looks similar to Sony BRAVIA 9 II.','This TV');
 assert.equal(p.phase151Decision,'abstain_explicit_comparison');assert.equal(p.decision,'abstain_explicit_comparison');
});
test('local model competition triggers abstention in longer multi-paragraph constructed text',()=>{
 const t='LG C6 2026 was set to its standard mode. The reviewer recorded the configuration of the screen.\n\nThis TV was measured again. Sony BRAVIA 9 II was separately included in the comparison. The controls were not identical.';
 const g=read(t);assert.ok(g.possibleSurfaces.some(s=>s.span.literal==='Sony BRAVIA 9 II'));
 assert.ok(g.links.every(p=>p.canonicalWriteAuthorized===false));
});
test('cannot promote a source mention to an authenticated commercial identity',()=>{
 const g=read('This TV was evaluated. LG C6 2026 was brighter. Sony BRAVIA 9 II was tested.');
 assert.equal(g.sourceAuthenticated,false);assert.equal(g.accuracy,null);
 assert.ok(g.possibleSurfaces.every(s=>s.commercialIdentityVerified===false));
 assert.ok(g.links.every(p=>p.identityVerified===false&&p.entailmentVerified===false&&p.rankingAuthorized===false));
});
test('source spans remain byte-exact character offsets and hashes',()=>{
 const t='This TV was evaluated. LG C6 2026 looked brighter than Sony BRAVIA 9 II.';
 const g=read(t);for(const s of g.possibleSurfaces){assert.equal(t.slice(s.span.start,s.span.end),s.span.literal);assert.equal(s.span.sha256,sha(s.span.literal));}
});
test('tampered document digest rejected by original source gate',()=>{
 const i=input('LG C6 was tested.');i.document.sha256='0'.repeat(64);assert.throws(()=>inspectReferenceSurfaceSafety152(i));
});
test('scanner rejects swapped baseline document identity',()=>{
 const i=input('LG C6 was tested.');const b=recoverTypedDocumentReferences151(i);
 assert.throws(()=>scanPossibleModelSurfaces152('Sony BRAVIA 9 II was tested.',b));
});
test('invalid cap rejected',()=>assert.throws(()=>inspectReferenceSurfaceSafety152(input('LG C6 was tested.'),0)));
test('zero auto-trust for reviewed page alias',()=>{
 const g=read('This TV was evaluated. LG C6 2026 was tested.',['LG C6 2026']);
 assert.ok(g.possibleSurfaces.every(s=>s.commercialIdentityVerified===false));
 assert.equal(g.baseline151.sourceAuthenticated,false);
});
test('repeat runs identical',()=>{
 const i=input('This TV was evaluated. LG C6 2026 and Sony BRAVIA 9 II were tested.');
 assert.deepEqual(inspectReferenceSurfaceSafety152(i),inspectReferenceSurfaceSafety152(i));
});
test('immutable upstream decisions and graph retained',()=>{
 const i=input('This player was evaluated. TEAC VRDS-701 was tested.');
 const orig=recoverTypedDocumentReferences151(i),g=inspectReferenceSurfaceSafety152(i);
 assert.deepEqual(g.baseline151,orig);assert.deepEqual(recoverTypedDocumentReferences151(i),orig);
});
test('truncation never silently accepted as complete',()=>{
 const t='LG C6 was tested. Sony BRAVIA 9 II was tested. TEAC VRDS-701 was tested. This TV was brighter.';
 const g=inspectReferenceSurfaceSafety152(input(t),1);
 assert.equal(g.truncated,true);assert.ok(g.truncationReasons.includes('surface_budget_exceeded'));
 assert.ok(g.links.every(p=>p.decision!== 'retained_phase149'));
});
test('a false positive is still a possible pattern, never an authenticated model',()=>{
 const g=read('Example ABC 123 looked bright. This TV was measured.');
 assert.ok(g.possibleSurfaces.some(s=>s.span.literal==='Example ABC 123'));
 assert.ok(g.possibleSurfaces.every(s=>s.commercialIdentityVerified===false));
});
test('multiple unresolved pronouns remain unresolved',()=>{
 const {g}=link('Aster X100 has a basket and a lid. It can open. It can heat.','It');
 assert.ok(g.links.filter(p=>p.mention.literal==='It').every(p=>!p.decision.includes('candidate_unverified')));
});

test('original text category choice does not change deterministic output',()=>{
 const t='This model was reviewed. LG C6 2026 was tested. Sony BRAVIA 9 II was separately tested.';
 const a=input(t);const b=input(t);b.document.source.title='Different category description';
 assert.deepEqual(inspectReferenceSurfaceSafety152(a).links,inspectReferenceSurfaceSafety152(b).links);
});
