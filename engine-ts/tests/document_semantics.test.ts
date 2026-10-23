import test from 'node:test';import assert from 'node:assert/strict';
import {readDocumentSemantics1D2,cellProducts1D2,structuredTableLeads1D2} from '../src/document_semantics.js';
import {textBlocks225} from '../src/phase225_transient_test_probe.js';
import {buildInventory1D} from '../src/experience_entity_inventory.js';
import type {ExtractionPlan272} from '../src/phase272_extraction_plan.js';

// Step 1D-A2: the semantic-document contract on FICTIONAL pages (brands Zentra, Korvo, Vexa; invented codes and values).
const URL0='https://www.labpub.test/reviews/zentra-z10';
const page=(body:string,head='')=>`<!doctype html><html><head><title>Lab</title>${head}</head><body>${body}</body></html>`;
const ld=(o:object)=>`<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const plan:ExtractionPlan272={schema:'pee272.extraction-plan.v1',categoryId:'televisions',isEvidence:false,compiledFrom:{items:1,relations:1,digest:'t'},
 categoryNouns:['tv'],identity:{requireNamedSubject:true,modelCodeBindsResult:true},outcomes:[],
 measurements:[{id:'m1',outcomes:[],proxyFor:[],dimensions:['luminance'],units:['nits'],terms:['brightness'],conditions:[]},
  {id:'m2',outcomes:[],proxyFor:[],dimensions:['latency'],units:['ms'],terms:['lag'],conditions:[]}],
 units:['nits','ms'],proxies:[],sectionCues:[],decisionEvidence:[]};
const compare=`<h1>Zentra Z10 vs Korvo K20: our tests</h1><p>We tested both TVs in our lab for a week.</p>
 <h2>Test results</h2><table><tr><th>Row 0 - Cell 0</th><th>Zentra Z10</th><th>Korvo K20</th></tr>
 <tr><td>HDR Brightness (10%, in nits)</td><td>812</td><td>640</td></tr><tr><td>Input lag (in milliseconds)</td><td>9.4</td><td>12.1</td></tr></table>
 <p>The Zentra Z10 is brighter than the Korvo K20.</p>`;
const read=(html:string)=>{const sem=readDocumentSemantics1D2(html,URL0);const blocks=textBlocks225(html,{maxBlocks:1500}).blocks;
 const tags=textBlocks225(html,{withTags:true,maxBlocks:1500});const keep=tags.blocks.map((b,i)=>[b,tags.tags![i]]).filter(([,t])=>t!=='th');
 const inv=buildInventory1D({blocks,tags:keep.map(k=>k[1]),title:sem.principal.name,categoryNouns:['tv'],publisherHost:'www.labpub.test',
  structured:{names:sem.names,excludedBlocks:new Set(sem.blocks.map((b,i)=>b.hardExcluded?i:-1).filter(i=>i>=0))}});
 // The evaluation's resolver: a header names a product when it is an observed surface linked to a product entity.
 const resolveName=(t:string)=>{const k=t.trim().toLowerCase();const m=inv.mentions.find(m=>m.entityId&&(m.state==='explicit_identity'||m.state==='contextual_alias')&&m.surface.toLowerCase()===k);
  const e=m?inv.entities.find(e=>e.id===m.entityId):inv.entities.find(e=>e.type==='product'&&e.canonical.toLowerCase()===k);return e&&e.type==='product'?e.canonical:null;};
 const cells=cellProducts1D2(sem,resolveName);
 const leads=structuredTableLeads1D2(sem,plan,{sourceUrl:URL0,blocks,documentReportsTesting:true,subjectOf:bi=>{const c=cells.get(bi);return c?.product?{name:c.product,model:null,sku:null}:null;}});
 return {sem,blocks,inv,cells,leads,bound:Object.fromEntries(leads.map(l=>[l.value+' '+l.unit,l.subject?.name??null]))};};

test('a multi-product test table: each value goes to its own column product, units from the row label, never the page product',()=>{
 const r=read(page(compare));
 assert.deepEqual(r.bound,{'812 nits':'Zentra Z10','640 nits':'Korvo K20','9.4 ms':'Zentra Z10','12.1 ms':'Korvo K20'});
 assert.ok(r.leads.every(l=>l.methodCue==='structured_table_measurement_term'&&l.rankingAuthorized===false&&l.scientificEvidenceAdmitted===false));
 assert.equal(r.sem.principal.name,null,'a comparison page has no principal product');
});
test('markup-only changes (wrappers, attributes, entities) leave the reading unchanged',()=>{
 const wrapped=page(`<div class="x"><main><article data-v="2">${compare.replace('<table>','<figure class="tbl"><table class="t" id="t1">').replace('</table>','</table></figure>')
  .replace(/<td>(\d)/g,'<td><span>$1').replace(/(\d)<\/td>/g,'$1</span></td>').replace('both TVs','both&nbsp;TVs')}</article></main></div>`);
 assert.deepEqual(read(wrapped).bound,read(page(compare)).bound);
});
test('inserted navigation with product links adds no product and changes no binding',()=>{
 const nav=`<nav><ul><li><a href="/vexa-v9">Vexa V9 deals</a></li><li><a href="/korvo-k30">Korvo K30 review</a></li></ul></nav>`;
 const a=read(page(compare)),b=read(page(nav+compare));
 assert.deepEqual(b.bound,a.bound);assert.ok(!b.inv.entities.some(e=>e.type==='product'&&/V9|K30/.test(e.canonical)));
 assert.ok(b.sem.blocks.some(x=>x.hardExcluded),'navigation blocks are marked boilerplate');
});
test('a specification table and a certification label are not read as test results; a bare number without a label unit is not read',()=>{
 const spec=`<h1>Zentra Z10 review</h1><p>We tested it for a month.</p><h2>Full Specs</h2><table><tr><th></th><th>Zentra Z10</th></tr><tr><td>Peak brightness (nits)</td><td>1000</td></tr></table>
  <h2>Test data</h2><table><tr><th></th><th>Zentra Z10</th></tr><tr><td>Rated brightness (nits)</td><td>1200</td></tr><tr><td>ISO brightness (nits)</td><td>1100</td></tr>
  <tr><td>HDR brightness</td><td>900</td></tr><tr><td>Peak brightness (nits) 10%</td><td>850</td></tr></table>`;
 const r=read(page(spec,ld({'@type':'Product',name:'Zentra Z10',review:{'@type':'Review'}})));
 assert.deepEqual(Object.keys(r.bound),['850 nits']);assert.equal(r.bound['850 nits'],'Zentra Z10','value column headed by the product');
 assert.equal(r.sem.pageType.kind,'single_product_review');assert.equal(r.sem.principal.name,'Zentra Z10');
});
test('title contradiction is recorded, not resolved; a headline in a structured name is not a product',()=>{
 const r=read(page('<h1>Korvo K20 review: bright and cheap</h1><p>We tested it.</p>',ld({'@type':'Product',name:'Zentra Z10',review:{'@type':'Review'}})));
 assert.ok(r.sem.principal.conflicts.includes('structured_name_not_in_headline'));
 const h=read(page('<h1>Korvo K20</h1>',ld({'@type':'Product',name:'The Korvo K20 is the best TV I have tested',review:{'@type':'Review'}})));
 assert.equal(h.sem.principal.name,null);assert.ok(h.sem.principal.conflicts.includes('structured_name_is_headline'));
});
test('an ItemList of pros and cons is not a roundup; an ItemList of products is, and has no principal product',()=>{
 const pros=ld({'@type':'Product',name:'Zentra Z10',review:{'@type':'Review',positiveNotes:{'@type':'ItemList',itemListElement:[{'@type':'ListItem',name:'Bright'},{'@type':'ListItem',name:'Cheap'},{'@type':'ListItem',name:'Quiet'}]}}});
 assert.equal(read(page('<h1>Zentra Z10 review</h1>',pros)).sem.pageType.kind,'single_product_review');
 const list=ld({'@type':'ItemList',itemListElement:['Zentra Z10','Korvo K20','Vexa V9'].map((n,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Product',name:n}}))});
 const r=read(page('<h1>Three TVs</h1>',list));assert.equal(r.sem.pageType.kind,'roundup');assert.equal(r.sem.principal.name,null);
});
test('changed heading nesting keeps each table under its own heading context',()=>{
 const deeper=compare.replace('<h2>Test results</h2>','<h2>Picture</h2><h4>Test results</h4>');
 assert.deepEqual(read(page(deeper)).bound,read(page(compare)).bound);
});
test('a linked competitor is a lead, never the principal or a product by the link alone',()=>{
 const r=read(page('<h1>Zentra Z10 review</h1><p>We tested it. See also our <a href="/korvo-k30">Korvo K30</a> page.</p>',ld({'@type':'Product',name:'Zentra Z10',review:{'@type':'Review'}})));
 assert.ok(r.sem.names.some(n=>n.source==='linked_name'&&n.name==='Korvo K30'&&n.href==='https://www.labpub.test/korvo-k30'));
 assert.equal(r.sem.principal.name,'Zentra Z10');assert.ok(!r.inv.entities.some(e=>e.type==='product'&&e.canonical==='Korvo K30'),'one link is not product evidence');
});
test('product variants in table headers stay separate; a family-or-variant name is not stretched to a third row',()=>{
 const html=page(`<h1>Zentra TVs</h1><p>We tested them.</p><h2>Test results</h2><table><tr><th>Model</th><th>Brightness (nits)</th></tr>
  <tr><th>Zentra K10</th><td>500</td></tr><tr><th>Zentra K10 Pro</th><td>700</td></tr><tr><th>Zentra K10 TV</th><td>510</td></tr></table><p>The Zentra K10 is dim; the Zentra K10 Pro is not.</p>`);
 const r=read(html);const prods=r.inv.entities.filter(e=>e.type==='product').map(e=>e.canonical).sort();
 assert.deepEqual(prods,['Zentra K10','Zentra K10 Pro']);
 // "Zentra K10" may name the family when "Zentra K10 Pro" exists, so the descriptor-extended row stays unresolved.
 assert.deepEqual(r.bound,{'500 nits':'Zentra K10','700 nits':'Zentra K10 Pro','510 nits':null});
});
test('a descriptor-only extension of the one document name ("Zentra K10 TV") is that product; a size word is not a descriptor',()=>{
 const html=page(`<h1>Zentra K10 review</h1><p>We tested the Zentra K10 for a week.</p><h2>Test results</h2><table><tr><th>Model</th><th>Brightness (nits)</th></tr>
  <tr><th>Zentra K10 TV</th><td>510</td></tr><tr><th>Korvo K20</th><td>620</td></tr></table><p>The Korvo K20 was brighter.</p>`);
 assert.equal(read(html).bound['510 nits'],'Zentra K10');
 const xl=read(html.replace('Zentra K10 TV','Zentra K10 XL'));
 assert.equal(xl.bound['510 nits'],'Zentra K10 XL','a size word names its own product');assert.ok(xl.inv.entities.some(e=>e.type==='product'&&e.canonical==='Zentra K10 XL'));
});
