import test from 'node:test';import assert from 'node:assert/strict';
import {robotsDecision,type SourceTransport,type SourceResponse} from '../src/approved_web_reader.js';
import {publicRobotsDecision223} from '../src/phase223_public_metadata_access.js';
import {discoverFromApprovedSitemap,orderByRequestTerms75} from '../src/phase75_source_discovery.js';
import {comparisonMatrixFacts241,htmlToIR241} from '../src/phase241_unified_product_facts.js';
import {extractDeclaredPageIdentity222} from '../src/phase222_transient_public_page_observer.js';
import type {WebSourcePolicy} from '../src/web_evidence_acquisition.js';

const host='synthetic-publisher.org',asOf='2026-10-14T10:00:00Z';
const policy:WebSourcePolicy={sourceId:'syn',host,basis:'unknown',rightsDocumentId:null,rightsDocumentUrl:null,
 reviewedBy:null,reviewedAt:null,validUntil:null,permittedOperations:['metadata_discovery'],robots:'unknown',
 robotsCheckedAt:null,websiteTerms:'unknown',termsCheckedAt:null,commercialUseReviewed:false};
const ok=(url:string,contentType:string,body:string):SourceResponse=>
 ({status:200,finalUrl:url,contentType,body,rawBytes:Buffer.from(body)});
const missing=(url:string):SourceResponse=>({status:404,finalUrl:url,contentType:'text/html',body:'',rawBytes:Buffer.from('')});
const site=(files:Record<string,string>,calls:string[]=[]):SourceTransport=>({async get(url){
 calls.push(url);const path=url.slice(`https://${host}`.length);
 if(!(path in files))return missing(url);
 return ok(url,path==='/robots.txt'?'text/plain':path.includes('.xml')?'application/xml':'text/html',files[path]);
}});
const urlset=(paths:string[],extra='')=>'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '+
 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+
 paths.map(p=>`<url><loc>https://${host}${p}</loc>${extra}</url>`).join('')+'</urlset>';
const discover=(files:Record<string,string>,more:Partial<Parameters<typeof discoverFromApprovedSitemap>[0]>={},calls:string[]=[])=>
 discoverFromApprovedSitemap({policy,asOf,accessMode:'public_metadata',requirePathPrefix:'/gear/',maxCandidates:5,
  transport:site(files,calls),...more});

test('robots: leading-* patterns are understood and $ anchors the end of the URL',()=>{
 const body='User-agent: *\nDisallow: */embed/\nDisallow: /*.pdf$\nAllow: /\n';
 assert.equal(robotsDecision(body,'/reviews/embed/x'),'deny');
 assert.equal(robotsDecision(body,'/manual.pdf'),'deny');
 assert.equal(robotsDecision(body,'/manual.pdf?download=1'),'allow');
 assert.equal(robotsDecision(body,'/reviews/boot'),'allow');
 // Anything else that is not a path pattern still fails closed.
 assert.equal(robotsDecision('User-agent: *\nDisallow: embed\n','/x'),'unknown');
});
test('robots: a comment-only robots.txt places no restriction (RFC 9309), unreachable robots still blocks',()=>{
 const url=`https://${host}/robots.txt`;
 assert.equal(publicRobotsDecision223(ok(url,'text/plain','# nothing here\n'),`https://${host}/gear/a`),'allow');
 assert.equal(publicRobotsDecision223({...ok(url,'text/plain',''),status:503},`https://${host}/gear/a`),'unknown');
});
test('sitemap: image:loc extensions are not counted as pages, so media-rich sitemaps are not rejected',async()=>{
 const images=Array.from({length:4},(_,i)=>`<image:image><image:loc>https://${host}/img/${i}.jpg</image:loc></image:image>`).join('');
 const pages=Array.from({length:400},(_,i)=>`/gear/item-${i}`);
 const r=await discover({'/robots.txt':'User-agent: *\nAllow: /\n','/sitemap.xml':urlset(pages,images)});
 assert.equal(r.status,'candidate_urls_found');assert.equal(r.urls.length,5);
 assert.ok(r.urls.every(u=>u.url.includes('/gear/item-')));
});
test('sitemap index: same-host children are followed (bounded), with scope-matching children first',async()=>{
 const calls:string[]=[];
 const index='<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
  ['/sm-news.xml','/sm-gear.xml?page=1&amp;x=2','https://elsewhere.org/sm-gear.xml'].map(p=>
   `<sitemap><loc>${p.startsWith('https')?p:`https://${host}${p}`}</loc></sitemap>`).join('')+'</sitemapindex>';
 const r=await discover({'/robots.txt':'User-agent: *\nAllow: /\n','/sitemap.xml':index,
  '/sm-gear.xml?page=1&x=2':urlset(['/gear/boot-a','/gear/boot-b']),'/sm-news.xml':urlset(['/news/x'])},{},calls);
 assert.deepEqual(r.urls.map(u=>u.url),[`https://${host}/gear/boot-a`,`https://${host}/gear/boot-b`]);
 assert.equal(calls[2],`https://${host}/sm-gear.xml?page=1&x=2`,'scope-matching child read first');
 assert.ok(!calls.some(c=>c.includes('elsewhere.org')),'cross-host child never fetched');
});
test('sitemap: a missing configured path falls back to Sitemap: lines declared in robots.txt',async()=>{
 const r=await discover({'/robots.txt':`User-agent: *\nAllow: /\nSitemap: https://${host}/maps/main.xml\nSitemap: https://other.org/x.xml\n`,
  '/maps/main.xml':urlset(['/gear/tent'])});
 assert.equal(r.status,'candidate_urls_found');assert.deepEqual(r.reasons,['sitemap_from_robots_declaration']);
 const none=await discover({'/robots.txt':'User-agent: *\nAllow: /\n'});
 assert.equal(none.status,'blocked');
});
test('sitemap: request terms decide which in-scope URLs are kept, deeper item pages win ties',async()=>{
 const pages=['/gear/best-socks','/gear/trail-runners','/gear/hiking-boots','/gear/hiking/boot-x-review','/gear/rain-jacket'];
 const r=await discover({'/robots.txt':'User-agent: *\nAllow: /\n','/sitemap.xml':urlset(pages)},
  {maxCandidates:2,relevanceTerms:['Hiking boots','walking boots']});
 assert.deepEqual(r.urls.map(u=>new URL(u.url).pathname),['/gear/hiking/boot-x-review','/gear/hiking-boots']);
 assert.deepEqual(orderByRequestTerms75(['https://a.org/x','https://a.org/y'],[]),['https://a.org/x','https://a.org/y']);
});
test('comparison matrix: products as columns, opinions dropped, price and lb/oz weight normalised',()=>{
 const html='<html><table><tr><td></td><td>Boot A<a href="/a">Read review</a></td><td>Boot B</td></tr>'+
  '<tr><td>Price:</td><td>$180</td><td>$1,170</td></tr><tr><td>Weight:</td><td>2 lb. 12 oz.</td><td>14 oz.</td></tr>'+
  '<tr><td>Upper:</td><td>Nubuck leather, mesh</td><td>Synthetic</td></tr>'+
  '<tr><td>What we like:</td><td>Light and comfortable at a good value.</td><td>Great grip on wet rock.</td></tr></table></html>';
 const facts=comparisonMatrixFacts241(html,'syn');
 const get=(p:string,k:string)=>facts.find(f=>f.context.variant===p&&f.propertyKey===k)?.value;
 assert.deepEqual(get('Boot A','price'),{type:'scalar',number:180,unit:'usd'});
 assert.deepEqual(get('Boot B','price'),{type:'scalar',number:1170,unit:'usd'});
 assert.deepEqual(get('Boot A','weight'),{type:'scalar',number:1247,unit:'g'});
 assert.deepEqual(get('Boot B','weight'),{type:'scalar',number:397,unit:'g'});
 assert.deepEqual(get('Boot A','upper'),{type:'text',value:'Nubuck leather, mesh'});
 assert.equal(facts.filter(f=>f.propertyKey==='what we like').length,0);
 assert.ok(facts.every(f=>f.identity==='document_declared_unverified'&&!f.rankingAuthorized&&!f.scientificTestEvidence));
});
test('comparison matrix: products as rows only when enough columns are quantitative',()=>{
 const rows=(cells:string[][])=>'<html><table>'+cells.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</table></html>';
 const spec=rows([['Shoe','Price','Type','Weight'],['Boot A','$220','Midweight','2 lbs. 6 oz.'],['Boot B','$170','Lightweight','2 lb. 2.9 oz.']]);
 const facts=comparisonMatrixFacts241(spec,'syn');
 assert.equal(facts.length,6);
 assert.ok(facts.every(f=>f.provenance.method==='html_comparison_matrix_rows'&&f.context.rowHeading==='Shoe'));
 assert.deepEqual(facts.find(f=>f.context.variant==='Boot B'&&f.propertyKey==='weight')?.value,{type:'scalar',number:989,unit:'g'});
 const prose=rows([['Step','Action','Note'],['One','Open the lid','Gently'],['Two','Insert bag','Check fit']]);
 assert.equal(comparisonMatrixFacts241(prose,'syn').length,0);
 const spanned='<html><table><tr><td></td><td colspan="2">A</td></tr><tr><td>Price</td><td>$1</td><td>$2</td></tr><tr><td>W</td><td>1 kg</td><td>2 kg</td></tr></table></html>';
 assert.equal(comparisonMatrixFacts241(spanned,'syn').length,0);
});
test('ProductGroup pages: one product lead, offer price range across variants',()=>{
 const group={'@context':'https://schema.org','@type':'ProductGroup',name:'Boot FG',brand:{'@type':'Brand',name:'Maker'},
  productGroupID:'72110',hasVariant:[38,39,40].map((size,i)=>({'@type':'Product',name:`Boot FG - ${size}`,
   offers:{'@type':'Offer',price:80+i*5,priceCurrency:'GBP'}}))};
 const html=`<html><script type="application/ld+json">${JSON.stringify(group)}</script></html>`;
 const identity=extractDeclaredPageIdentity222(html);
 assert.deepEqual(identity.productLeads,[{name:'Boot FG',brand:'Maker',model:null,sku:'72110'}]);
 const price=htmlToIR241(html,'syn').facts.find(f=>f.propertyKey==='price');
 assert.deepEqual(price?.value,{type:'range',min:80,max:90,unit:'gbp'});
 assert.equal(price?.status,'unverified_source_declaration');
});
test('JSON-LD after many ordinary scripts is still read (retail pages carry dozens of scripts first)',()=>{
 const filler=Array.from({length:60},(_,i)=>`<script>var x${i}=1;</script>`).join('');
 const product={'@context':'https://schema.org','@type':'Product',name:'Late Product',sku:'LP-1',brand:'Maker'};
 const html=`<html>${filler}<script type="application/ld+json">${JSON.stringify(product)}</script></html>`;
 assert.deepEqual(extractDeclaredPageIdentity222(html).productLeads,[{name:'Late Product',brand:'Maker',model:null,sku:'LP-1'}]);
});
