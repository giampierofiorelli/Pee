import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {discoverEntityInventory153} from '../src/phase153_entity_inventory.js';
import type {ReaderInput139} from '../src/phase139_unmarked_english_candidate_reader.js';
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const doc=(text:string,title='Independent constructed test',aliases:string[]=[]):ReaderInput139=>({
 document:{text,sha256:sha(text),source:{id:'p153',originalDocumentId:'p153',url:'https://example.org/review/p153',title,role:'original_product_test'}},
 ...(aliases.length?{pageIdentity:{reviewedProductId:'not_verified',reviewedVariantId:'not_verified',reviewedAliases:aliases}}:{})
});
const get=(t:string,title?:string,aliases?:string[])=>discoverEntityInventory153(doc(t,title,aliases));
const names=(t:string,title?:string)=>get(t,title).mentions.map(m=>m.span.literal);
test('all-word extended air fryer name absent from Phase152 scanner is recovered',()=>{
 const t='The Cosori Dual Blaze Twinfry Compact Air Fryer is nicely designed.';
 const g=get(t);assert.deepEqual(g.baseline152.possibleSurfaces,[]);
 assert.ok(g.mentions.some(m=>m.span.literal==='Cosori Dual Blaze Twinfry Compact Air Fryer'));
});
test('complex multi-token Lenovo product with intermediate letters and digits',()=>{
 const t='Lenovo ThinkBook 16 G7 QOY 21NH0005GE performed well.';
 assert.ok(names(t).includes('Lenovo ThinkBook 16 G7 QOY 21NH0005GE'));
});
test('multiword Ninja all-word name',()=>assert.ok(names('Ninja Prestige DualBrew was assessed.').includes('Ninja Prestige DualBrew')));
test('all-word series supported by page-title correspondence',()=>{
 const t='Breville Bambino is the model under review.';
 const g=get(t,'Breville Bambino review');
 assert.ok(g.mentions.some(m=>m.span.literal==='Breville Bambino'&&m.signals.includes('page_title_correspondence')));
});
test('family name and suffix variant appear as separate hypotheses',()=>{
 const g=get('Breville Bambino performed well. Breville Bambino Plus adds a feature.');
 assert.ok(g.mentions.some(m=>m.span.literal==='Breville Bambino'));
 assert.ok(g.mentions.some(m=>m.span.literal==='Breville Bambino Plus'));
 assert.ok(g.variantWarnings.some(v=>g.mentions.some(m=>m.id===v.leftMentionId&&m.span.literal==='Breville Bambino')||g.mentions.some(m=>m.id===v.rightMentionId&&m.span.literal==='Breville Bambino')));
});
test('family vs SKU markers do not conflate Philips models',()=>{
 const g=get('Philips 3200 was tested. Philips 3000i Series was compared.');
 assert.ok(g.mentions.some(m=>m.span.literal==='Philips 3200'));
 assert.ok(g.mentions.some(m=>m.span.literal==='Philips 3000i Series'&&m.kind==='possible_family'));
 assert.ok(g.groups.length>=2);
});
test('discourse shorthand recorded as unresolved without validation',()=>{
 const g=get('Philips 3200 was tested. The 3200 uses a new filter.');
 assert.ok(g.mentions.some(m=>m.span.literal==='3200'&&m.kind==='unresolved_shorthand'));
});
test('numeric measurement with rpm is not a shorthand product',()=>{
 assert.ok(!names('LG C6 measured 3200 rpm in a fabricated example.').includes('3200'));
});
test('number in a document without model context is not a product',()=>assert.ok(!names('The 3200 number is the laboratory value.').includes('3200')));
test('mode, tests, and measurements are filtered',()=>{
 const g=get('Heavy Duty 60, HDR 1000, Eco Wash 40, and USB 3 were enabled. LG C6 was tested at 120 Hz.');
 for(const forbidden of ['Heavy Duty','HDR 1000','Eco Wash','USB 3','120 Hz'])assert.ok(!g.mentions.some(m=>m.span.literal.includes(forbidden)),forbidden);
});
test('title metadata alone does not invent a source span',()=>{
 const g=get('It performed adequately.','Breville Bambino Plus review');assert.equal(g.mentions.length,0);
});
test('page title is only correspondence, never verified product identity',()=>{
 const g=get('Breville Bambino Plus was tested.','Breville Bambino Plus review');
 assert.ok(g.mentions.every(m=>m.commercialIdentityVerified===false&&m.canonicalWriteAuthorized===false));
});
test('caller-supplied aliases are untrusted and never authorize ranking',()=>{
 const g=get('The Coffee Station was tested.','Constructed review',['Coffee Station']);
 const m=g.mentions.find(m=>m.span.literal==='Coffee Station');assert.ok(m);
 assert.ok(m.signals.includes('caller_alias'));assert.equal(m.rankingAuthorized,false);
});
test('partial aliases do not match inside other words',()=>{
 const g=get('SuperBambinoPro was tested.','test',['Bambino']);
 assert.ok(!g.mentions.some(m=>m.signals.includes('caller_alias')));
});
test('identical repeated names are grouped as written surfaces only',()=>{
 const g=get('Philips 3200 was mentioned. Philips 3200 was tested.');
 assert.ok(g.groups.some(v=>v.mentionIds.length===2&&v.relation==='same_written_surface_not_identity'));
 assert.ok(g.groups.every(v=>v.identityVerified===false));
});
test('variant relation warns and never merges same-brand different models',()=>{
 const g=get('LG C6 was measured. LG C6 2026 was compared.');
 assert.ok(g.groups.length>=2);assert.ok(g.variantWarnings.length>0);
});
test('distinct competitor names never merged because manufacturer matches',()=>{
 const g=get('LG C6 and LG G6 were compared.');
 assert.ok(g.groups.length>=2);assert.ok(g.variantWarnings.length===0);
});
test('detection returns original exact UTF-16 offsets and SHA256 hashes',()=>{
 const t='The Ninja Prestige DualBrew was tested. Philips 3000i Series was tested.';
 for(const m of get(t).mentions){assert.equal(t.slice(m.span.start,m.span.end),m.span.literal);assert.equal(sha(m.span.literal),m.span.sha256);}
});
test('phase152 baseline remains embedded intact',()=>{
 const g=get('This TV was evaluated. LG C6 2026 performed better. Sony BRAVIA 9 II was brighter.');
 assert.equal(g.baseline152.phase,152);
 assert.ok(g.baseline152.links.some(l=>l.decision==='abstain_overlooked_named_competitor'));
});
test('phase153 can only veto tentative links and never upgrade abstentions',()=>{
 const g=get('This TV was evaluated. LG C6 2026 performed better. Sony BRAVIA 9 II was brighter.');
 for(const l of g.links)if(l.phase152Decision.startsWith('abstain')||l.phase152Decision.startsWith('blocked'))assert.equal(l.decision,l.phase152Decision);
});
test('unseen unstructured competing commercial name vetoes a candidate',()=>{
 const g=get('This TV was evaluated. LG C6 performed better. Cosori Dual Blaze Twinfry Compact Air Fryer was also compared.');
 assert.ok(g.mentions.some(m=>m.span.literal==='Cosori Dual Blaze Twinfry Compact Air Fryer'));
 const tentative=g.links.filter(l=>l.phase152Decision==='retained_phase149'||l.phase152Decision.endsWith('candidate_unverified'));
 assert.ok(tentative.every(l=>l.decision!==l.phase152Decision));
});
test('same name in another paragraph cannot veto unconnected paragraph candidate',()=>{
 const g=get('This player sounded balanced. TEAC VRDS-701 has a DAC.\n\nCosori Dual Blaze Twinfry Compact Air Fryer was compared.');
 const l=g.links.find(l=>l.mention.literal==='This player');assert.ok(l);assert.equal(l.decision,l.phase152Decision);
});
test('missing competitor inventory is not treated as product absence',()=>{
 const g=get('The unit sounded fine.');assert.equal(g.independentGoldAnnotations,0);assert.equal(g.precision,null);assert.equal(g.recall,null);
});
test('deliberately tiny candidate cap causes explicit truncation',()=>{
 const g=discoverEntityInventory153(doc('LG C6 was tested. Sony BRAVIA 9 II and Marantz CD 70 were compared.'),1);
 assert.equal(g.truncated,true);assert.ok(g.truncationReasons.includes('phase153_entity_cap_exceeded'));
});
test('bad maximum mention cap rejected',()=>assert.throws(()=>discoverEntityInventory153(doc('LG C6 was tested.'),0)));
test('bad source digest rejected before candidate extraction',()=>{
 const d=doc('LG C6 was tested.');d.document.sha256='0'.repeat(64);
 assert.throws(()=>discoverEntityInventory153(d));
});
test('two runs with same source, metadata and aliases are deterministic',()=>{
 const d=doc('Breville Bambino Plus and Breville Bambino were compared.','Bambino Plus review',['Breville Bambino Plus']);
 assert.deepEqual(discoverEntityInventory153(d),discoverEntityInventory153(d));
});
test('title changes cannot alter scientific approval gates',()=>{
 const t='Breville Bambino Plus was tested.';
 for(const title of ['Breville Bambino Plus review','A different title']){
  const g=get(t,title);assert.equal(g.rankingAuthorized,false);assert.equal(g.canonicalWriteAuthorized,false);
 }
});
test('language remains English-focused, not a multilingual identity claim',()=>{
 const g=get('Samsung WW90T684DLH was tested.');
 assert.ok(g.mentions.every(m=>m.basis==='unverified_span_hypothesis'));
});
test('technique named something like Digital Power is not assumed to be a product',()=>{
 assert.ok(!names('Digital Power was improved in the laboratory.').includes('Digital Power'));
});
test('do not assume unmentioned model from title alone',()=>{
 const g=get('No full product name was provided.','Dualit 2 Slice Lite 26205 review');
 assert.ok(!g.mentions.some(m=>m.span.literal==='Dualit 2 Slice Lite 26205'));
});
test('apostrophe-bearing commercial name is a source hypothesis, not a verified manufacturer',()=>{
 const g=get("De'Longhi Stilosa was introduced.");
 assert.ok(g.mentions.some(m=>m.span.literal==="De'Longhi Stilosa"));
 assert.ok(g.mentions.every(m=>!m.commercialIdentityVerified));
});
test('curly apostrophe is preserved verbatim in manufacturer-shaped phrase',()=>{
 assert.ok(names('De’Longhi La Specialista Arte Evo was assessed.').includes('De’Longhi La Specialista Arte Evo'));
});
test('standalone numbered product descriptor stays an unresolved shorthand',()=>{
 const g=get('The 3200 is a stylish mid-sized device.');
 assert.ok(g.mentions.some(m=>m.span.literal==='3200'&&m.kind==='unresolved_shorthand'));
});
test('unseen class with numbered family and long SKU is merely a possible surface',()=>{
 const g=get('Bosch 800 Series SHP78CM5N was reviewed.');
 assert.ok(g.mentions.some(m=>m.span.literal==='Bosch 800 Series SHP78CM5N'));
 assert.equal(g.independentGoldAnnotations,0);
});
test('bounded proposal lattice fails visibly closed under excessive distinct names',()=>{
 const t=Array.from({length:85},(_,i)=>`ReviewBrand Model${i} Pro was reviewed.`).join(' ');
 const g=discoverEntityInventory153(doc(t),1);
 assert.equal(g.truncated,true);
 assert.ok(g.truncationReasons.includes('phase153_discovery_budget_exceeded'));
 assert.ok(g.mentions.every(m=>!m.rankingAuthorized&&!m.canonicalWriteAuthorized));
});
