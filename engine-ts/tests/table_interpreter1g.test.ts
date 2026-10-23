import test from 'node:test';import assert from 'node:assert/strict';
import {interpretDocumentTables1G,cellElements1G,type Observation1G} from '../src/table_interpreter1g.js';
import {activeInterpreterLessons1G,INTERPRETER_LESSONS1G,interpreterLessonsDigest1G,type InterpreterLessonId1G} from '../src/table_interpreter1g_lessons.js';

// Global table interpreter (1G): properties on FICTIONAL documents (brands Breeze, Airly; domain pee1g-test.test).
const page=(body:string,head='')=>`<!doctype html><html><head><title>Breeze AP10 vs Airly AP20 | Test Lab</title>${head}</head><body><article><h1>Breeze AP10 vs Airly AP20</h1>${body}</article></body></html>`;
const METHOD='<p>We measured noise at every fan speed with a sound meter at 1 m.</p>';
const ROWS:[string,string,string][]=[['Sleep','40.2','-'],['Low','48.2','48.2'],['Medium','54.3','50.4'],['High','66.5','54.3']];
function noise(o:{transpose?:boolean;permute?:boolean;method?:string;head?:string;extra?:string}={}){
 const prods=o.permute?['Airly AP20','Breeze AP10']:['Breeze AP10','Airly AP20'];const v=(r:[string,string,string],p:string)=>p==='Breeze AP10'?r[1]:r[2];
 const table=o.transpose
  ?`<table><tr><th>Fan speed</th>${ROWS.map(r=>`<th>${r[0]}</th>`).join('')}</tr>${prods.map(p=>`<tr><th>${p} (dBA)</th>${ROWS.map(r=>`<td>${v(r,p)}</td>`).join('')}</tr>`).join('')}</table>`
  :`<table><tr><th>Fan speed</th>${prods.map(p=>`<th>${p} (dBA)</th>`).join('')}</tr>${ROWS.map(r=>`<tr><td>${r[0]}</td>${prods.map(p=>`<td>${v(r,p)}</td>`).join('')}</tr>`).join('')}</table>`;
 return page(`<h2>${o.head??'Noise'}</h2>${o.method??METHOD}${table}${o.extra??''}`);}
const t0=(html:string,lessons?:InterpreterLessonId1G[])=>interpretDocumentTables1G(html,lessons?{lessons}:{}).tables[0];
const key=(o:Observation1G)=>[o.product,o.property.join('/'),o.value,o.unit,[...o.conditions].sort().join('/'),o.evidence.class].join(' | ');
const keys=(html:string)=>t0(html).observations.map(key).sort();

test('the whole table is interpreted before observations: products on one axis, settings on the other, one quantity',()=>{
 const t=t0(noise());assert.equal(t.status,'interpreted');
 assert.deepEqual([t.selected!.hypothesis.colLevels,t.selected!.hypothesis.rowLevels],[['product'],['condition']]);
 assert.ok(t.selected!.evidence.some(e=>e.signal==='labels_named_in_document'),'product labels grounded in the document');
 assert.equal(t.observations.length,7,'seven values; the dash is not an observation');assert.equal(t.missing.length,1);
 const o=t.observations.find(x=>x.value===66.5)!;assert.deepEqual([o.product,o.unit,o.conditions.includes('High'),o.evidence.class],['Breeze AP10','db',true,'publisher_measured']);
});
test('metamorphic: transposition and column permutation keep the observations',()=>{
 assert.deepEqual(keys(noise({transpose:true})),keys(noise()));
 assert.deepEqual(keys(noise({permute:true})),keys(noise()));
});
test('repeated values at two coordinates are two observations with their own products',()=>{
 const same=t0(noise()).observations.filter(o=>o.value===48.2);assert.equal(same.length,2);
 assert.notEqual(same[0].id,same[1].id);assert.deepEqual(same.map(o=>o.product).sort(),['Airly AP20','Breeze AP10']);
});
test('compound cells, explicit zero and costs: each element is its own observation; a cost of use is derived',()=>{
 const html=page(`<h2>Power</h2><p>We measured power use at every fan speed with a plug-in meter.</p><table><tr><th>Fan speed</th><th>Breeze AP10 (W + $/month)</th><th>Airly AP20 (W + $/month)</th></tr>
<tr><td>Low</td><td>31.3W ($2.74)</td><td>20W ($1.75)</td></tr><tr><td>Standby</td><td>0W ($0)</td><td>-</td></tr></table>`);
 const obs=t0(html).observations;
 const b=obs.filter(o=>o.product==='Breeze AP10'&&o.conditions.includes('Low'));assert.deepEqual(b.map(o=>[o.value,o.unit,o.evidence.class]),[[31.3,'w','publisher_measured'],[2.74,'$','derived_or_estimated']]);
 assert.ok(obs.some(o=>o.value===0&&o.unit==='w'),'an explicit zero is a value');
});
test('hierarchical headers: a spanning group header gives the property, its sub-headers the conditions',()=>{
 const html=page(`<h2>Noise test results</h2><table><thead><tr><th rowspan="2">Model</th><th colspan="2">Noise (dBA)</th></tr><tr><th>Low</th><th>High</th></tr></thead>
<tbody><tr><td>Breeze AP10</td><td>40</td><td>55</td></tr><tr><td>Airly AP20</td><td>41</td><td>52</td></tr></tbody></table>`);
 const t=t0(html);assert.equal(t.status,'interpreted');assert.deepEqual(t.selected!.hypothesis.colLevels,['property','condition']);
 const o=t.observations.find(x=>x.value===55)!;assert.deepEqual([o.product,o.property,o.conditions,o.unit],['Breeze AP10',['Noise'],['High'],'db']);
});
test('methodology: same-section statements count; a page-level method section counts only when it names the table\'s products',()=>{
 const away=(names:boolean)=>page(`<h2>Noise</h2><table><tr><th>Fan speed</th><th>Breeze AP10 (dBA)</th><th>Airly AP20 (dBA)</th></tr><tr><td>Low</td><td>48</td><td>47</td></tr><tr><td>High</td><td>60</td><td>58</td></tr></table>
<h2>How we test</h2><p>We measured noise with a sound meter${names?' for the Breeze AP10 and the Airly AP20':''}.</p>`);
 assert.ok(t0(away(false)).observations.every(o=>o.evidence.class==='unknown'),'unscoped method section: abstain');
 assert.ok(t0(away(true)).observations.every(o=>o.evidence.class==='publisher_measured'),'method section naming the products');
 // the failed decision GL4 corrects reproduces without it
 assert.ok(t0(away(false),activeInterpreterLessons1G().filter(l=>l!=='GL4_scoped_method_statements')).observations.every(o=>o.evidence.class==='publisher_measured'));
});
test('removing or contradicting the method changes the evidence class, not the structure',()=>{
 const base=t0(noise());const none=t0(noise({method:''}));
 assert.equal(none.selected!.hypothesis.id,base.selected!.hypothesis.id);assert.ok(none.observations.every(o=>o.evidence.class==='unknown'));
 const both=t0(noise({method:METHOD+'<p>The figures quoted are the manufacturer\'s claimed noise levels.</p>'}));
 assert.ok(both.observations.every(o=>o.evidence.class==='disputed'&&o.evidence.contradictions.length>0));
});
test('a nearby specification table is declared; the test table beside it is unchanged',()=>{
 const spec='<h3>Specifications</h3><table><tr><th>Spec</th><th>Breeze AP10</th></tr><tr><td>Weight</td><td>5 kg</td></tr><tr><td>Rated noise</td><td>24 dB</td></tr></table>';
 const r=interpretDocumentTables1G(noise({extra:spec}));
 assert.deepEqual(r.tables[0].observations.map(key),t0(noise()).observations.map(key));
 assert.ok(r.tables[1].observations.filter(o=>o.kind==='quantity').every(o=>o.evidence.class==='manufacturer_declared'));
});
test('irrelevant links and badges do not change the interpretation',()=>{
 const extra='<p><a href="https://shop.pee1g-test.test/breeze">Breeze AP10 deals</a> <strong>Best buy</strong></p>';
 assert.deepEqual(keys(noise({extra})),keys(noise()));
});
test('unknown quantities stay: an unknown unit is kept unresolved, never dropped or invented',()=>{
 const html=page(`<h2>Specs</h2><table><tr><th>Property</th><th>Breeze AP10</th><th>Airly AP20</th></tr><tr><td>Flux capacity</td><td>12 zorbs</td><td>14 zorbs</td></tr><tr><td>Weight</td><td>5 kg</td><td>6 kg</td></tr></table>`);
 const o=t0(html).observations.find(x=>x.value===12)!;assert.ok(o,'the value is an observation');assert.equal(o.unit,null);assert.deepEqual(o.property,['Flux capacity']);
 assert.ok(o.unresolved.some(u=>u.startsWith('unit')));
});
test('ambiguous axes: plain labels on both axes and no context give no invented products or measurements',()=>{
 const html=page(`<table><tr><th></th><th>Gamma</th><th>Delta</th></tr><tr><td>Alpha</td><td>3</td><td>4</td></tr><tr><td>Beta</td><td>5</td><td>6</td></tr></table>`);
 const t=t0(html);
 assert.ok(t.observations.every(o=>o.evidence.class==='unknown'&&!['Gamma','Delta','Alpha','Beta'].includes(o.product??'')),JSON.stringify(t.observations.map(o=>o.product)));
});
test('single-subject key-value table: the product comes from structured data, identity from key properties when headers are missing',()=>{
 const ld='<script type="application/ld+json">{"@type":"Product","name":"Breeze AP10"}</script>';
 const kv=page(`<h2>Test data</h2><table><tr><th>Noise (low)</th><td>40 dBA</td></tr><tr><th>Power (high)</th><td>45 W</td></tr></table>`,ld);
 const o=t0(kv).observations[0];assert.equal(o.product,'Breeze AP10');assert.equal(o.productSource,'document');assert.equal(o.evidence.class,'publisher_measured');
 const ids=page(`<table><tr><td></td><td><img src="a.png" alt=""></td><td><img src="b.png" alt=""></td></tr><tr><td>Brand</td><td>Breeze</td><td>Airly</td></tr><tr><td>Model</td><td>AP10</td><td>AP20</td></tr><tr><td>Weight</td><td>5 kg</td><td>6 kg</td></tr></table>`);
 assert.deepEqual(t0(ids).observations.filter(x=>x.value===6).map(x=>[x.product,x.productSource]),[['Airly AP20','identity_properties']]);
});
test('cell elements: identifiers are not values; ranges and bounds are kept as such',()=>{
 assert.deepEqual(cellElements1G('AP-1512HH').map(e=>e.kind),['identifier']);
 assert.deepEqual(cellElements1G('Up to 60 m²').map(e=>[e.kind,e.value,e.unit]),[['bound',60,'m2']]);
 assert.deepEqual(cellElements1G('1.3-1.4kg').map(e=>[e.kind,e.low,e.high,e.unit]),[['range',1.3,1.4,'kg']]);
});
test('reproducibility and versioning: same input, same output; the lesson set is part of the reading identity',()=>{
 assert.deepEqual(interpretDocumentTables1G(noise()),interpretDocumentTables1G(noise()));
 const id=(l?:InterpreterLessonId1G[])=>interpretDocumentTables1G(noise(),l?{lessons:l}:{}).readingIdentity;
 assert.notEqual(id(),id([]));assert.equal(id(),id([...activeInterpreterLessons1G()].reverse()));
 for(const l of INTERPRETER_LESSONS1G)assert.ok(l.counterexamples.length&&l.applicability.length&&l.tests.length&&l.failedDecision,l.id);
 assert.throws(()=>interpreterLessonsDigest1G(['nope' as InterpreterLessonId1G]));
});
test('limits are explicit: a table outside them is listed, not dropped',()=>{
 const wide=page(`<table><tr>${[...Array(14).keys()].map(i=>`<th>h${i}</th>`).join('')}</tr><tr>${[...Array(14).keys()].map(i=>`<td>${i}</td>`).join('')}</tr></table>`);
 const t=t0(wide);assert.equal(t.status,'not_interpreted');assert.match(t.reason!,/limits/);
});
test('provisional lessons (inactive by default): prose labels state no conditions; structured names must be name-shaped',()=>{
 const prose='Score summary: out of 102 products tested, 20 reached 50 W or more at the top speed in our long test';
 const html=page(`<h2>Results</h2><p>We measured power at every speed.</p><table><tr><th>Item</th><th>Breeze AP10</th></tr><tr><td>${prose}</td><td>45 W</td></tr></table>`);
 const withL=(extra:InterpreterLessonId1G[])=>t0(html,[...activeInterpreterLessons1G(),...extra]);
 assert.ok(withL([]).observations.some(o=>o.conditions.length>0),'by default the prose label adds conditions');
 assert.ok(withL(['GL9_prose_labels_state_no_conditions']).observations.every(o=>o.conditions.length===0));
 const ld='<script type="application/ld+json">{"@type":"Product","name":"The Breeze AP10 is one of the quietest purifiers we have tried this year."}</script>';
 const kv=page(`<h2>Test data</h2><table><tr><th>Noise (low)</th><td>40 dBA</td></tr><tr><th>Power (high)</th><td>45 W</td></tr></table>`,ld);
 assert.equal(interpretDocumentTables1G(kv).tables[0].observations[0].productSource,'document');
 assert.equal(interpretDocumentTables1G(kv,{lessons:[...activeInterpreterLessons1G(),'GL10_structured_names_are_name_shaped']}).tables[0].observations[0].product,null);
 assert.equal(activeInterpreterLessons1G().includes('GL9_prose_labels_state_no_conditions'),false);
});
