import test from 'node:test';
import assert from 'node:assert/strict';
import {documentClaimsToIR241,htmlToIR241,explicitHtmlRecords241,reviewedSourceRole241,
 proposeCategoryAttributes241,type Fact241,type ResolvedObservation241} from '../src/phase241_unified_product_facts.js';
import type {ParsedDocument228,DocClaim228} from '../src/phase228_document_observer.js';
const source=(model:string,tag:string,field:string,value:number,unit='kg'):DocClaim228=>({claimId:tag,
 label:field,value,unit,model:null,modelAssignment:'unresolved',locator:{page:4,line:8},
 sourceRole:'publisher_document_claim_unverified',testedPerformance:false,methodReviewed:false,
 exactVariantVerified:false,rankingAuthorized:false});
const doc=(claims:DocClaim228[],format:'pdf'|'docx'='pdf'):ParsedDocument228=>({schema:'pee228.document-claims.v1',format,
 documentSha256:'sha:'+claims.map(c=>c.claimId).join('/'),declaredModel:null,claimCount:claims.length,claims,reasonCodes:[],
 rawTextStored:false,rawDocumentStored:false,scientificEvidenceAdmitted:false,rankingAuthorized:false});
const scoped=(f:Fact241,productId:string,brandId:string,categoryId='air fryer',sourceId=productId):ResolvedObservation241=>({
 fact:{...f,provenance:{...f.provenance,sourceId}},productId,brandId,categoryId,
 identityResolution:'externally_verified',contextResolution:'reviewed_product_property'});
test('241: existing PDF claims enter common IR with page lineage and no scientific promotion',()=>{
 const x=doc([source('ArbitraryModel','a','Packed unit mass',12.5)]);
 const r=documentClaimsToIR241(x,'https://example.org/manual.pdf');
 assert.equal(r.facts.length,1);assert.equal(r.format,'pdf');assert.equal(r.facts[0].propertyKey,'packed unit mass');
 assert.deepEqual(r.facts[0].value,{type:'scalar',number:12.5,unit:'kg'});
 assert.equal(r.facts[0].provenance.locator,'page:4:line:8');
 assert.equal(r.facts[0].rankingAuthorized,false);assert.equal(r.identityVerified,false);
});
test('241: existing DOCX claim uses same semantic structure as PDF',()=>{
 const a=documentClaimsToIR241(doc([source('X','b','Unusual attribute',77,'mm')],'docx'),'docx-source');
 const b=documentClaimsToIR241(doc([source('X','b','Unusual attribute',77,'mm')]),'pdf-source');
 assert.deepEqual(a.facts[0].value,b.facts[0].value);
 assert.equal(a.facts[0].propertyKey,b.facts[0].propertyKey);
});
test('241: HTML dl and explicit row headers converge without needing known product attributes',()=>{
 const html='<dl><dt>Special Width</dt><dd>55 cm</dd></dl><table><tr><th scope="row">Unique pump throughput</th><td>2.5 l/min</td></tr></table>';
 const r=htmlToIR241(html,'https://example.org/product');
 assert.equal(r.facts.length,2);assert.equal(r.facts[0].propertyKey,'special width');
 assert.deepEqual(r.facts[1].value,{type:'scalar',number:2.5,unit:'l/min'});
 assert.ok(r.facts.every(x=>x.role==='unresolved'&&!x.rankingAuthorized));
});
test('241: HTML numeric range retains both endpoints, never makes one scalar',()=>{
 const r=htmlToIR241('<dl><dt>Outlet pressure</dt><dd>25–37 mbar</dd></dl>','source');
 assert.deepEqual(r.facts[0]?.value,{type:'range',min:25,max:37,unit:'mbar'});
});
test('241: ambiguous column tables do not make guessed model/field associations',()=>{
 const h='<table><tr><th scope="col">Model A</th><th scope="col">Model B</th></tr><tr><td>45 kg</td><td>60 kg</td></tr></table>';
 assert.deepEqual(explicitHtmlRecords241(h),[]);
 assert.equal(htmlToIR241(h,'s').facts.length,0);
});
test('241: merged cells and custom headers require future real DOM table-grid adapter',()=>{
 const h='<table><tr><th rowspan="2">Variant X</th><td>55 cm</td></tr></table>';
 assert.equal(htmlToIR241(h,'s').facts.length,0);
});
test('241: unlabelled numeric instructions and multi-numeric expressions stay unresolved',()=>{
 const h='<dl><dt>Safety distance</dt><dd>600 mm sides / 900 mm back</dd><dt>Customer Care</dt><dd>0800 100 200</dd></dl>';
 assert.equal(htmlToIR241(h,'s').facts.length,0);
});
test('241: visual slots remain separate, with no bogus factual attributes',()=>{
 const x=doc([], 'pdf');x.visualTableSlots=[{page:1,box:[1,1,4,4],kind:'unassigned_programme_duration',
 durationSeconds:{lower:120,upper:120},association:'unresolved_icon_or_column_heading',
 sourceRole:'manufacturer_layout_candidate_not_test',rankingAuthorized:false}];
 const r=documentClaimsToIR241(x,'s');assert.equal(r.facts.length,0);assert.equal(r.unresolvedCount,1);
});
test('241: category property discovery needs distinct scoped products and independent documents',()=>{
 const a=documentClaimsToIR241(doc([source('X','a','Unusual attribute',72)]),'src1').facts[0];
 const b=documentClaimsToIR241(doc([source('Y','b','Unusual attribute',90)]),'src2').facts[0];
 const rows=[scoped(reviewedSourceRole241(a,'product_specification'),'product-A','maker-A','category-z','src1'),scoped(reviewedSourceRole241(b,'product_specification'),'product-B','maker-B','category-z','src2')];
 assert.deepEqual(proposeCategoryAttributes241(rows),[{categoryId:'category-z',propertyKey:'unusual attribute',unit:'kg',
 productCount:2,brandCount:2,sources:2,status:'candidate_category_attribute_requires_review',rankingAuthorized:false}]);
 assert.deepEqual(proposeCategoryAttributes241(rows.slice(0,1)),[]);
});
test('241: duplicated publisher versions of one product do not inflate category support',()=>{
 const f=documentClaimsToIR241(doc([source('A','a','Load',50)]),'src').facts[0];
 assert.equal(proposeCategoryAttributes241([scoped(f,'same','maker','cat','doc1'),scoped(f,'same','maker','cat','doc2')]).length,0);
});
test('241: context-specific quantities, setup, unresolved and different category are not merged',()=>{
 const f=documentClaimsToIR241(doc([source('X','x','Length',600,'mm')]),'src').facts[0];
 const safe=reviewedSourceRole241(f,'installation');
 const rows=[scoped(safe,'p1','m','category','s1'),scoped(reviewedSourceRole241(f,'product_specification'),'p2','m','category','s2'),scoped(f,'p3','m','other','s3')];
 assert.equal(proposeCategoryAttributes241(rows).length,0);
 const conditional={...f,context:{...f.context,condition:'filter present'}};
 assert.equal(proposeCategoryAttributes241([scoped(reviewedSourceRole241(f,'product_specification'),'p1','m','category','s1'),scoped(reviewedSourceRole241(conditional,'product_specification'),'p2','m','category','s2')]).length,0);
});
test('241: equal source labels with incompatible units never promote a common category attribute',()=>{
 const f=documentClaimsToIR241(doc([source('X','a','Quantity',15,'l')]),'s1').facts[0];
 const g=documentClaimsToIR241(doc([source('Y','b','Quantity',22,'kg')]),'s2').facts[0];
 assert.deepEqual(proposeCategoryAttributes241([scoped(reviewedSourceRole241(f,'product_specification'),'p1','m1','cat','s1'),scoped(reviewedSourceRole241(g,'product_specification'),'p2','m2','cat','s2')]),[]);
});
test('241: HTML discoveries require explicit semantic review before even candidate category induction',()=>{
 const a=htmlToIR241('<dl><dt>Unusual attribute</dt><dd>40 kg</dd></dl>','a').facts[0];
 const b=htmlToIR241('<dl><dt>Unusual attribute</dt><dd>50 kg</dd></dl>','b').facts[0];
 assert.deepEqual(proposeCategoryAttributes241([scoped(a,'p1','a'),scoped(b,'p2','b')]),[]);
 const reviewed=[scoped(reviewedSourceRole241(a,'product_specification'),'p1','a','air fryer','a'),
  scoped(reviewedSourceRole241(b,'product_specification'),'p2','b','air fryer','b')];
 assert.equal(proposeCategoryAttributes241(reviewed).length,1);
 assert.ok(reviewed.every(x=>!x.fact.rankingAuthorized&&!x.fact.scientificTestEvidence));
});
test('241: role review cannot disguise rejected/source-ranked evidence',()=>{
 const a=htmlToIR241('<dl><dt>Width</dt><dd>55 cm</dd></dl>','a').facts[0];
 assert.throws(()=>reviewedSourceRole241({...a,rankingAuthorized:true} as unknown as Fact241,'product_specification'));
});

test('241: schema.org Product PropertyValue specifications feed the same unverified contract',()=>{
 const html=`<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Product Q","specification":[{"@type":"PropertyValue","name":"Strange rotor pitch","value":2.8,"unitText":"mm"},{"@type":"PropertyValue","name":"Pressure interval","minValue":20,"maxValue":35,"unitText":"mbar"}]}</script>`;
 const a=htmlToIR241(html,'retailer');assert.equal(a.facts.length,2);
 assert.deepEqual(a.facts[0].value,{type:'scalar',number:2.8,unit:'mm'});
 assert.deepEqual(a.facts[1].value,{type:'range',min:20,max:35,unit:'mbar'});
 assert.ok(a.facts.every(f=>f.role==='unresolved'&&f.rankingAuthorized===false));
});
test('241: multiple Product entities in a JSON-LD document cannot silently share property records',()=>{
 const json=JSON.stringify({'@graph':[
  {'@type':'Product',specification:{name:'Width',value:40,unitText:'cm'}},
  {'@type':'Product',specification:{name:'Width',value:80,unitText:'cm'}}]});
 assert.equal(htmlToIR241('<script type="application/ld+json">'+json+'</script>','s').facts.length,0);
});

test('241: signed operating ranges in HTML do not lose the minus signs',()=>{
 const z=htmlToIR241('<dl><dt>Storage ambient temperature</dt><dd>-22 to -13 °C</dd></dl>','s');
 assert.deepEqual(z.facts[0]?.value,{type:'range',min:-22,max:-13,unit:'°c'});
});

test('241: two separate JSON-LD Product scripts also require product disambiguation',()=>{
 const one=(name:string)=>'<script type="application/ld+json">'+JSON.stringify({'@type':'Product','name':name,
  specification:{name:'Depth',value:40,unitText:'cm'}})+'</script>';
 assert.equal(htmlToIR241(one('A')+one('B'),'s').facts.length,0);
});
