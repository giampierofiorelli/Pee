import test from 'node:test';
import assert from 'node:assert/strict';
import {loadQuantityKnowledge} from '../src/quantity_knowledge.js';
import {describeMeasurement} from '../src/knowledge_link.js';
import {translateDocument,parseTeachingDocument,distinctionQuestions,acquireConditionAxes,withAcquiredAxes,renderSelfCheck,loadTranslationCues,identifyConcept,deriveSufficiency,proxyLimits,applicableLimits,subjectHead,denotationOf,alignWithType,retrieveConcepts,documentConcepts,trainDistributional,wordSimilarity,phraseSimilarity,stem,clauses} from '../src/knowledge_translation.js';

// R3 (owner S73): PEE's translator of teaching documents and its question-driven acquisition of condition axes.
// Synthetic text written for these tests (T1: wiring, not evidence about the owner documents).
const qk=loadQuantityKnowledge();
const concept=(id:string)=>({id,statement:'Measured as stated.',aliases:[]});
const DOC=['# Method','','## Energy','',
 'Empty-run energy does not by itself establish energy per cooked meal [R12].',
 '- Running cost is calculated from electricity use, filter replacements and consumables.',
 '- Measured power depends on the fan setting.',
 '','| Measure | Method | Limitation |','|---|---|---|','| Noise | sound level meter at 1 m | not comparable across rooms |',
 '','Proposed method: weigh the basket before and after cooking.',
 'The appliance drew 1450 W during the run.'].join('\n');

test('R3 translation: each statement keeps its quote, provenance, status and references, and renders back into a sentence', ()=>{
 const r=translateDocument(qk,DOC,{source:'doc'});
 const ns=r.statements.find(s=>s.type==='not_sufficient')!;
 assert.ok(ns,'a not_sufficient statement');assert.match(ns.rendered,/does not by itself establish/);
 assert.ok(ns.quote.startsWith('Empty-run energy'));assert.equal(ns.provenance.line,5);assert.deepEqual(ns.provenance.headings,['Method','Energy']);
 assert.deepEqual(ns.refs,['R12']);
 const comp=r.statements.find(s=>s.type==='composed_of')!;assert.ok(comp.parts.length>=3,'the parts of a compound quantity');
 assert.ok(r.statements.some(s=>s.type==='depends_on'));
 // a table row: the column header gives the role of the cell
 const lim=r.statements.find(s=>s.provenance.block==='table_row'&&s.type==='limitation');assert.ok(lim);assert.equal(lim!.provenance.header,'Limitation');
 // the document's own status marker is carried, never upgraded
 assert.ok(r.statements.some(s=>s.status.includes('proposed_method')));
 // a value with a unit the quantity knowledge reads
 assert.ok(r.statements.some(s=>s.type==='quantitative_finding'));
 // what is not recognised is counted, not hidden
 assert.equal(typeof r.unrecognised,'number');
});

test('R3 translation: a line range limits the reading to those lines (held-out sections stay unread)', ()=>{
 const blocks=parseTeachingDocument(DOC,[{start:1,end:5}]);
 assert.ok(blocks.every(b=>b.line<=5));
 const r=translateDocument(qk,DOC,{source:'doc',range:[{start:6,end:7}]});
 assert.ok(r.statements.length>0&&r.statements.every(s=>s.provenance.line>=6&&s.provenance.line<=7));
});

test('R3 translation: negation is preserved (metamorphic: removing "not" changes the statement type)', ()=>{
 const neg=translateDocument(qk,'Label energy does not establish real-use energy.',{source:'d'}).statements;
 const pos=translateDocument(qk,'Label energy establishes real-use energy.',{source:'d'}).statements;
 assert.ok(neg.some(s=>s.type==='not_sufficient'));assert.ok(!pos.some(s=>s.type==='not_sufficient'));
});

test('R3 acquisition: a question of the teaching is answered by a document structure; the axis is a reversible overlay', ()=>{
 const ds=['sustained_sdr_luminance','hdr_luminance_by_window'].map(id=>describeMeasurement(qk,concept(id)));
 const qs=distinctionQuestions(ds);
 assert.ok(qs.some(q=>q.wordsA.includes('sdr')&&q.wordsB.includes('hdr')),'the question: what distinguishes sdr from hdr');
 const docs=[{source:'tv',md:'Measure peak luminance in each SDR/HDR mode after warm-up.'}];
 const ps=acquireConditionAxes(qk,docs,qs);
 assert.equal(ps.length,1);assert.deepEqual(Object.keys(ps[0].values).sort(),['hdr','sdr']);
 assert.equal(ps[0].evidence[0].structure,'slash');assert.equal(ps[0].evidence[0].line,1);
 const qk2=withAcquiredAxes(qk,ps,p=>loadQuantityKnowledge(p));
 assert.ok(qk2.axes.has(ps[0].axis));assert.ok(!qk.axes.has(ps[0].axis),'the base knowledge is unchanged');
 // with the axis, the measurements fix its values: the distinction is now typed
 const d2=describeMeasurement(qk2,concept('sustained_sdr_luminance'));
 assert.ok(d2.fixed.some(f=>f.axis===ps[0].axis&&f.value==='sdr'));assert.ok(!d2.untyped.includes('sdr'));
 // no proposals: the knowledge is returned as it is
 assert.equal(withAcquiredAxes(qk,[],p=>loadQuantityKnowledge(p)),qk);
});

test('R3 acquisition: no answer without a question, and a one-sided answer is refused', ()=>{
 const ds=['sustained_sdr_luminance','hdr_luminance_by_window'].map(id=>describeMeasurement(qk,concept(id)));
 const qs=distinctionQuestions(ds);
 // a structure whose values answer no question of the teaching
 assert.equal(acquireConditionAxes(qk,[{source:'d',md:'Use slow/fast mode for grinding.'}],qs).length,0);
 // an answer to one side only ("aged" against a measurement that names no filter state) would make PEE assume the other
 const one=['aged_filter_cadr','particle_cadr'].map(id=>describeMeasurement(qk,concept(id)));
 const q1=distinctionQuestions(one);
 assert.ok(q1.length>0);
 assert.equal(acquireConditionAxes(qk,[{source:'d',md:'Compare new versus aged filters.'}],q1).length,0);
 // the same contrast answers both sides when both measurements name a filter state (metamorphic)
 const two=['aged_filter_cadr','new_filter_cadr'].map(id=>describeMeasurement(qk,concept(id)));
 const ps=acquireConditionAxes(qk,[{source:'d',md:'Compare new versus aged filters.'}],distinctionQuestions(two));
 assert.equal(ps.length,1);assert.equal(ps[0].evidence[0].structure,'contrast');
});

test('R3 acquisition: an enumerated field states the values of one condition', ()=>{
 const two=['aged_filter_cadr','new_filter_cadr'].map(id=>describeMeasurement(qk,concept(id)));
 const ps=acquireConditionAxes(qk,[{source:'d',md:'- filter_condition: new | aged | replaced | unknown'}],distinctionQuestions(two));
 assert.equal(ps.length,1);assert.equal(ps[0].axis,'acq_filter_condition');
 assert.deepEqual(Object.keys(ps[0].values).sort(),['aged','new','replaced','unknown']);
});

test('R3 kt-cues.2 a negated or prohibited statement renders with its negation (held-out fidelity review)', ()=>{
 const tr=(t:string)=>translateDocument(qk,t,{source:'d'}).statements[0];
 const a=tr('A purifier cannot ventilate a room.');assert.equal(a.type,'limitation');assert.match(a.rendered,/cannot ventilate/);assert.deepEqual(a.selfCheck,[]);
 const b=tr('Fan speed is not airflow at the outlet.');assert.match(b.rendered,/is not airflow/);
 const c=tr('Do not reject a filter on its label alone.');assert.match(c.rendered,/^Limitation: Do not reject/);assert.ok(!c.rendered.includes('unspecified'));
 const m=tr('Weigh the basket before and after cooking.');assert.match(m.rendered,/^Method step: Weigh the basket/);
 // the kt-cues.1 rendering dropped the word and inverted the meaning; the self-check catches that kind of loss
 assert.deepEqual(renderSelfCheck('A purifier cannot ventilate a room.','Limitation: A purifier ventilate a room.'),['negation_lost']);
 assert.deepEqual(renderSelfCheck('No device is made good by its fan alone.','Limitation: device is made good by its fan alone.'),['negation_lost']);
 assert.equal(loadTranslationCues().cues.version,'kt-cues.4');
});

test('R3 kt-cues.2 questions and document metadata are not knowledge claims', ()=>{
 const st=translateDocument(qk,['Source file: MASTER-RESEARCH.md','Release: 1.2.0 (documentary consolidation)','What do you want to drink most often?','2) "Do you already own a grinder?" when that changes the parts',
  'Particle CADR: the clean air delivery rate for particles.'].join('\n\n'),{source:'d'}).statements;
 assert.equal(st.length,1);assert.equal(st[0].type,'definition');assert.match(st[0].quote,/^Particle CADR/);
});

test('R3 cycle 2: a not_sufficient statement makes a taught measurement inform an outcome only, with its quote and scope', ()=>{
 const teach={measurements:[
  {concept:concept('empty_run_energy'),outcomes:[{outcome:'energy_per_cooked_meal',relation:'r1'},{outcome:'standby_cost',relation:'r2'}]},
  {concept:concept('cooking_energy_per_load'),outcomes:[{outcome:'energy_per_cooked_meal',relation:'r3'}]}]};
 const st=translateDocument(qk,'## Energy\n\nEmpty-run energy does not establish energy per cooked meal when the basket is loaded.',{source:'d'}).statements;
 const d=deriveSufficiency(st,teach);
 assert.equal(d.length,1);assert.equal(d[0].relation,'r1');assert.equal(d[0].sufficiency,'informs_only');
 assert.equal(d[0].evidence[0].line,3);assert.ok(d[0].evidence[0].scope.some(x=>/when the basket is loaded/.test(x)));assert.ok(d[0].evidence[0].scope.includes('Energy'));
 // the affirmative sentence derives nothing (metamorphic), and silence derives nothing
 assert.equal(deriveSufficiency(translateDocument(qk,'Empty-run energy establishes energy per cooked meal.',{source:'d'}).statements,teach).length,0);
 assert.equal(deriveSufficiency([],teach).length,0);
 // a statement whose rendering failed the self-check is not read
 assert.equal(deriveSufficiency(st.map(s=>({...s,selfCheck:['negation_lost']})),teach).length,0);
});

test('R3 cycle 2: identification is the unique best match; a tie or a weak match decides nothing', ()=>{
 const cs=[{id:'sleep_mode_noise'},{id:'top_speed_noise'},{id:'filter_cost'}];
 assert.equal(identifyConcept('noise in sleep mode',cs),'sleep_mode_noise');
 assert.equal(identifyConcept('the noise',cs),null);
 assert.equal(identifyConcept('annual filter replacement cost',cs),'filter_cost');
 assert.equal(identifyConcept('mode speed noise',[{id:'sleep_mode_noise'},{id:'top_speed_noise'}]),null,'a tie');
});

test('R3 cycle 2: a typed not_sufficient statement is a proxy limit that qualifies matching values within its scope', ()=>{
 const st=translateDocument(qk,['A particle CADR cannot establish protection from second-hand smoke gases.','Brand reputation does not establish reliability.'].join('\n\n'),{source:'d'}).statements;
 const ls=proxyLimits(qk,st);
 assert.equal(ls.length,1,'only the statement whose subject is a typed quantity');assert.deepEqual(ls[0].metrics,['cadr']);
 const v=(metric:string|null,kind:string|null,label:string,conditions:{axis:string;value:string}[]=[])=>({metric,kind,label,conditions});
 assert.equal(applicableLimits(ls,v('cadr','volumetric_flow_rate','Smoke CADR')).length,1);
 assert.equal(applicableLimits(ls,v('free_airflow','volumetric_flow_rate','Airflow')).length,0,'another metric of the same kind');
 assert.equal(applicableLimits(ls,v(null,'power','Power')).length,0);
 // scope: a statement about the sleep setting does not apply to a value stated at top speed
 const sl=proxyLimits(qk,translateDocument(qk,'A CADR at sleep mode cannot establish whole-room cleaning.',{source:'d'}).statements);
 assert.equal(sl.length,1);assert.ok(sl[0].axes.some(a=>a.axis==='fan_setting'));
 assert.equal(applicableLimits(sl,v('cadr','volumetric_flow_rate','CADR',[{axis:'fan_setting',value:'top'}])).length,0);
 assert.equal(applicableLimits(sl,v('cadr','volumetric_flow_rate','CADR',[{axis:'fan_setting',value:'sleep'}])).length,1);
 // a limit whose rendering failed the self-check is not used
 assert.equal(proxyLimits(qk,st.map(s=>({...s,selfCheck:['negation_lost']}))).length,0);
});

test('R3 cycle 2: a limit is about the head of its subject, not a quantity mentioned on the way (dev review of the first applicability run)', ()=>{
 assert.equal(subjectHead('OLED burn-in in static repeated high-brightness imagery'),'OLED burn-in');
 assert.equal(subjectHead('Panel area and luminance settings may all alter kWh. kWh per 1000 hours'),'kWh per 1000 hours');
 assert.equal(subjectHead('Without the source assumptions and actual CADR/room height, coverage figures'),'coverage figures');
 assert.equal(subjectHead('a particle-only CADR'),'a particle-only CADR');
 const ls=proxyLimits(qk,translateDocument(qk,'OLED burn-in in static high-brightness imagery does not imply the same effect in ordinary viewing.',{source:'d'}).statements);
 assert.equal(ls.length,0,'burn-in is not a luminance value');
});

test('R3 cycle 3: what a phrase denotes is checked before identity; retrieval decides nothing', ()=>{
 assert.equal(denotationOf(qk,'the declared CADR on the box'),'claim_or_label');
 assert.equal(denotationOf(qk,'a smoke CADR test'),'measurement_or_test');
 assert.equal(denotationOf(qk,'independent laboratory studies'),'source_or_evidence');
 assert.equal(denotationOf(qk,'the sleep mode'),'product_feature');
 assert.equal(denotationOf(qk,'a clinical benefit'),'outcome');
 const pool=[{id:'fine_particle_reduction',kind:'outcome',statement:'Lower fine particle levels in the room.'},{id:'particle_cadr_test',kind:'measurement',statement:'CADR for particles.'}];
 assert.ok(retrieveConcepts('a declared particle CADR',pool).length>0,'retrieval is liberal');
 // a declaration shares words with a measurement concept but is not that measurement
 const a=alignWithType(qk,'a declared particle CADR',pool);assert.equal(a.status,'unresolved');assert.equal(a.denotes,'claim_or_label');
 assert.ok(a.candidates.every(c=>c.match!=='close'&&c.match!=='exact'));
});

test('R3 cycle 3: a limit about declarations qualifies declared values only; one about measurements, measured values only', ()=>{
 const st=translateDocument(qk,['Advertised litres alone cannot establish usable cooking capacity.','A measured particle CADR does not establish gas removal.'].join('\n\n'),{source:'d'}).statements;
 const ls=proxyLimits(qk,st);
 const decl=ls.find(l=>l.quote.startsWith('Advertised'))!,meas=ls.find(l=>l.quote.startsWith('A measured'))!;
 assert.equal(decl.appliesTo,'declared');assert.equal(meas.appliesTo,'measured');
 const v=(metric:string|null,kind:string|null,label:string,evidenceClass:string|null)=>({metric,kind,label,conditions:[],evidenceClass});
 assert.equal(applicableLimits([decl],v(null,'volume','Capacity litres','manufacturer_declared')).length,1);
 assert.equal(applicableLimits([decl],v(null,'volume','Capacity litres','publisher_measured')).length,0,'a measured volume is not a declaration');
 assert.equal(applicableLimits([meas],v('cadr','volumetric_flow_rate','CADR','publisher_measured')).length,1);
 assert.equal(applicableLimits([meas],v('cadr','volumetric_flow_rate','CADR','manufacturer_declared')).length,0);
 // unknown role: not applied, and counted
 const sk={role:0};assert.equal(applicableLimits([meas],v('cadr','volumetric_flow_rate','CADR','unknown'),sk).length,0);assert.equal(sk.role,1);
 // audit S77: a value whose role is not given is not qualified by a role-restricted limit either
 assert.equal(applicableLimits([meas],{metric:'cadr',kind:'volumetric_flow_rate',label:'CADR',conditions:[]}).length,0);
});

test('R3 cycle 3: document concepts keep what the store cannot name, with related links only', ()=>{
 const pool=[{id:'fine_particle_reduction',kind:'outcome',statement:'Lower fine particle levels.'}];
 const st=translateDocument(qk,'A dual-zone demonstration does not establish independent zone accuracy.',{source:'d'}).statements;
 const dc=documentConcepts(qk,st,pool);
 assert.ok(dc.length>=1);assert.ok(dc.every(d=>!d.related.includes('fine_particle_reduction')||d.denotes!=='outcome'));
 assert.ok(dc.some(d=>/dual-zone demonstration/i.test(d.head)));
});

test('R3 cycle 3: distributional similarity from a corpus ranks related words; it is relatedness, not identity', ()=>{
 const texts=['smoke particles and aerosol in the room air','aerosol particles reduce with filtration','pollen and dust particles trigger allergy','dust pollen and allergen particles','coffee extraction depends on grind size','grind size and coffee extraction time'];
 const m=trainDistributional(Array(3).fill(texts).flat(),{minCount:2});
 assert.ok(wordSimilarity(m,'aerosol','smoke')>wordSimilarity(m,'aerosol','coffee'));
 assert.equal(wordSimilarity(m,'unknownword','dust'),0);
 assert.ok(phraseSimilarity(m,'dust particles','pollen particles')>phraseSimilarity(m,'dust particles','coffee grind'));
});

// Audit S77: regression tests for verified defects (inputs from the independent review A3).
const tr=(t:string)=>translateDocument(qk,t,{source:'d'}).statements;
test('audit S77: a negated or hedged relation keeps its polarity and hedge; a contrast in the object is two statements', ()=>{
 const a=tr('High airflow does not increase filter life.');assert.equal(a.length,1);assert.equal(a[0].type,'increases');assert.equal(a[0].polarity,'negative');assert.deepEqual(a[0].selfCheck,[]);
 assert.equal(tr('Noise does not depend on fan speed.')[0].polarity,'negative');
 const h=tr('Humidity rarely affects drying time.')[0];assert.equal(h.polarity,'positive');assert.equal(h.hedge,'rarely');
 const c=tr('Water hardness affects scale, not taste.');assert.deepEqual(c.map(x=>[x.object!.text,x.polarity]),[['scale','positive'],['taste','negative']]);assert.ok(c.every(x=>!x.selfCheck.length));
 const n=tr('Brewing time affects neither taste nor strength.')[0];assert.equal(n.polarity,'negative');assert.deepEqual(n.selfCheck,[]);
 // metamorphic: the affirmative is positive
 assert.equal(tr('Higher airflow increases removal.')[0].polarity,'positive');
});
test('audit S77: a relation word in noun or adjective position is not a relation', ()=>{
 for(const t of ['Noise limits apply at night.','Filter changes are needed every year.','Thermal power, air delivery and temperature control are interacting variables.','A different small model with lower rating may still cook its smaller load.','State of charge is shown on the display.'])
  assert.ok(!tr(t).some(s=>['depends_on','increases','decreases','requires','method_step'].includes(s.type)),t);
});
test('audit S77: "A is B, not C" is a contrastive correction and a proxy limit when A is a typed quantity', ()=>{
 const s=tr('Rated watts are an electrical specification, not proof of quality.');assert.equal(s[0].type,'is_not');assert.match(s[0].rendered,/not proof of quality/);
 assert.equal(proxyLimits(qk,s).length,1);
});
test('audit S77: stemming joins inflections and keeps distinct words apart', ()=>{
 for(const [a,b] of [['speeds','speed'],['drying','dry'],['measured','measure'],['modes','mode'],['heating','heat']])assert.equal(stem(a),stem(b),a);
 for(const [a,b] of [['condenser','condensation'],['humidity','humidifier'],['contrast','contract']])assert.notEqual(stem(a),stem(b),a);
});
test('audit S77: heads keep "of" complements; decimals are values, not versions; abbreviations do not end sentences', ()=>{
 assert.equal(subjectHead('The rate of moisture removal'),'The rate of moisture removal');
 assert.equal(subjectHead('Conversely, removing odour'),'removing odour');
 assert.equal(tr('Drying time: 2.5 hours per load.').length,1);
 assert.deepEqual(clauses('Coverage (see Fig. 3) does not establish removal. Use a filter, e.g. HEPA.'),['Coverage (see Fig. 3) does not establish removal','Use a filter, e.g. HEPA']);
});
test('audit S77: a table header that states a relation is read with the row subject', ()=>{
 const s=tr('| Measure | Does not establish |\n|---|---|\n| Particle CADR | gas removal |');
 assert.ok(s.some(x=>x.type==='not_sufficient'&&!x.selfCheck.length&&/Particle CADR/.test(x.rendered)));
});
test('audit S77: condition acquisition is case-insensitive and keeps values never stated together apart', ()=>{
 const two=['aged_filter_cadr','new_filter_cadr'].map(id=>describeMeasurement(qk,concept(id)));
 const ps=acquireConditionAxes(qk,[{source:'d',md:'Compare new versus aged filters.\nFit HEPA/carbon filters.\n- Filter condition: new | aged'}],distinctionQuestions(two));
 const merged=ps.find(p=>'hepa' in p.values&&'aged' in p.values);assert.equal(merged,undefined,'new/aged and hepa/carbon are not one axis');
});
test('audit S77 (regression of the first fix): plural table headers keep their role; a relative "that" before a verb is not a determiner', ()=>{
 const s=tr('| Technology | Risks and limitations |\n|---|---|\n| UV-C lamp | ozone and lamp exposure risks |');
 assert.ok(s.some(x=>x.type==='limitation'&&/UV-C lamp/.test(x.rendered)),'"limitations" is the limitation role');
 assert.ok(tr('Whole-bird geometry and drippings that require separate testing.').some(x=>x.type==='requires'));
 // a rejected relation word does not hide a later one in the same clause
 assert.ok(tr('Filter control knob placement affects reach.').some(x=>x.type==='depends_on'&&/reach/.test(x.object?.text??'')));
});
test('audit S77: "by itself" is rendered only when the source says it', ()=>{
 assert.ok(tr('Particle CADR does not establish gas removal.').some(x=>x.type==='not_sufficient'&&!/by itself/.test(x.rendered)));
 assert.ok(tr('Particle CADR does not by itself establish gas removal.').some(x=>x.type==='not_sufficient'&&/by itself/.test(x.rendered)));
});
test('audit S78: nouns and adjectives are not relation verbs; questions are not claims; the main verb wins; consumed modals are hedges', ()=>{
 const rel=(t:string)=>tr(t).filter(s=>['depends_on','increases','decreases','requires'].includes(s.type));
 for(const t of ['Filter change, contact with dust, app privacy, control offline.',
  'Track access changes separately from truth changes.','Cannot assume Bluetooth control works remotely.','Estimate difference from control with confounders.',
  'Avoid treating changes in outdoor background pollution as device causality.','REL-B: lower electricity per task for the tested small chip job.',
  'Source/entry controls plus bounded smoke-particle CADR.'])assert.deepEqual(rel(t).map(s=>s.type),[],t);
 assert.deepEqual(tr('Do physical control buttons retain the manual fan speed?'),[],'a question is not a claim');
 assert.equal(rel('Different mechanisms require different control recipes.')[0].type,'requires');
 const h=rel('Charge can increase removal.')[0];assert.equal(h.type,'increases');assert.equal(h.hedge,'can');
 // controls: verbs with evidence stay relations
 for(const [t,ty] of [['Larger baskets increase capacity.','increases'],['Oven-safe containers change the task.','depends_on'],['Stacking changes contact and airflow.','depends_on'],
  ['High airflow does not increase filter life.','increases']] as const)assert.equal(rel(t)[0]?.type,ty,t);
});
test('audit S78: records, code blocks and source lists are not knowledge; evidence-requirement columns are requirements', ()=>{
 const doc=['# Package','','```yaml','id: suspendedparticles','relevantmeasure: deviceCADR','```','','## Sources','','1. 750g / A. Writer (2026-04-12), liners and airflow','',
  '## Cards','','- Type: Consumer organisation','- Type: Chef interview','- Type: Broadcaster feature','','## Terms','','- CADR: the clean air delivery rate of the whole device at a stated mode.',
  '','| Dish | Verification needed |','|---|---|','| Japchae | Evaluate full workflow and texture |'].join('\n');
 const s=translateDocument(qk,doc,{source:'d'}).statements;
 assert.ok(!s.some(x=>/suspendedparticles|relevantmeasure|750g|Consumer organisation/.test(x.quote)),s.map(x=>x.quote).join(' | '));
 assert.ok(s.some(x=>x.type==='definition'&&/^CADR/.test(x.quote)),'a term with a definition stays a definition');
 assert.ok(s.some(x=>x.type==='requires'&&/Japchae/.test(x.rendered)),'an evidence-requirement column is a requirement');
 assert.ok(!s.some(x=>x.type==='bears_on_outcome'));
});
