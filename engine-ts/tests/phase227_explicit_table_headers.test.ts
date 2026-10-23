/** Phase227: W3C H43 explicit header-link subset; every sample is fictional. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {probeTransientTestContent225} from '../src/phase225_transient_test_probe.js';
import {probeTransientTestTables226} from '../src/phase226_transient_test_tables.js';
const url='https://method-lab.example.org/review';
const products=[{name:'Imaginary Football Boot F22',model:'F22',sku:'F22'},
 {name:'Imaginary Football Boot G33',model:'G33',sku:'G33'}];
const intro='<p>We weighed the test samples using a calibrated digital scale.</p>';
const heads='<th id="h-model">Model</th><th id="h-mass">Measured mass (g)</th>';
const row=(model:string,number:string,ref:string=`r-${model} h-mass`,attrs='')=>
 `<tr><th id="r-${model}">${model}</th><td headers="${ref}" ${attrs}>${number}</td></tr>`;
const document=(r:string,h=heads,p=intro)=>`<html><body>${p}<table><caption>Our test measurements</caption><thead><tr>${h}</tr></thead><tbody>${r}</tbody></table></body></html>`;
const probe=(v:string, leads=products)=>probeTransientTestContent225(v,url,{productLeads:leads,
 documentSha256:createHash('sha256').update(v).digest('hex')});
test('explicit headers: two model rows and tested column correctly linked by references',()=>{
 const x=probe(document(row('F22','188')+row('G33','204')));
 assert.equal(x.tableResults226,2);assert.deepEqual(x.candidates.map(c=>c.value).sort((a,b)=>a-b),[188,204]);
 assert.deepEqual(new Set(x.candidates.map(c=>c.subject?.model)),new Set(['F22','G33']));
 assert.ok(x.candidates.every(c=>!c.rankingAuthorized&&!c.methodReviewed&&!c.scientificEvidenceAdmitted));
 assert.equal(x.sourceBodyRetained,false);assert.equal(x.sourcePassagesRetained,false);
});
test('header references can appear in either order and are still checked by identity',()=>{
 const x=probe(document(row('F22','188','h-mass r-F22')));
 assert.equal(x.tableResults226,1);
});
test('cross-row, wrong column, extra and duplicate references always abstain',()=>{
 const refs=['r-G33 h-mass','r-F22 h-model','r-F22 h-mass h-model',
   'r-F22 r-F22','h-mass','h-model h-mass','r-F22 h-Mass'];
 for(const ref of refs){const x=probe(document(row('F22','188',ref)));assert.equal(x.tableResults226,0,ref);}
});
test('duplicate ids, missing column ids and missing row ids block the entire table',()=>{
 const broken=[
  document(row('F22','188'),' <th id="h-model">Model</th><th id="h-model">Measured mass (g)</th>'),
  document(row('F22','188'),'<th id="h-model">Model</th><th>Measured mass (g)</th>'),
  document(row('F22','188').replace('id="r-F22"','')),
  document(row('F22','188')+row('F22','192')),
  document(row('F22','188').replace('id="r-F22"','id="h-mass"'))];
 for(const v of broken)assert.equal(probe(v).tableResults226,0);
});
test('id/headers does not override contradictory scope or accept spans',()=>{
 const bad=[
  document(row('F22','188'),heads.replace('id="h-mass"','id="h-mass" scope="row"')),
  document(row('F22','188').replace('id="r-F22"','id="r-F22" scope="col"')),
  document(row('F22','188').replace('headers=', 'colspan="2" headers='))];
 for(const v of bad)assert.equal(probe(v).tableResults226,0);
});
test('marketing column cannot become a measurement through explicit header links',()=>{
 const h='<th id="h-model">Model</th><th id="h-mass">Measured mass (g)</th><th id="h-ad">Manufacturer mass (g)</th>';
 const r='<tr><th id="r-F22">F22</th><td headers="r-F22 h-mass">188</td><td headers="r-F22 h-ad">180</td></tr>';
 const x=probe(document(r,h));assert.equal(x.tableResults226,1);assert.equal(x.candidates[0].value,188);
});
test('exact product model still required: a product group or similar model is not enough',()=>{
 assert.equal(probe(document(row('F220','188'))).tableResults226,0);
 assert.equal(probe(document(row('F22','188')),[]).tableResults226,0);
});
test('no explicit method near table means no scientific test lead',()=>{
 assert.equal(probe(document(row('F22','188'),heads,'<p>These values were published by a supplier.</p>')).tableResults226,0);
});
test('malformed explicit references do not fall back to positional scope associations',()=>{
 const r='<tr><th scope="row" id="r-F22">F22</th><td headers="r-F22 h-fake">188</td></tr>';
 const h='<th scope="col" id="h-model">Model</th><th scope="col" id="h-mass">Measured mass (g)</th>';
 assert.equal(probe(document(r,h)).tableResults226,0);
});
test('bounded observations have stable identities and no source quotations',()=>{
 const a=document(row('F22','188'));
 const x=probe(a),y=probe(a);
 assert.deepEqual(x,y);assert.equal(x.candidates.length,1);
 assert.ok(!JSON.stringify(x).includes('We weighed the test samples'));
 assert.ok(!JSON.stringify(x).includes('<table>'));
 const direct=probeTransientTestTables226(a,url,{productLeads:products});
 assert.equal(direct.candidates.length,1);assert.equal(direct.scientificEvidenceAdmitted,false);
});
