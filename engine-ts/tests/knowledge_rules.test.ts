import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileRuleSet,evaluate,type RuleSet} from '../src/knowledge_rules.js';
import {loadQuantityKnowledge,findQuantities,typeQuantity,compareQuantities,type QuantityPack} from '../src/quantity_knowledge.js';
import {interpretWithKnowledge1G} from '../src/table_interpreter1g_knowledge.js';

// KR (2026-10-18): declarative rules with provenance. Synthetic rules and pages only.
const rulesFile=():RuleSet=>JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/rules.v3.json',import.meta.url),'utf8'));
const packFile=():QuantityPack=>JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/quantity-knowledge.v2.json',import.meta.url),'utf8'));
const mini=(rules:string[],extra:RuleSet['vocabulary']=[]):RuleSet=>({schema:'t',version:'t',statement:'t',
 vocabulary:[{name:'edge',args:['X','Y'],role:'input',meaning:'an edge'},{name:'path',args:['X','Y'],role:'derived',meaning:'a path'},{name:'node',args:['X'],role:'input',meaning:'a node'},
  {name:'isolated',args:['X'],role:'derived',meaning:'no outgoing edge'},{name:'p',args:[],role:'derived',meaning:'p'},...extra],
 programs:[{id:'g',statement:'t',rules:rules.map((r,i)=>({id:'R'+i,rule:r,statement:'rule '+i,source:'test'}))}]});

test('KR language: recursion, stratified negation (closed over the record) and derivations', ()=>{
 const p=compileRuleSet(mini(['path(X,Y) :- edge(X,Y).','path(X,Z) :- edge(X,Y), path(Y,Z).','isolated(X) :- node(X), not edge(X,_).'])).get('g')!;
 const m=evaluate(p,{edge:[['a','b'],['b','c']],node:[['a'],['b'],['c']]});
 assert.ok(m.has('path',['a','c']));assert.deepEqual(m.all('isolated').map(f=>f.args[0]),['c'],'"no edge" means none in the record');
 const w=m.why(m.match('path',['a','c'])[0]);assert.match(w[0],/R1: rule 1/);assert.ok(w.some(l=>/edge\(a, b\)\s+\[given\]/.test(l)));
});
test('KR static checks: undeclared, wrong arity, unsafe, unstratifiable, deriving an input', ()=>{
 assert.throws(()=>compileRuleSet(mini(['path(X,Y) :- link(X,Y).'])),/undeclared predicate link/);
 assert.throws(()=>compileRuleSet(mini(['path(X) :- edge(X,_).'])),/arity/);
 assert.throws(()=>compileRuleSet(mini(['path(X,Y) :- edge(X,Z).'])),/unsafe: Y/);
 assert.throws(()=>compileRuleSet(mini(['p :- not p.'])),/not stratifiable/);
 assert.throws(()=>compileRuleSet(mini(['edge(X,Y) :- path(X,Y).'])),/not a derived predicate/);
 const p=compileRuleSet(mini(['path(X,Y) :- edge(X,Y).'])).get('g')!;assert.throws(()=>evaluate(p,{path:[['a','b']]}),/not an input/,'a program may not be handed what it derives');
 assert.throws(()=>loadQuantityKnowledge(undefined,{...rulesFile(),programs:[]}),/program kind missing/);
});

const page=(intro:string,rows:string)=>`<html><body><h1>Review</h1>${intro}<h2>Our test results</h2><table><tr><th>Test</th><th>Alpha A1</th><th>Beta B2</th></tr>${rows}</table></body></html>`;
const levels=(h:string,k=loadQuantityKnowledge())=>interpretWithKnowledge1G(h,k).tables.flatMap(t=>t.observations).filter(o=>o.quantity?.unit.level);
test('KR scope (owner review): a method statement about one product does not cover another product\'s value', ()=>{
 const h=page('<p>We measured the Alpha A1 with a decibel meter at all fan speeds.</p>','<tr><td>Noise</td><td>45 dBA</td><td>52 dBA</td></tr>');
 const o=levels(h);const a=o.find(x=>x.product==='Alpha A1')!,b=o.find(x=>x.product==='Beta B2')!;
 assert.equal(a.quantity!.kind.id,'sound_pressure_level');assert.ok(a.quantity!.kind.justification.rules.includes('C5'));
 assert.equal(b.quantity!.kind.id,null,'the statement names Alpha A1 only');
 // naming both, or neither, covers both
 for(const intro of ['<p>We measured the Alpha A1 and the Beta B2 with a decibel meter.</p>','<p>We measured the noise of every purifier with a decibel meter.</p>'])
  assert.ok(levels(page(intro,'<tr><td>Noise</td><td>45 dBA</td><td>52 dBA</td></tr>')).every(x=>x.quantity!.kind.id==='sound_pressure_level'));
 // ablation: without the scope rule the statement would cover Beta B2 too (the rule, not the code, decides)
 const r=rulesFile();const kind=r.programs.find(p=>p.id==='kind')!;kind.rules=kind.rules.filter(x=>x.id!=='C4');
 assert.ok(levels(h,loadQuantityKnowledge(undefined,r)).every(x=>x.quantity!.kind.id==='sound_pressure_level'));
});
test('KR generality: new knowledge (a laboratory method for sound power) works with no code change', ()=>{
 const h=page('<p>We determined the noise of each unit in a reverberation room.</p>','<tr><td>Noise (measured)</td><td>45 dBA</td><td>52 dBA</td></tr>');
 assert.ok(levels(h).every(x=>x.quantity!.kind.id===null),'not known yet: stays ambiguous');
 const p=packFile();p.kindEvidence!.push({kind:'sound_power_level',justification:'documented_method',terms:['reverberation room'],covers:['publisher_measured','unknown'],source:'iso_3741_3744'});
 const o=levels(h,loadQuantityKnowledge(p));assert.ok(o.every(x=>x.quantity!.kind.id==='sound_power_level'));
 assert.deepEqual([o[0].quantity!.kind.justification.type,o[0].quantity!.kind.justification.from],['documented_method','protocol']);
});
test('KR comparability: the verdict comes with the rules it rests on', ()=>{
 const qk=loadQuantityKnowledge();const t=(s:string,labels:string[])=>typeQuantity(qk,findQuantities(qk,s)[0],{labels});
 const c=compareQuantities(qk,t('250 m³/h',['CADR','Dust']),t('300 m³/h',['CADR','Smoke']));
 assert.equal(c.verdict,'not_comparable');assert.match(c.reasons[0],/different challenge pollutant: dust vs smoke/);assert.ok(c.rules.includes('F10'));
 assert.ok(c.derivation.some(l=>/stated_condition\(a, challenge_pollutant, dust\)\s+\[given\]/.test(l)));
 // a rule removed from the data changes the decision: different stated conditions no longer separate the values
 const r=rulesFile();const cmp=r.programs.find(p=>p.id==='compare')!;cmp.rules=cmp.rules.filter(x=>x.id!=='F10');
 assert.notEqual(compareQuantities(loadQuantityKnowledge(undefined,r),t('250 m³/h',['CADR','Dust']),t('300 m³/h',['CADR','Smoke'])).verdict,'not_comparable');
});

test('KR provenance: a conclusion that rests on an absence says what was checked, in which record', ()=>{
 const p=compileRuleSet(mini(['isolated(X) :- node(X), not edge(X,_).'])).get('g')!;
 const m=evaluate(p,{edge:[['a','b']],node:[['a'],['b']]},{record:'the test graph'});
 const w=m.why(m.match('isolated',['b'])[0]).join('\n');
 assert.match(w,/not edge\(b, \*\)\s+\[absent from the test graph: no such fact among 1 given edge facts\]/);
 const qk=loadQuantityKnowledge();const v=typeQuantity(qk,findQuantities(qk,'45 dBA')[0],{labels:['Noise']});
 assert.ok(v.kind.justification.derivation.some(l=>/not has_kind\(o\)\s+\[absent from the record of value "45 dBA"/.test(l)));
});
test('KR2 context scope: a nearby paragraph about another product is not read for this value; the frame always is', ()=>{
 const h=`<html><body><h1>Review</h1><p>We measured the Alpha A1 from 1 m away.</p><table><caption>Noise, measured</caption><tr><th>Test</th><th>Alpha A1</th><th>Beta B2</th></tr><tr><td>Sound pressure level</td><td>45 dBA</td><td>52 dBA</td></tr></table></body></html>`;
 const o=levels(h);const a=o.find(x=>x.product==='Alpha A1')!.quantity!,b=o.find(x=>x.product==='Beta B2')!.quantity!;
 assert.ok(a.conditions.some(c=>c.axis==='measurement_distance'),'the paragraph is about Alpha A1');
 assert.ok(!b.conditions.some(c=>c.axis==='measurement_distance'),'its distance is not Beta B2\'s');
 assert.ok(b.contextScope!.applied.includes('caption')&&b.contextScope!.excluded.length===1);
 assert.ok(b.contextScope!.derivation.some(l=>/not block_names_product\(before 1, Beta B2\)/.test(l)));
 // ablation: without rule X2 the paragraph would be read for Beta B2 too
 const r=rulesFile();const sc=r.programs.find(p=>p.id==='scope')!;sc.rules=sc.rules.filter(x=>x.id!=='X2');
 const b2=levels(h,loadQuantityKnowledge(undefined,r)).find(x=>x.product==='Beta B2')!.quantity!;assert.ok(b2.conditions.some(c=>c.axis==='measurement_distance'));
});

test('KV P2: within-source comparability is between products of one test; one product under the same labels is two tests', ()=>{
 const h=`<html><body><h1>Review</h1><table><tr><th>Test</th><th>Alpha A1</th><th>Beta B2</th></tr><tr><td>Sound pressure level</td><td>45 dBA<br>52 dBA</td><td>47 dBA</td></tr></table></body></html>`;
 const qk=loadQuantityKnowledge();const o=interpretWithKnowledge1G(h,qk).tables.flatMap(t=>t.observations).filter(x=>x.quantity?.unit.level);
 const a1=o.filter(x=>x.product==='Alpha A1'),b=o.find(x=>x.product==='Beta B2')!;
 assert.equal(a1.length,2);
 assert.equal(compareQuantities(qk,a1[0].quantity!,a1[1].quantity!).verdict,'comparable_conditions_unestablished','two values of Alpha A1 under one label: something unshown tells them apart');
 assert.equal(compareQuantities(qk,a1[0].quantity!,b.quantity!).verdict,'comparable_within_source');
});

test('KR kr.3 (R1): a difference of conditions is concluded only when documented or definitional; otherwise not shown equal', ()=>{
 const qk=loadQuantityKnowledge();const t=(s:string,labels:string[])=>typeQuantity(qk,findQuantities(qk,s)[0],{labels});
 const reason=(a:string[],b:string[])=>{const c=compareQuantities(qk,t('250 m³/h',a),t('300 m³/h',b));return {v:c.verdict,r:c.reasons.join('; '),rules:c.rules};};
 // kr.4 (S82, owner review of S81: a condition not documented is not a condition different): an unknown relation leaves
 // comparability unestablished; kr.3 gave it the not_comparable verdict (reproduced below with rules.v3)
 const sl=reason(['CADR','Sleep mode'],['CADR','Speed 1']);assert.equal(sl.v,'comparable_conditions_unestablished');assert.match(sl.r,/not shown to be the same state or different states/);assert.ok(sl.rules.includes('F10b'));
 const qk3=loadQuantityKnowledge(undefined,JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/rules.v3.json',import.meta.url),'utf8')));
 assert.equal(compareQuantities(qk3,typeQuantity(qk3,findQuantities(qk3,'250 m³/h')[0],{labels:['CADR','Sleep mode']}),typeQuantity(qk3,findQuantities(qk3,'300 m³/h')[0],{labels:['CADR','Speed 1']})).verdict,'not_comparable','kr.3 reproduces');
 const rk=reason(['CADR','Speed 1'],['CADR','Speed 3']);assert.equal(rk.v,'not_comparable');assert.match(rk.r,/^different fan setting/);assert.ok(rk.rules.includes('F10'));
 const ex=reason(['CADR','Lowest speed'],['CADR','Top speed']);assert.ok(ex.rules.includes('F10'),'highest vs lowest: different by definition');
 const s4=reason(['CADR','Speed 4'],['CADR','Top speed']);assert.ok(s4.rules.includes('F10b'),'speed 4 may or may not be the top speed');
});
