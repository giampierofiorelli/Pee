import test from 'node:test';import assert from 'node:assert/strict';
import {loadQuantityKnowledge} from '../src/quantity_knowledge.js';
import {loadPropertyDefinitions} from '../src/property_definitions.js';
import {documentModel1G,tableRelations1G,rowSubject1G} from '../src/table_interpreter1g.js';
import {tableDerivationOf,tableMemberOf,rowSubjectOf,evidenceLinksOf,provenanceAndNature,roleFromLinks} from '../src/definition_interpreter.js';

// S94 Stage 1: whole-table relations. Every text is invented for this test.
const qk=loadQuantityKnowledge();void loadPropertyDefinitions(qk);
const html=`<html><head><script type="application/ld+json">{"@type":"Product","name":"Acme Book 14"}</script></head><body><h1>Acme Book 14 review</h1>
<h2>Storage</h2><p>The drive is fast enough for office work and loads large files without waiting.</p>
<table><tr><td>seq read</td></tr>
<tr><td>Zeta Pad 9</td><td>3000 MB/s +100%</td></tr><tr><td>Average of class Office (n=20)</td><td>2250 MB/s +50%</td></tr>
<tr><td>Orbit Note 3</td><td>1200 MB/s -20%</td></tr><tr><td>Acme Book 14</td><td>1500 MB/s</td></tr>
<tr><td>seq write</td></tr>
<tr><td>Zeta Pad 9</td><td>900 MB/s -10%</td></tr><tr><td>Acme Book 14</td><td>1000 MB/s</td></tr><tr><td>Orbit Note 3</td><td>1300 MB/s +30%</td></tr></table>
<h2>Specifications</h2><table><tr><td>Weight</td><td>1.4 kg</td></tr><tr><td>Battery</td><td>56 Wh</td></tr><tr><td>Speed 1</td><td>40 dB</td></tr></table>
<h2>Transparency</h2><p>We measured every laptop with the same standardised test procedures in our lab.</p></body></html>`;

test('S94 relative difference: one formula for the table, one reference per row group, verified by arithmetic',()=>{
 const r=tableRelations1G(html);const t=r.tables.find(x=>x.fit)!;
 assert.equal(t.fit!.formula,'p=100*(v-v0)/v0');assert.equal(t.fit!.groups,2);assert.deepEqual(t.referenceRows,['Acme Book 14']);
 const d=r.derivations.find(x=>x.cellText==='1200 MB/s -20%')!;assert.equal(d.kind,'relative_difference');assert.equal(d.reference!.text,'1500 MB/s');
 assert.deepEqual(d.inputs.map(i=>i.role),['own_value','reference_value']);assert.equal(d.row.subject,'other_product');assert.ok(d.residual!<=0.5);
 assert.ok(r.derivations.some(x=>x.kind==='statistic_over_set'&&x.cellText==='2250 MB/s +50%'),'a statistic row is calculated over a set');
});

test('S94 row subjects need the table to show a product axis; a specification table decides none',()=>{
 const r=tableRelations1G(html);
 assert.ok(r.rows.some(x=>x.text==='1500 MB/s'&&x.subject==='reviewed_product'));assert.ok(!r.rows.some(x=>x.text==='1.4 kg'),'the property rows of a spec table are not products');
 assert.equal(rowSubject1G('Average of class Office (n=20)','Acme Book 14'),'set');assert.equal(rowSubject1G('Acme Book 14 i5-1334U','Acme Book 14'),'reviewed_product');
});

test('S94 a derived cell links to its inputs and the document-wide method statement; it is calculated, never measured',()=>{
 const r=tableRelations1G(html);const rel={model:documentModel1G(html),tableRelations:r};
 assert.ok(tableDerivationOf(rel,'1200 MB/s -20%',-20));assert.equal(tableDerivationOf(rel,'1200 MB/s -20%',-21),null);
 const links=evidenceLinksOf(rel,'1200 MB/s -20%',10,'-20%',-20,'table_cell');const l=links.find(x=>x.relation==='table_derivation')!;
 assert.ok(l.statements!.some(s=>s.text==='1500 MB/s'),'the reference cell is an input');
 assert.ok(l.statements!.some(s=>s.block>=0&&/We measured every laptop/.test(rel.model.blocks[s.block].text)),'the collective method link');
 const role=roleFromLinks({measured:[],declared:[],quoted:false,condition:false},links);
 const ev=provenanceAndNature(role,{unit:'%',label:'1200 MB/s -20%',valueAt:10,surface:'-20%'},links,rel,{currency:false,periodUnit:false,qk});
 assert.equal(ev.nature,'calculated');assert.equal(ev.provenance,'publisher');assert.ok(ev.calculation!.assumptions.some(a=>a.text==='1500 MB/s'));
 const mb=tableMemberOf(rel,'1200 MB/s -20%',1200);assert.ok(mb&&mb.methods.length,'the base value is a member of the comparison');
 assert.equal(rowSubjectOf(rel,'1500 MB/s')!.subject,'reviewed_product');
});
