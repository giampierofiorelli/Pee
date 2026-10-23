import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readDocumentSemantics1D2,structuredTableLeads1D2} from '../src/document_semantics.js';
import {textBlocks225} from '../src/phase225_transient_test_probe.js';
import {TEST_CONTEXT272,type ExtractionPlan272} from '../src/phase272_extraction_plan.js';
import {tableLedger1E,cellProducts1E,type TableLessonId1E} from '../src/table_ledger1e.js';
import {TABLE_LESSONS1E,tableLessonsDigest1E,activeTableLessons1E} from '../src/table_lessons1e.js';
import {readingConfiguration265,readingIdentity265,testLeadsFromHtml265} from '../src/phase265_test_measurements.js';

// Table understanding, Stage D: formal properties of the table lessons. FICTIONAL pages and brands (pee1e-test.test).
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const URL0='https://lab.pee1e-test.test/c/breeze-vs-airly';
const PLAN=(():ExtractionPlan272=>{const p={schema:'pee272.extraction-plan.v1' as const,categoryId:'air_purifiers',isEvidence:false as const,categoryNouns:['purifier'],
 identity:{requireNamedSubject:true as const,modelCodeBindsResult:true as const},outcomes:[],
 measurements:[{id:'noise',outcomes:[],proxyFor:[],dimensions:['sound'],units:['db'],terms:['noise'],conditions:[]},{id:'power',outcomes:[],proxyFor:[],dimensions:['power'],units:['w'],terms:['power'],conditions:[]}],
 units:['db','w'],proxies:[],sectionCues:[],decisionEvidence:[]};return {...p,compiledFrom:{items:2,relations:0,digest:sha(JSON.stringify(p))}};})();
const ALL:TableLessonId1E[]=TABLE_LESSONS1E.filter(l=>l.appliedIn==='shadow_table_reader').map(l=>l.id);
const NAMES=['Breeze AP10','Airly AP20','Breeze AP11'];const judge=(n:string)=>NAMES.includes(n.trim())?n.trim():null;
type Row=[string,string,string];// [setting, value of product 1, value of product 2]
const ROWS:Row[]=[['Sleep Mode','40.2','-'],['Speed 1 (Low)','48.2','48.2'],['Speed 2 (Medium)','54.3','50.4'],['Speed 3 (High)','66.5','54.3']];
const method='<p>We measured noise levels at all speeds using a sound meter.</p>';
/** A noise table: products in columns (default) or transposed (products in rows, settings in the header row), with th scope. */
function noisePage(o:{products?:[string,string];transpose?:boolean;method?:string;head?:string;extra?:string;unitInCells?:boolean}={}){
 const [p1,p2]=o.products??['Breeze AP10','Airly AP20'];const v=(x:string)=>x==='-'?'-':o.unitInCells?'Noise: '+x+' dBA':x;
 const table=o.transpose
  ?`<table><thead><tr><th>Model</th>${ROWS.map(r=>`<th scope="col">${r[0]}</th>`).join('')}</tr></thead><tbody>`+
    `<tr><th scope="row">${p1} (dBA)</th>${ROWS.map(r=>`<td>${v(r[1])}</td>`).join('')}</tr><tr><th scope="row">${p2} (dBA)</th>${ROWS.map(r=>`<td>${v(r[2])}</td>`).join('')}</tr></tbody></table>`
  :`<table><thead><tr><th>Fan Speed</th><th>${p1} (dBA)</th><th>${p2} (dBA)</th></tr></thead><tbody>${ROWS.map(r=>`<tr><td>${r[0]}</td><td>${v(r[1])}</td><td>${v(r[2])}</td></tr>`).join('')}</tbody></table>`;
 return `<html><head><title>Breeze vs Airly</title></head><body><article><h1>Breeze AP10 vs Airly AP20</h1><h2>${o.head??'Noise Level Test – Comparison'}</h2>
<p>Both purifiers have four speeds.</p>${o.method??method}<p>At the lowest speed the first one is quieter.</p>${table}${o.extra??''}</article></body></html>`;}
function read(html:string,lessons:TableLessonId1E[]=ALL){const sem=readDocumentSemantics1D2(html,URL0);const blocks=textBlocks225(html,{maxBlocks:1500}).blocks;
 const l=tableLedger1E(sem,PLAN,{sourceUrl:URL0,blocks,documentReportsTesting:blocks.some(b=>TEST_CONTEXT272.test(b)),html,lessons});
 const prod=cellProducts1E(sem,judge,lessons);
 const obs=l.leads.map(x=>`${prod.get(x.blockIndex)?.product??'?'} | ${x.condition??'?'} | ${x.value} ${x.unit}`).sort();
 return {l,obs,sem,blocks};}

test('non-vacuity: with the lessons the per-speed noise table is read, every value with its product and its condition',()=>{
 const {obs}=read(noisePage());
 assert.deepEqual(obs,['Airly AP20 | speed 1 (low) | 48.2 db','Airly AP20 | speed 2 (medium) | 50.4 db','Airly AP20 | speed 3 (high) | 54.3 db',
  'Breeze AP10 | sleep mode | 40.2 db','Breeze AP10 | speed 1 (low) | 48.2 db','Breeze AP10 | speed 2 (medium) | 54.3 db','Breeze AP10 | speed 3 (high) | 66.5 db']);
 // Without the lessons the frozen reader reads none of it.
 assert.equal(read(noisePage(),[]).l.leads.length,0);
});
test('equivariance: permuting the product columns, or transposing with correct header semantics, keeps the observations',()=>{
 const base=read(noisePage()).obs;
 assert.deepEqual(read(noisePage({products:['Airly AP20','Breeze AP10']})).obs.map(o=>o).length,base.length);
 // swapped columns: values follow the column header, so the observation set is the same once names are swapped back
 const swapped=read(noisePage({products:['Airly AP20','Breeze AP10']})).obs.map(o=>o.replace('Airly AP20','X').replace('Breeze AP10','Airly AP20').replace('X','Breeze AP10')).sort();
 assert.deepEqual(swapped,base);
 assert.deepEqual(read(noisePage({transpose:true})).obs,base);
 // renaming a column header changes the attribution accordingly
 assert.ok(read(noisePage({products:['Breeze AP11','Airly AP20']})).obs.every(o=>!o.startsWith('Breeze AP10')));
});
test('evidence sensitivity: without the method statement, or with a statement about another quantity, nothing is read',()=>{
 assert.equal(read(noisePage({method:''})).l.leads.length,0);
 assert.equal(read(noisePage({method:'<p>We measured power use at every speed with a plug-in meter.</p>'})).l.leads.length,0);
 // a statement in ANOTHER section does not count
 const other=noisePage({method:''}).replace('<h1>Breeze AP10 vs Airly AP20</h1>','<h1>Breeze AP10 vs Airly AP20</h1><h2>How we test</h2>'+method);
 assert.equal(read(other).l.leads.length,0);
});
test('evidence sensitivity: a specification table in the same section does not inherit test status',()=>{
 const spec='<table><tbody><tr><td>Manufacturer</td><td>Breeze</td></tr><tr><td>Model</td><td>AP10</td></tr><tr><td>Weight</td><td>5 kg</td></tr><tr><td>Rated noise</td><td>24 dB</td></tr><tr><td>Power</td><td>45 W</td></tr></tbody></table>';
 const {l}=read(noisePage({extra:spec}));const specT=l.tables[1];
 assert.equal(specT.cells.flatMap(c=>c.elements).filter(e=>e.state==='table_lead').length,0);
});
test('identity safety: setting labels never become products, even when the judge would accept them',()=>{
 const html=noisePage();const sem=readDocumentSemantics1D2(html,URL0);
 const greedy=(n:string)=>n.trim()||null;// a judge that accepts any text
 const p=cellProducts1E(sem,greedy,ALL);for(const v of p.values())assert.ok(!/speed|sleep|mode/i.test(v.product??''),String(v.product));
});
test('scientific fidelity: a cost element is never a measurement; the quantity beside it is judged on its own',()=>{
 const power=`<h2>Power test</h2><p>We measured power use at every speed with a plug-in meter.</p><table><thead><tr><th>Fan Speed</th><th>Breeze AP10 (W + $/month)</th><th>Airly AP20 (W + $/month)</th></tr></thead>
<tbody><tr><td>Speed 1 (Low)</td><td>31.3W ($2.74)</td><td>20W ($1.75)</td></tr><tr><td>Standby</td><td>0W ($0)</td><td>-</td></tr></tbody></table>`;
 const {l,obs}=read(noisePage({extra:power}));
 const els=l.tables[1].cells.flatMap(c=>c.elements);
 assert.ok(els.filter(e=>e.kind==='currency').every(e=>e.state!=='table_lead'&&e.blockers.some(b=>b.rule==='R11_price_in_cell')));
 assert.ok(obs.includes('Breeze AP10 | speed 1 (low) | 31.3 w'));assert.ok(obs.includes('Breeze AP10 | standby | 0 w'),'an explicit zero is a value');
 // the frozen reader drops the whole cell
 assert.equal(read(noisePage({extra:power}),[]).l.tables[1].cells.flatMap(c=>c.elements).filter(e=>e.state==='table_lead').length,0);
});
test('partiality: a dash is never a value and never zero',()=>{
 const {l}=read(noisePage());const dashes=l.tables[0].cells.flatMap(c=>c.elements).filter(e=>e.kind==='dash');
 assert.equal(dashes.length,1);assert.equal(dashes[0].state,'dash_unexplained');assert.equal(dashes[0].value,null);
});
test('reproducibility and versioning: same input, same lessons, same output; the lesson set is part of the reading identity',()=>{
 assert.deepEqual(read(noisePage()).l,read(noisePage()).l);
 const id=(t?:TableLessonId1E[])=>readingIdentity265(readingConfiguration265({plan:PLAN,semantics:{},tableLessons:t})!);
 assert.equal(id(),id([]),'no lessons: the Step 1D-A2 identity is unchanged');
 assert.notEqual(id(ALL),id());assert.notEqual(id(ALL),id(['TL1_section_method_scope']));
 assert.equal(tableLessonsDigest1E(['TL2_header_units','TL1_section_method_scope']),tableLessonsDigest1E(['TL1_section_method_scope','TL2_header_units']));
 assert.throws(()=>tableLessonsDigest1E(['nope' as TableLessonId1E]));
 for(const l of TABLE_LESSONS1E){assert.ok(l.counterexamples.length&&l.applicability.length,l.id);if(l.appliedIn==='shadow_table_reader')assert.ok(l.tests.length,l.id+' has tests');}
 assert.deepEqual(activeTableLessons1E(['promoted','provisional','rejected']).sort(),[...ALL].sort());
});
test('no regression: with no lesson the ledger is the frozen reader',()=>{
 for(const html of [noisePage(),noisePage({transpose:true}),noisePage({head:'Noise test results'})]){const {sem,blocks}=read(html,[]);
  const reader=structuredTableLeads1D2(sem,PLAN,{sourceUrl:URL0,blocks,documentReportsTesting:blocks.some(b=>TEST_CONTEXT272.test(b))});
  assert.deepEqual(read(html,[]).l.leads.map(x=>x.id),reader.map(r=>r.id));}
});
test('TL5 v2: the setting condition reaches every lead of the cell, also one the prose reader made first; each attachment is recorded',()=>{
 // a unit in each cell lets the prose reader read the cells itself, before the table reader
 const html=noisePage({unitInCells:true});const sem=readDocumentSemantics1D2(html,URL0);
 const run=(t?:TableLessonId1E[])=>testLeadsFromHtml265(html,URL0,sha(html),null,{plan:PLAN,semantics:sem,...(t?{tableLessons:t}:{})});
 const withL=run(ALL),noTL5=run(ALL.filter(x=>x!=='TL5_setting_axis_conditions'));
 const cellLeads=(r:ReturnType<typeof run>)=>r.probe.candidates.filter(c=>sem.blocks[c.blockIndex]?.cell);
 assert.ok(cellLeads(withL).length>=7);
 assert.ok(cellLeads(withL).every(c=>c.condition),'every cell lead carries its setting');
 assert.ok(cellLeads(noTL5).some(c=>!c.condition),'without TL5 a cell lead lacks its setting');
 const att=withL.shadowDiagnostics?.tl5ConditionsAttached??[];assert.ok(att.length>0,'the prose reader read some cells first');
 assert.equal(att.length,cellLeads(withL).filter(c=>c.methodCue!=='structured_table_measurement_term').length);
 // the default reading (no lessons) is untouched
 assert.equal(run().shadowDiagnostics,undefined);
});
