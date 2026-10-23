import test from 'node:test';import assert from 'node:assert/strict';
import {loadQuantityKnowledge} from '../src/quantity_knowledge.js';
import {loadPropertyDefinitions} from '../src/property_definitions.js';
import {attributeProperty,interpretWithDefinitions,compareByDefinition} from '../src/definition_interpreter.js';
import {acquireEntities,metricEntities,withAcquiredDefinitions,withAcquiredAspects,documentSupport,subjectTerms,isWordName} from '../src/scientific_entities.js';

// S96: typed scientific entities from teaching tables and the quantity knowledge. Every table text is invented for this test.
const qk=loadQuantityKnowledge();const defs=loadPropertyDefinitions(qk);
const md=`# Panel knowledge
| Quantity | Meaning | Unit / state | Trap |
|---|---|---|---|
| Screen luminance | Light output of a white patch, measured luminance | cd/m², window size | Not the maker's peak claim |
| Glare handling | How reflections look in a lit room | room light, angle | Not a coating name |
| C(T,RH,mode) | Capacity at a condition | L/day | — |
| Flicker | Visible modulation of light output | Hz, duty cycle | — |
`;
const ents=acquireEntities(qk,[{source:'invented.md',md}],defs);

test('a kind is admitted only when two cells agree; otherwise the attribute stays untyped', ()=>{
 const lum=ents.find(e=>e.name==='Screen luminance')!;assert.equal(lum.class,'property');assert.deepEqual(lum.quantity.kinds,['luminance']);
 assert.equal(lum.object.status,'unknown','the object of interest is never inferred from the name');
 assert.ok(lum.notEstablished.length===1&&lum.provenance.line>0);
 const glare=ents.find(e=>e.name==='Glare handling')!;assert.equal(glare.class,'attribute');assert.equal(glare.quantity.status,'unknown');
 // only the unit column types flicker (Hz): one cell alone does not make it a property
 const fl=ents.find(e=>e.name==='Flicker')!;assert.notEqual(fl.class,'property');});

test('an argument list is not an alias; slash alternatives share their head', ()=>{
 assert.deepEqual(subjectTerms('C(T,RH,mode)'),[]);assert.deepEqual(subjectTerms('HDR white/luminance').sort(),['hdr luminance','hdr white']);
 assert.ok(isWordName('Viewing angles')&&!isWordName('IEF, CADR/W')&&!isWordName('mAh'));});

test('QK metrics are typed property entities with their stated relations; defined metrics are reused, not duplicated', ()=>{
 const ms=metricEntities(qk,defs);const lag=ms.find(e=>e.quantity.metrics[0]==='input_lag')!;
 assert.equal(lag.state,'qk_metric');assert.deepEqual(lag.quantity.kinds,['duration']);assert.ok(lag.conditions.some(c=>c.term==='signal_mode'));
 const cadr=ms.find(e=>e.quantity.metrics[0]==='cadr')!;assert.equal(cadr.existingProperty,'clean_air_delivery_rate');
 assert.ok(ms.find(e=>e.quantity.metrics[0]==='free_airflow')!.relations.some(r=>r.type==='not_equivalent_to'&&r.target==='cadr'));});

test('acquired candidates reach the existing reader; pd.5 alone abstains; unrelated values are not claimed', ()=>{
 const E1=withAcquiredDefinitions(qk,defs.pack,[...ents,...metricEntities(qk,defs)]);
 assert.ok(E1.added.includes('qkm_input_lag')&&E1.added.some(x=>x.startsWith('acq_screen_luminance')));
 assert.ok([...E1.defs.properties.values()].filter(p=>p.sources.includes('s96_teaching')).every(p=>p.state==='candidate'&&p.object==='unstated'));
 const lag={value:9.8,unit:'ms',label:'Input lag on the panel measured 9.8 ms in game mode',valueAt:36,category:'monitors'};
 assert.equal(attributeProperty(defs,qk,lag).value,null);
 assert.equal(attributeProperty(E1.defs,qk,lag,{ownTermObject:true}).value,'qkm_input_lag');
 // a response time is not input lag: no term of the candidate in the value's own words
 const resp={value:4.1,unit:'ms',label:'The average response time of the panel was 4.1 ms',valueAt:39,category:'monitors'};
 assert.notEqual(attributeProperty(E1.defs,qk,resp,{ownTermObject:true}).value,'qkm_input_lag');});

test('attribute entities become candidate aspects only under a word name; documents support candidates by labelled values', ()=>{
 const A=withAcquiredAspects(qk,ents);assert.ok(A.qk.pack.aspects!.some(a=>a.terms.includes('glare handling')));
 const sup=documentSupport(qk,ents,[{id:'d1',blocks:['We measured a screen luminance of 410 cd/m² on a white window.']},{id:'d2',blocks:['The stand is 20 cm deep.']}]);
 assert.deepEqual(sup.get(ents.find(e=>e.name==='Screen luminance')!.id),['d1']);});

test('S97 C1: conditions transferred into candidates keep comparability honest', ()=>{
 const ms=metricEntities(qk,defs);const plain=withAcquiredDefinitions(qk,defs.pack,ms).defs;const withC=withAcquiredDefinitions(qk,defs.pack,ms,{transferConditions:true}).defs;
 const p=withC.properties.get('qkm_peak_luminance')!;assert.ok(p.conditions.some(([d])=>withC.dimensions.get(d)?.qkAxis==='window_size'));
 assert.equal(plain.properties.get('qkm_peak_luminance')!.conditions.length,0);
 const v=(label:string)=>({value:1000,unit:'nits',label,valueAt:label.indexOf('1000'),category:'monitors'});
 const a=interpretWithDefinitions(withC,qk,{...v('peak brightness of 1000 nits'),conditions:[]},{ownTermObject:true} as never);
 const b=interpretWithDefinitions(withC,qk,{...v('peak brightness of 1000 nits'),conditions:[]},{ownTermObject:true} as never);
 assert.equal(a.property.value,'qkm_peak_luminance');assert.equal(compareByDefinition(withC,a,b).verdict,'conditions_unestablished');
 const a0=interpretWithDefinitions(plain,qk,{...v('peak brightness of 1000 nits'),conditions:[]},{ownTermObject:true} as never);
 assert.equal(compareByDefinition(plain,a0,a0).verdict,'comparable','without the transfer the candidate is wrongly comparable');});
