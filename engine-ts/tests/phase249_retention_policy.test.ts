import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {KnowledgeStore246,DEFAULT_STORAGE_POLICY246,type SourceInput246,type StoragePolicy246} from '../src/phase246_knowledge_store.js';
import {extractSpecifications245} from '../src/phase245_spec_extraction.js';
import {FACTUAL_CLASS_POLICY249,detectReservations249,classDecision249} from '../src/phase249_retention_policy.js';
process.env.PEE_ALLOW_TMP_STORE='1';
const dir=mkdtempSync(join(tmpdir(),'pee249-'));
const AT='2026-10-14T12:00:00.000Z';
const CLASS:StoragePolicy246={...DEFAULT_STORAGE_POLICY246,policyVersion:'pee249-class',classPolicy:FACTUAL_CLASS_POLICY249};
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const src=(host:string,type:SourceInput246['sourceType'],policy?:SourceInput246['policy']):SourceInput246=>({sourceId:'src_'+host.replace(/\W/g,'_'),host,sourceType:type,sourceTypeBasis:'operator_asserted',policy});
const page=(name:string,extra='')=>`<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({'@type':'Product',name,offers:{price:'99.00',priceCurrency:'GBP'}})}</script></head>
 <body><main><h1>${name}</h1><p>Our best fryer ever, loved by chefs everywhere and made with care.</p><table><tr><th>Power</th><td>1500 W</td></tr><tr><th>Capacity</th><td>5.5 l</td></tr><tr><th>Finish</th><td>Matte black</td></tr></table>${extra}</main></body></html>`;
const obs=(s:KnowledgeStore246,url:string,html:string,source:SourceInput246,extra={})=>s.ingestObservation246({source,url,sha256:sha(html),bytes:html.length,httpStatus:200,
 fetchedAt:AT,runId:'r1',extractorVersion:'spec-extractor-7',extraction:extractSpecifications245(html,url),categoryHypotheses:['air_fryers'],...extra});
const store=(p=CLASS)=>new KnowledgeStore246(join(dir,Math.random().toString(36).slice(2)+'.sqlite'),p);

test('class policy: individual facts are kept privately with provenance; prose is never kept; the default policy is unchanged',()=>{
 const s=store();const r=obs(s,'https://maker.example/a',page('Fryer A'),src('maker.example','manufacturer'));
 assert.equal(r.retention,'facts_retained_class_policy');assert.equal(r.declarationsRetained,4);
 const d=s.declarations246(r.productIds[0]);assert.deepEqual(d.map(x=>x.property).sort(),['Capacity','Finish','Power','Price']);
 assert.ok(!JSON.stringify(d).includes('loved by chefs'));
 assert.equal(s.stats246().declarationsRetainedClassPolicy,4);
 const def=store(DEFAULT_STORAGE_POLICY246);assert.equal(obs(def,'https://maker.example/a',page('Fryer A'),src('maker.example','manufacturer')).declarationsRetained,0);
 s.close();def.close();
});
test('class policy: retained values go to private exports only, never to public ones',()=>{
 const s=store();obs(s,'https://maker.example/a',page('Fryer A'),src('maker.example','manufacturer'));
 const priv=s.exportShards246(join(dir,'priv'),{audience:'private'});const pub=s.exportShards246(join(dir,'pub'),{audience:'public'});
 assert.equal(priv.files['declarations.ndjson']?.rows??Object.entries(priv.files).find(([k])=>k.includes('declarations'))?.[1].rows,4);
 const pubDecl=Object.entries(pub.files).find(([k])=>k.includes('declarations'));assert.equal(pubDecl?.[1].rows??0,0);
 s.close();
});
test('class policy: a per-source refusal or prohibited terms wins; machine-readable reservations keep metadata only',()=>{
 const s=store();
 const refused={sourceId:'p',host:'no.example',basis:'refused' as const,rightsDocumentId:null,rightsDocumentUrl:null,reviewedBy:null,reviewedAt:null,validUntil:null,
  permittedOperations:[],robots:'allowed' as const,robotsCheckedAt:null,websiteTerms:'unknown' as const,termsCheckedAt:null,commercialUseReviewed:false};
 assert.equal(obs(s,'https://no.example/a',page('Fryer N'),src('no.example','retailer',refused)).retention,'blocked');
 const res=detectReservations249('User-agent: *\nContent-Signal: ai-train=no, search=yes, ai-input=no\nAllow: /\n',null);
 assert.equal(res.contentSignalAiInput,'no');
 const r=obs(s,'https://cs.example/a',page('Fryer C'),src('cs.example','retailer'),{reservations:res});
 assert.equal(r.declarationsRetained,0);assert.ok(s.gaps246({refId:r.revisionId}).some(g=>g.kind==='machine_readable_reservation'));
 assert.equal(detectReservations249(null,'<meta name="tdm-reservation" content="1">').tdmReservation,true);
 assert.equal(detectReservations249('User-agent: other\nContent-Signal: ai-input=no\n',null).contentSignalAiInput,null);
 s.close();
});
test('class policy: the per-host cap keeps a source sampled, re-observing a counted product still retains, test publishers keep measurements only',()=>{
 const tight={...CLASS,classPolicy:{...FACTUAL_CLASS_POLICY249,classes:{...FACTUAL_CLASS_POLICY249.classes,retailer:{...FACTUAL_CLASS_POLICY249.classes.retailer,maxProductsPerHost:2}}}};
 const s=store(tight);const shop=src('shop.example','retailer');
 assert.ok(obs(s,'https://shop.example/1',page('Fryer 1'),shop).declarationsRetained>0);
 assert.ok(obs(s,'https://shop.example/2',page('Fryer 2'),shop).declarationsRetained>0);
 const third=obs(s,'https://shop.example/3',page('Fryer 3'),shop);assert.equal(third.declarationsRetained,0);
 assert.ok(s.gaps246({refId:third.revisionId}).some(g=>g.kind==='insubstantial_part_cap_reached'));
 assert.ok(obs(s,'https://shop.example/1',page('Fryer 1','<p>updated</p>'),shop).declarationsRetained>0);
 const lab=obs(s,'https://lab.example/t',page('Fryer L'),src('lab.example','independent_original_test'));
 assert.deepEqual(s.declarations246(lab.productIds[0]).map(d=>d.property).sort(),['Capacity','Power']);
 assert.deepEqual(classDecision249(FACTUAL_CLASS_POLICY249,'unknown',undefined,30,false),{retain:false,reason:'insubstantial_part_cap_reached'});
 s.close();
});

test('private store: refused inside a Git working tree; rotated backups are verified and restorable; a tampered backup is refused',async()=>{
 const {verifyStoreFile249,restoreStore249,insideGitWorkTree249}=await import('../src/phase246_knowledge_store.js');
 const {mkdirSync,writeFileSync}=await import('node:fs');
 const repo=join(dir,'fake-repo');mkdirSync(join(repo,'.git'),{recursive:true});
 assert.equal(insideGitWorkTree249(join(repo,'data','k.sqlite')),true);
 assert.throws(()=>new KnowledgeStore246(join(repo,'data','k.sqlite'),CLASS),/249_refusing_store_inside_git_worktree/);
 const s=store();obs(s,'https://maker.example/a',page('Fryer A'),src('maker.example','manufacturer'));
 const b1=s.backupRotate249(join(dir,'bk'),2,'2026-10-14T12:00:00.000Z');
 s.backupRotate249(join(dir,'bk'),2,'2026-10-14T13:00:00.000Z');
 const b3=s.backupRotate249(join(dir,'bk'),2,'2026-10-14T14:00:00.000Z');
 assert.equal(existsSync(b1.path),false);assert.equal(b3.removed.length,1);
 assert.equal(b3.manifest.integrityOk,true);assert.equal(b3.manifest.journalOk,true);assert.equal(b3.manifest.counts.declarations,4);
 assert.equal(verifyStoreFile249(b3.path).sha256,b3.manifest.sha256); // verification never modifies the backup
 const target=join(dir,'restored','k.sqlite');
 const r=restoreStore249(b3.path,target);assert.equal(r.keptPrevious,null);
 const back=new KnowledgeStore246(target,CLASS);assert.equal(back.stats246().declarationsRetainedClassPolicy,4);assert.ok(back.verifyJournal().ok);back.close();
 const r2=restoreStore249(b3.path,target);assert.ok(r2.keptPrevious&&existsSync(r2.keptPrevious));
 writeFileSync(b3.path+'.manifest.json',JSON.stringify({...b3.manifest,sha256:'0'.repeat(64)}));
 assert.throws(()=>restoreStore249(b3.path,target),/249_backup_hash_mismatch/);
 s.close();
});
test('private evaluation directory: configurable, refused inside a Git working tree',async()=>{
 const {privateEvaluationDir249}=await import('../src/phase249_retention_policy.js');const {mkdirSync}=await import('node:fs');
 assert.equal(privateEvaluationDir249({PEE_PRIVATE_EVAL_DIR:join(dir,'pe')}),join(dir,'pe'));
 assert.match(privateEvaluationDir249({},'/home/x'),/\/home\/x\/\.local\/share\/product-evidence-engine\/private-eval$/);
 mkdirSync(join(dir,'r2','.git'),{recursive:true});
 assert.throws(()=>privateEvaluationDir249({PEE_PRIVATE_EVAL_DIR:join(dir,'r2','eval')}),/249_private_eval_dir_inside_git_worktree/);
});
