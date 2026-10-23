import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireTables1F,ACQUISITION1F_VERSION,ACQUISITION1F_RENDERED_VERSION} from '../src/table_acquisition1f.js';
import {interpretDocumentTables1G,INTERPRETER1G_VERSION,INTERPRETER1G_RENDERED_VERSION} from '../src/table_interpreter1g.js';

const BR=`<html><body><h2>Specs</h2><table><tr><th>Spec</th><th>Alpha A1</th></tr>
<tr><td>Clean air delivery rate</td><td>Dust: 134 CFM<br>Smoke: 126 CFM<br/>Pollen: 154 CFM</td></tr>
<tr><td>Noise level</td><td><p>Speed 1: 38.3 dB</p><p>Speed 2: 41.9 dB</p></td></tr>
<tr><td>Notes</td><td>a<span hidden>secret</span> b <img alt="x"> c<span aria-hidden="true">★</span></td></tr></table></body></html>`;

test('v1f.1 stays byte-identical by default; v1f.2 adds only renderedText', ()=>{
 const d=acquireTables1F(BR),r=acquireTables1F(BR,{rendered:true});
 assert.equal(d.contract.version,ACQUISITION1F_VERSION);assert.equal(r.contract.version,ACQUISITION1F_RENDERED_VERSION);
 const strip=(x:typeof r)=>JSON.stringify(x.tables.map(t=>({...t,caption:t.caption?{...t.caption,renderedText:undefined}:null,cells:t.cells.map(c=>({...c,renderedText:undefined}))})));
 assert.equal(strip(r),strip(d),'every v1f.1 field is unchanged');
 assert.ok(d.tables[0].cells.every(c=>!('renderedText' in c)));
 const cell=(i:number)=>r.tables[0].cells[i];
 assert.equal(cell(3).decodedText.includes('CFMSmoke'),true,'decodedText keeps textContent semantics');
 assert.equal(cell(3).renderedText,'Dust: 134 CFM\nSmoke: 126 CFM\nPollen: 154 CFM');
 assert.equal(cell(5).renderedText,'Speed 1: 38.3 dB\nSpeed 2: 41.9 dB');
 assert.equal(cell(7).renderedText,'a b  c★','hidden excluded, aria-hidden kept, an image keeps both spaces (Chromium innerText)');
});

test('1G v1g.2 reads the rendered text: in-cell labels separate, units stay with their values; v1g.1 unchanged', ()=>{
 const v1=interpretDocumentTables1G(BR),v2=interpretDocumentTables1G(BR,{text:'rendered'});
 assert.equal(v1.version,INTERPRETER1G_VERSION);assert.equal(v2.version,INTERPRETER1G_RENDERED_VERSION);assert.notEqual(v1.readingIdentity,v2.readingIdentity);
 const o1=v1.tables[0].observations,o2=v2.tables[0].observations;
 assert.ok(o1.some(o=>o.property.some(p=>/CFMSmoke|CFMPollen/.test(p))),'the defect: labels merge across <br>');
 assert.deepEqual(o2.filter(o=>o.unit==='cfm').map(o=>[o.value,o.property.at(-1)]),[[134,'Dust'],[126,'Smoke'],[154,'Pollen']]);
 assert.equal(o2.filter(o=>o.unit==='db').length,2);
});
