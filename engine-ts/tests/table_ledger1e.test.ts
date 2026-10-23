import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readDocumentSemantics1D2,structuredTableLeads1D2} from '../src/document_semantics.js';
import {textBlocks225} from '../src/phase225_transient_test_probe.js';
import {TEST_CONTEXT272,type ExtractionPlan272} from '../src/phase272_extraction_plan.js';
import {tableLedger1E,publicLedger1E,summariseLedgers1E,headerUnits1E} from '../src/table_ledger1e.js';

// Table understanding, Stage B: the decision ledger. FICTIONAL page and brands (host pee1e-test.test), written for this test.
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const URL0='https://lab.pee1e-test.test/c/breeze-vs-airly';
const plan=():ExtractionPlan272=>{const p={schema:'pee272.extraction-plan.v1' as const,categoryId:'air_purifiers',isEvidence:false as const,categoryNouns:['purifier'],
 identity:{requireNamedSubject:true as const,modelCodeBindsResult:true as const},outcomes:[],
 measurements:[{id:'noise',outcomes:[],proxyFor:[],dimensions:['sound'],units:['db'],terms:['noise'],conditions:[]},{id:'power',outcomes:[],proxyFor:[],dimensions:['power'],units:['w'],terms:['power'],conditions:[]}],
 units:['db','w'],proxies:[],sectionCues:[],decisionEvidence:[]};return {...p,compiledFrom:{items:2,relations:0,digest:sha(JSON.stringify(p))}};};
const page=(noiseHead:string,extra='')=>`<html><head><title>Breeze AP10 vs Airly AP20</title></head><body><article><h1>Breeze AP10 vs Airly AP20</h1>
<h2>${noiseHead}</h2><p>Both purifiers have four speeds.</p><p>We measured noise levels at all speeds using a sound meter.</p><p>At the lowest speed the Breeze AP10 is quieter.</p>
<table><thead><tr><th>Fan Speed</th><th>Breeze AP10 (dBA)</th><th>Airly AP20 (dBA)</th></tr></thead><tbody>
<tr><td>Sleep Mode</td><td>40.2 dBA</td><td>-</td></tr><tr><td>Speed 1 (Low)</td><td>48.2 dBA</td><td>48.2 dBA</td></tr>
<tr><td>Speed 2 (Medium)</td><td>54.3 dBA</td><td>50.4 dBA</td></tr><tr><td>Speed 3 (High)</td><td>66.5 dBA</td><td>54.3 dBA</td></tr></tbody></table>
<h2>Operating costs</h2><p>Power use at every speed.</p>
<table><thead><tr><th>Fan Speed</th><th>Breeze AP10 (W + $/month)</th><th>Airly AP20 (W + $/month)</th></tr></thead><tbody>
<tr><td>Standby</td><td>0.3W ($0.03)</td><td>0W ($0)</td></tr><tr><td>Speed 2 (Medium)</td><td>31.3W ($2.74)</td><td></td></tr></tbody></table>${extra}</article></body></html>`;
const run=(html:string)=>{const sem=readDocumentSemantics1D2(html,URL0);const blocks=textBlocks225(html,{maxBlocks:1500}).blocks;const drt=blocks.some(b=>TEST_CONTEXT272.test(b));
 const reader=structuredTableLeads1D2(sem,plan(),{sourceUrl:URL0,blocks,documentReportsTesting:drt});
 const ledger=tableLedger1E(sem,plan(),{sourceUrl:URL0,blocks,documentReportsTesting:drt,html});return {sem,reader,ledger};};
const els=(l:ReturnType<typeof tableLedger1E>)=>l.tables.flatMap(t=>t.cells.flatMap(c=>c.elements.map(e=>({...e,cell:c}))));

test('the ledger never changes the reader: its accepted elements are exactly the reader leads, in order',()=>{
 const readable='<h2>Noise test results</h2><table><thead><tr><th>Model</th><th>Noise (dB)</th></tr></thead><tbody><tr><td>Breeze AP10</td><td>41 dB</td></tr><tr><td>Airly AP20</td><td>44 dB</td></tr></tbody></table>';
 for(const html of [page('Noise Level Test – Comparison'),page('Noise test results'),page('Noise Level Test – Comparison',readable)]){const {reader,ledger}=run(html);
  assert.deepEqual(ledger.leads.map(l=>[l.id,l.blockIndex,l.valueOffset,l.value,l.unit]),reader.map(r=>[r.id,r.blockIndex,r.valueOffset,r.value,r.unit]));}
 // Non-vacuous: a test table whose own labels name the dimension is read, and the ledger marks exactly those elements.
 assert.equal(run(page('Noise Level Test – Comparison',readable)).ledger.leads.length,2);
 // Even under a test heading, the per-speed table is not read: its dimension word is only in the heading (R14).
 assert.equal(run(page('Noise test results')).ledger.leads.length,0);
});
test('every source cell is accounted for, and every element has exactly one primary state',()=>{
 const {sem,ledger}=run(page('Noise Level Test – Comparison'));
 for(const t of ledger.tables){const st=sem.tables[t.table];assert.equal(t.cells.length,st.cells.length);
  for(const c of t.cells){assert.ok(c.elements.length>=1,'a cell yields at least one element');assert.ok(c.sourceRow!==null&&c.sourceCell!==null,'source coordinates');}}
 for(const e of els(ledger)){assert.ok(e.state,'state');if(e.state==='rejected')assert.ok(e.blockers.length>0,'a rejection names its blockers');}
});
test('several independent blockers are all recorded, each with its stage',()=>{
 const {ledger}=run(page('Noise Level Test – Comparison'));
 const v=els(ledger).find(e=>e.surface==='54.3 dBA'&&e.cell.col===1)!;
 const rules=v.blockers.map(b=>b.rule);
 assert.ok(rules.includes('R08_unknown_context_no_test_label'),'context');
 assert.ok(rules.includes('R14_no_dimension_term'),'dimension word only in the heading, not in the labels');
 assert.equal(v.earliestStage,'context');assert.ok(v.blockers.every(b=>b.stage));
});
test('a compound cell yields separate elements; dash, empty, explicit zero stay distinct',()=>{
 const {ledger}=run(page('Noise Level Test – Comparison'));const all=els(ledger);
 const comp=all.filter(e=>e.cell.text.startsWith('31.3W'));assert.deepEqual(comp.map(e=>e.kind),['number_with_unit','currency']);
 assert.ok(comp[0].blockers.some(b=>b.rule==='R11_price_in_cell'),'the frozen reader drops the whole cell for its price');
 assert.equal(all.find(e=>e.kind==='dash')?.state,'dash_unexplained');
 assert.ok(all.some(e=>e.kind==='empty'&&e.state==='empty'));
 const zero=all.find(e=>e.cell.text.startsWith('0W'));assert.equal(zero?.value,0);assert.equal(zero?.kind,'number_with_unit');
 // The repeated value 54.3 stays two elements in two cells.
 assert.equal(all.filter(e=>e.value===54.3).length,2);
});
test('unused evidence is noted, not used: section method statement, heading dimension, header units, setting labels',()=>{
 const {ledger}=run(page('Noise Level Test – Comparison'));const t=ledger.tables[0];
 assert.ok(t.notes.sectionMethodStatements.some(s=>s.distance>1&&s.dimensions.includes('sound')));
 assert.ok(t.notes.headingDimensions.includes('sound'));
 assert.ok(t.notes.headerUnits.length>=2);assert.equal(t.notes.settingLabels.firstColumn,t.notes.settingLabels.firstColumnOf);
 assert.deepEqual(headerUnits1E('Breeze AP10 (W + $/month)'),['W','$/month']);assert.deepEqual(headerUnits1E('Speed 2 (Medium)'),[]);
});
test('the public form carries no text, value or label',()=>{
 const {ledger}=run(page('Noise Level Test – Comparison'));const pub=JSON.stringify(publicLedger1E(ledger))+JSON.stringify(summariseLedgers1E([ledger]));
 for(const s of ['54.3','Breeze','Speed 2','dBA','31.3'])assert.ok(!pub.includes(s),s);
});
test('no plan: nothing is read and every cell is still accounted for',()=>{
 const html=page('Noise test results');const sem=readDocumentSemantics1D2(html,URL0);const blocks=textBlocks225(html,{maxBlocks:1500}).blocks;
 const l=tableLedger1E(sem,null,{sourceUrl:URL0,blocks,documentReportsTesting:true,html});assert.equal(l.leads.length,0);
 assert.ok(els(l).filter(e=>e.state==='rejected').every(e=>e.blockers.some(b=>b.rule==='P0_no_plan')));
});
