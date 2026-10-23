import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadQuantityKnowledge,type TypedQuantity} from '../src/quantity_knowledge.js';
import {describeMeasurement,linkValues,loadLinkRules,type TeachingView,type LinkValue} from '../src/knowledge_link.js';
import type {RuleSet} from '../src/knowledge_rules.js';

// R2 (owner S68): typed link of values to taught measurements, graded evidential force. Synthetic teaching and values.
const qk=loadQuantityKnowledge();
const q=(o:{kind?:string|null;candidates?:string[];metric?:string|null;conditions?:[string,string][];missing?:string[]}):TypedQuantity=>({
 surface:'',value:1,unit:{} as TypedQuantity['unit'],si:null,
 kind:{id:o.kind??null,candidates:o.candidates??[],basis:[],justification:{type:'unit' as never,from:null,evidence:[],ref:null,rules:[],derivation:[]}},
 metric:{id:o.metric??null,candidates:[],basis:[]},weighting:null,reference:null,
 conditions:(o.conditions??[]).map(([axis,value])=>({axis,value,raw:value,from:'labels' as const})),missingConditions:o.missing??[],unresolved:[],knowledge:'test',
 source:null,protocol:null,cohort:null,product:null,contextScope:null});
// S71: by default a value comes from one identified test of its source; tests that need otherwise say so
const v=(id:string,o:Parameters<typeof q>[0],product='Acme P1',source='doc-1',test:string|null='test-1'):LinkValue=>({id,quantity:q(o),product,source,test});
const concept=(id:string,statement='Measured as stated.')=>({id,statement,aliases:[]});
type M=TeachingView['measurements'][number];
const meas=(id:string,outcomes:[string,'direct'|'partial'|'unverified'][],extra:Partial<M>={}):M=>({concept:concept(id),outcomes:outcomes.map(([outcome,force])=>({outcome,force,relation:'r_'+id+'_'+outcome})),indirectFor:[],conditions:[],...extra});
const view=(ms:M[]):TeachingView=>({category:'test',measurements:ms,basis:{items:ms.length,relations:0,forceOverlay:null}});
const res=(r:ReturnType<typeof linkValues>,id:string)=>r.results.find(x=>x.value===id)!;
const PAIRING=concept('same_mode_pairing','Condition: compared only when measured at the same fan setting.');
const PURIFIER=view([meas('particle_cadr_by_pollutant_and_mode',[['fine_particle_reduction','partial']]),meas('pollen_dust_cadr_at_sleep_mode',[['allergen_particle_reduction','partial']]),
 meas('room_volume_equivalent_ach',[['room_coverage','partial']]),meas('power_by_fan_setting',[['energy_cost','direct']],{conditions:[PAIRING]})]);

test('R2 translation: a taught measurement becomes a typed descriptor with the words it came from', ()=>{
 const d=describeMeasurement(qk,concept('pollen_dust_cadr_at_sleep_mode','Dust and pollen CADR re-measured at the quiet setting.'));
 assert.ok(d.measurands.some(m=>m.metric==='cadr'&&m.level==='head'));
 assert.deepEqual(d.fixed.map(f=>f.axis+'='+f.value).sort(),['challenge_pollutant=dust','challenge_pollutant=pollen','fan_setting=sleep']);
 // a leading preposition does not empty the measurand ("in situ sound level trace")
 assert.ok(describeMeasurement(qk,concept('in_situ_sound_level_trace')).measurands.length>0);
 // what PEE cannot type is reported, not guessed
 assert.ok(describeMeasurement(qk,concept('sustained_sdr_luminance')).untyped.includes('sdr'));
 // an axis named only by a requires_condition statement must be named by the axis itself, not by a loose cue
 const t=describeMeasurement(qk,concept('hdr_luminance_by_window_and_duration'),[concept('luminance_metadata','Condition: keep window %, ambient sensor, firmware.')]);
 assert.ok(t.axes.some(a=>a.axis==='window_size'));assert.ok(!t.axes.some(a=>a.axis==='inlet_air_state'));
});

test('R2 link: the metric level is the most specific; a value of another metric is not linked; outside the teaching is reported', ()=>{
 const r=linkValues(qk,PURIFIER,[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','top'],['challenge_pollutant','smoke']]}),
  v('b',{kind:'volumetric_flow_rate',metric:'free_airflow'}),v('c',{kind:'duration'})]);
 assert.equal(res(r,'a').status,'linked');assert.deepEqual(res(r,'a').measurements,['particle_cadr_by_pollutant_and_mode']);
 assert.equal(res(r,'b').status,'no_taught_measurement');
 assert.equal(res(r,'c').status,'no_taught_measurement');
 assert.ok(res(r,'a').derivation.some(l=>l.includes('L5')));
});

test('R2 link: a candidate that would assume an unstated condition is not preferred; changing the mode changes the link (metamorphic)', ()=>{
 const top=linkValues(qk,PURIFIER,[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','top'],['challenge_pollutant','dust']]})]);
 assert.deepEqual(res(top,'a').measurements,['particle_cadr_by_pollutant_and_mode']);
 // the same value at sleep: lk.6 chooses the candidate whose fixed conditions (sleep, dust) the value states
 const sleep=linkValues(qk,PURIFIER,[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','sleep'],['challenge_pollutant','dust']]})]);
 assert.equal(res(sleep,'a').status,'linked');assert.deepEqual(res(sleep,'a').measurements,['pollen_dust_cadr_at_sleep_mode']);
 // lk.1-lk.5 left it ambiguous (reproduction)
 const lk5=JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/link-rules.v5.json',import.meta.url),'utf8'));
 assert.equal(res(linkValues(qk,PURIFIER,[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','sleep'],['challenge_pollutant','dust']]})],{rules:lk5}),'a').status,'ambiguous');
 // with no other candidate, the link assumes the unstated condition and cannot assess
 const only=linkValues(qk,view([PURIFIER.measurements[1]]),[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['challenge_pollutant','dust']]})]);
 assert.equal(res(only,'a').status,'linked_condition_not_shown');
 assert.ok(res(only,'a').evidence.length>0&&res(only,'a').evidence.every(e=>e.force==='conditions_not_shown'));
});

test('R2 link: competing candidates with the same consequences are immaterial; with different ones the value stays ambiguous', ()=>{
 const same=view([meas('cadr_a',[['o1','partial']]),meas('cadr_b',[['o1','partial']])]);
 const r=linkValues(qk,same,[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','top'],['challenge_pollutant','smoke']]})]);
 assert.equal(res(r,'a').status,'linked_equivalent');assert.deepEqual(res(r,'a').measurements,['cadr_a','cadr_b']);
 const diff=view([meas('cadr_a',[['o1','partial']]),meas('smoke_cadr_b',[['o2','partial']])]);
 const r2=linkValues(qk,diff,[v('a',{kind:'volumetric_flow_rate',metric:'cadr'}),v('b',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['challenge_pollutant','smoke']]})]);
 // 'a' states no pollutant: only cadr_a assumes nothing
 assert.deepEqual(res(r2,'a').measurements,['cadr_a']);
 // 'b' states smoke: lk.6 chooses the candidate that fixes smoke
 assert.deepEqual(res(r2,'b').measurements,['smoke_cadr_b']);
 // two candidates that both fit what the value states, with different consequences, stay ambiguous
 const both=view([meas('cadr_a',[['o1','partial']]),meas('cadr_c',[['o2','partial']])]);
 assert.equal(res(linkValues(qk,both,[v('b',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['challenge_pollutant','smoke']]})]),'b').status,'ambiguous');
 // a value stating no pollutant against two candidates that both fix one: the deciding axis is named
 const fixed=view([meas('smoke_cadr_x',[['o1','partial']]),meas('dust_cadr_y',[['o2','partial']])]);
 const r3=linkValues(qk,fixed,[v('c',{kind:'volumetric_flow_rate',metric:'cadr'})]);
 assert.equal(res(r3,'c').status,'ambiguous');assert.deepEqual(res(r3,'c').decidingAxes,['challenge_pollutant']);
});

test('R2 evidence: graded force (direct, partial, indirect, conditions not shown) and what it allows per outcome', ()=>{
 const t=view([meas('power_by_fan_setting',[['energy_cost','direct']],{conditions:[PAIRING]}),
  meas('equivalent_ach',[['room_coverage','partial']],{indirectFor:['clean_breathing_zone']})]);
 const r=linkValues(qk,t,[v('p',{kind:'power',conditions:[['fan_setting','sleep']]}),v('np',{kind:'power'},'Acme P2'),v('ach',{kind:'air_change_rate',conditions:[['fan_setting','top']]})]);
 assert.deepEqual(res(r,'p').evidence.map(e=>e.force),['direct']);
 assert.deepEqual(res(r,'np').evidence.map(e=>e.force),['conditions_not_shown']);
 assert.deepEqual(res(r,'ach').evidence.map(e=>e.force).sort(),['indirect','partial']);
 const a=(p:string,o:string)=>r.outcomes.find(x=>x.product===p&&x.outcome===o)?.assessment;
 assert.equal(a('Acme P1','energy_cost'),'direct_evidence');assert.equal(a('Acme P2','energy_cost'),'relevant_conditions_not_shown');
 assert.equal(a('Acme P1','room_coverage'),'partial_contributions');assert.equal(a('Acme P1','clean_breathing_zone'),'indirect_only');
 // a metric's own required condition, missing from the value, also keeps it from assessing
 const m=linkValues(qk,PURIFIER,[v('c',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','top']],missing:['challenge_pollutant']})]);
 assert.deepEqual(res(m,'c').evidence.map(e=>e.force),['conditions_not_shown']);
 assert.equal(r.rankingInput,false);
});

test('R2 evidence: every contributing measurement the teaching lists, from two measurements, versus only some', ()=>{
 const t=view([meas('cadr_x',[['o','partial']]),meas('mode_power_x',[['o','partial']])]);
 const both=linkValues(qk,t,[v('c',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','top'],['challenge_pollutant','smoke']]}),v('w',{kind:'power'})]);
 assert.equal(both.outcomes.find(o=>o.outcome==='o')?.assessment,'all_listed_contributions');
 const one=linkValues(qk,t,[v('w',{kind:'power'})]);
 assert.equal(one.outcomes.find(o=>o.outcome==='o')?.assessment,'partial_contributions');
});

test('R2 metamorphic: renaming the product keeps every link and force; removing the only support withdraws the conclusion', ()=>{
 const vals=[v('p',{kind:'power',conditions:[['fan_setting','sleep']]})];
 const a=linkValues(qk,PURIFIER,vals),b=linkValues(qk,PURIFIER,vals.map(x=>({...x,product:'Zeta Z9'})));
 assert.deepEqual(a.results.map(r=>[r.status,r.measurements,r.evidence]),b.results.map(r=>[r.status,r.measurements,r.evidence]));
 assert.deepEqual(a.outcomes.map(o=>[o.outcome,o.assessment]),b.outcomes.map(o=>[o.outcome,o.assessment]));
 assert.ok(a.outcomes.length>0);
 const withdrawn=view(PURIFIER.measurements.map(m=>m.concept.id==='power_by_fan_setting'?{...m,outcomes:[]}:m));
 const c=linkValues(qk,withdrawn,vals);
 assert.equal(res(c,'p').status,'linked');assert.deepEqual(res(c,'p').evidence,[]);assert.equal(c.outcomes.length,0);
});

test('R2 rules: no link without a candidate, no direct or partial force without its conditions (shape over the rule set)', ()=>{
 const rs=JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/link-rules.v6.json',import.meta.url),'utf8')) as RuleSet;
 loadLinkRules(rs);
 const rules=rs.programs.flatMap(p=>p.rules);
 for(const r of rules.filter(r=>/^linked(_equivalent)?\(/.test(r.rule)))assert.match(r.rule,/:- (chosen|assumed)\(/,r.id);
 for(const r of rules.filter(r=>/^(chosen|assumed)\(/.test(r.rule)))assert.match(r.rule,/(best_pref|preferred|cand|partition_member)\(/,r.id);
 assert.match(rules.find(r=>r.id==='E4')!.rule,/conditions_ok\(V,M\)/);
 // S70: no rule grants direct force through a measurement PEE cannot fully read
 for(const r of rules.filter(r=>/^(evidence_force\(V,O,direct|set_evidence\(P,O,direct)/.test(r.rule)))assert.match(r.rule,/not incomplete\(M\)/,r.id);
 for(const r of rules.filter(r=>/^outcome_assessment\(P,O,(direct_evidence|all_listed_contributions)\)/.test(r.rule)))assert.doesNotMatch(r.rule,/indirect|conditions_not_shown/,r.id);
});

// S69 (owner, 2026-10-19): one observation, several analytical uses; a set's relationship needs aligned observations.
const CURVE=view([meas('power_by_fan_setting',[['energy_cost','direct']],{conditions:[PAIRING]}),
 meas('cadr_noise_power_by_fan_setting',[['quiet_night_operation','direct']],{conditions:[PAIRING]}),
 meas('particle_cadr_by_pollutant_and_mode',[['fine_particle_reduction','partial']])]);
const at=(id:string,kind:string,setting:string,extra:Partial<Parameters<typeof q>[0]>={},product='Acme P1')=>v(id,{...extra,kind,conditions:[['fan_setting',setting],...(extra.conditions??[])],...(kind==='volumetric_flow_rate'?{metric:'cadr'}:{})},product);
const CADR=(id:string,s:string,more:[string,string][]=[])=>at(id,'volumetric_flow_rate',s,{conditions:[['challenge_pollutant','smoke'],...more]});

test('S69 one observation, several legitimate uses: it describes one measurement and is a member of a compatible set', ()=>{
 const r=linkValues(qk,CURVE,[at('w2','power','speed 2')]);
 const w=res(r,'w2');
 assert.equal(w.status,'linked');assert.deepEqual(w.measurements,['power_by_fan_setting']);assert.deepEqual(w.memberships,['cadr_noise_power_by_fan_setting']);
 assert.deepEqual(w.evidence.map(e=>e.measurement+':'+e.force).sort(),['cadr_noise_power_by_fan_setting:component_only','power_by_fan_setting:direct']);
});

test('S69 a standalone power value cannot establish a curve or the outcome the curve bears on', ()=>{
 const r=linkValues(qk,CURVE,[at('w2','power','speed 2')]);
 assert.deepEqual(r.relationships,[]);
 assert.equal(r.outcomes.find(o=>o.outcome==='quiet_night_operation'),undefined);
 assert.equal(r.outcomes.find(o=>o.outcome==='energy_cost')?.assessment,'direct_evidence');
});

test('S69 aligned observations support a point; incompatible settings or methods do not; two points support a partial relationship', ()=>{
 const aligned=linkValues(qk,CURVE,[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2')]);
 assert.deepEqual(aligned.relationships.map(x=>x.kind+':'+x.setting+':'+x.basis),['aligned_point:speed 2:same_test']);
 assert.equal(aligned.outcomes.find(o=>o.outcome==='quiet_night_operation')?.assessment,'direct_evidence');
 // incompatible operating conditions: the noise was measured at another setting
 const off=linkValues(qk,CURVE,[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n3','sound_pressure_level','speed 3')]);
 assert.deepEqual(off.relationships,[]);assert.equal(off.outcomes.find(o=>o.outcome==='quiet_night_operation'),undefined);
 // compatible setting, incompatible methods
 const meth=linkValues(qk,CURVE,[at('w2','power','speed 2',{conditions:[['method','lab a']]}),CADR('c2','speed 2',[['method','lab b']]),at('n2','sound_pressure_level','speed 2')]);
 assert.ok(!meth.relationships.some(x=>x.kind==='aligned_point'));assert.equal(meth.outcomes.find(o=>o.outcome==='quiet_night_operation'),undefined);
 // two aligned points: a partial relationship across settings (never "every setting")
 const two=linkValues(qk,CURVE,[at('w1','power','speed 1'),CADR('c1','speed 1'),at('n1','sound_pressure_level','speed 1'),at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2')]);
 assert.ok(two.relationships.some(x=>x.kind==='relationship_at_points'&&x.measurement==='cadr_noise_power_by_fan_setting'));
 // the same products' points are per product: another product's noise does not complete Acme's point
 const other=linkValues(qk,CURVE,[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2',{},'Zeta Z9')]);
 assert.deepEqual(other.relationships,[]);
});

test('S69 repeated use of one observation is not independent corroboration; one observation reported twice is one', ()=>{
 // outcome o: a single measurement and a set both contribute, and both use the same CADR observation
 const t=view([meas('particle_cadr_x',[['o','partial']]),meas('cadr_power_by_fan_setting',[['o','partial']],{conditions:[PAIRING]})]);
 const shared=linkValues(qk,t,[CADR('c2','speed 2'),at('w2','power','speed 2')]);
 assert.ok(shared.relationships.some(x=>x.kind==='aligned_point'));
 assert.equal(shared.outcomes.find(o=>o.outcome==='o')?.assessment,'partial_contributions');
 // the same figure printed in a table and in prose: one observation
 const twice=linkValues(qk,CURVE,[at('w2','power','speed 2'),at('w2b','power','speed 2')]);
 assert.deepEqual(twice.repeatedReports,[['w2','w2b']]);
 assert.equal(res(twice,'w2').observation,res(twice,'w2b').observation);
});

// S70 (owner review, 2026-10-19): provenance identifies an observation; compatibility must be shown; incomplete knowledge
// never authorises a direct conclusion.
test('S70 equal numbers from two sources are two observations; one figure printed twice in one source is one', ()=>{
 const two=linkValues(qk,CURVE,[at('w2','power','speed 2'),{...at('w2x','power','speed 2'),source:'doc-2'}]);
 assert.deepEqual(two.repeatedReports,[]);assert.notEqual(res(two,'w2').observation,res(two,'w2x').observation);
 const once=linkValues(qk,CURVE,[at('w2','power','speed 2'),at('w2b','power','speed 2')]);
 assert.deepEqual(once.repeatedReports,[['w2','w2b']]);
 // two independent sources of one partial outcome do corroborate (they share no observation)
 const t=view([meas('particle_cadr_x',[['o','partial']]),meas('power_by_fan_setting',[['o','partial']],{conditions:[PAIRING]})]);
 const ind=linkValues(qk,t,[CADR('c2','speed 2'),{...at('w2','power','speed 2'),source:'doc-2'}]);
 assert.equal(ind.outcomes.find(o=>o.outcome==='o')?.assessment,'all_listed_contributions');
});

test('S70 an aligned point needs shown compatibility: one source, or a method stated by every source; otherwise it stays explicitly unknown', ()=>{
 const mixed=[at('w2','power','speed 2'),{...CADR('c2','speed 2'),source:'doc-2'},at('n2','sound_pressure_level','speed 2')];
 const r=linkValues(qk,CURVE,mixed);
 assert.deepEqual(r.relationships.map(x=>x.kind),['compatibility_not_shown']);
 assert.equal(r.outcomes.find(o=>o.outcome==='quiet_night_operation'),undefined);
 const stated=linkValues(qk,CURVE,[at('w2','power','speed 2',{conditions:[['method','aham ac-1']]}),{...CADR('c2','speed 2',[['method','aham ac-1']]),source:'doc-2'},at('n2','sound_pressure_level','speed 2',{conditions:[['method','aham ac-1']]})]);
 assert.deepEqual(stated.relationships.map(x=>x.kind+':'+x.basis),['aligned_point:stated_method']);
 // a condition stated in two different free-text words (a filter state) is neither equal nor different: unknown, explicit
 const filter=linkValues(qk,CURVE,[at('w2','power','speed 2',{conditions:[['filter_state','new']]}),CADR('c2','speed 2',[['filter_state','aged']]),at('n2','sound_pressure_level','speed 2')]);
 assert.deepEqual(filter.relationships.map(x=>x.kind),['compatibility_not_shown']);
 // different values of a closed axis (a different challenge pollutant) are documented incompatible: no point at all
 const clash=linkValues(qk,CURVE,[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2',{conditions:[['challenge_pollutant','dust']]})]);
 assert.deepEqual(clash.relationships,[]);
});

test('S70/S71 a direct relation through a measurement PEE cannot fully read has unresolved force, not partial', ()=>{
 const t=view([meas('mode_power_and_tco',[['energy_cost','direct']],{conditions:[PAIRING]})]);
 const r=linkValues(qk,t,[at('w2','power','speed 2')]);
 assert.ok(r.descriptors[0].untyped.includes('tco'));
 assert.deepEqual(res(r,'w2').evidence.map(e=>e.force),['unresolved']);
 assert.equal(r.outcomes.find(o=>o.outcome==='energy_cost')?.assessment,'force_unresolved');
});

// S71 (owner review, 2026-10-19): positive compatibility; test identity; unresolved versus verified partial force.
const noTest=(x:LinkValue):LinkValue=>({...x,test:null});
test('S71 sharing a document is not a common protocol: without an identified test or a shared stated method there is no point', ()=>{
 const vals=[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2')];
 const none=linkValues(qk,CURVE,vals.map(noTest));
 assert.deepEqual(none.relationships.map(x=>x.kind),['compatibility_not_shown']);
 assert.equal(none.outcomes.find(o=>o.outcome==='quiet_night_operation'),undefined);
 // no source at all: still no compatibility (missing information is never compatibility)
 const nosrc=linkValues(qk,CURVE,vals.map(x=>({...x,source:null,test:null})));
 assert.deepEqual(nosrc.relationships.map(x=>x.kind),['compatibility_not_shown']);
 // positive: one identified test; metamorphic: renaming the source keeps the verdict, removing one test id withdraws it
 assert.deepEqual(linkValues(qk,CURVE,vals).relationships.map(x=>x.kind+':'+x.basis),['aligned_point:same_test']);
 assert.deepEqual(linkValues(qk,CURVE,vals.map(x=>({...x,source:'other-doc'}))).relationships.map(x=>x.kind+':'+x.basis),['aligned_point:same_test']);
 assert.deepEqual(linkValues(qk,CURVE,[noTest(vals[0]),vals[1],vals[2]]).relationships.map(x=>x.kind),['compatibility_not_shown']);
 // two tests of one document are not one protocol, unless they state the same method
 assert.deepEqual(linkValues(qk,CURVE,[vals[0],{...vals[1],test:'test-2'},vals[2]]).relationships.map(x=>x.kind),['compatibility_not_shown']);
 const m=(x:LinkValue,t:string):LinkValue=>({...x,test:t,quantity:{...x.quantity,conditions:[...x.quantity.conditions,{axis:'method',value:'aham ac-1',raw:'AHAM AC-1',from:'labels'}]}});
 assert.deepEqual(linkValues(qk,CURVE,[m(vals[0],'t1'),m(vals[1],'t2'),m(vals[2],'t3')]).relationships.map(x=>x.kind+':'+x.basis),['aligned_point:stated_method']);
});

test('S71 every condition the set requires must be stated by every member', ()=>{
 const t=view([meas('cadr_noise_power_by_fan_setting',[['quiet_night_operation','direct']],{conditions:[PAIRING,concept('distance_stated','Condition: noise is reported at a stated measurement distance.')]})]);
 const vals=[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2')];
 assert.deepEqual(linkValues(qk,t,vals).relationships.map(x=>x.kind),['compatibility_not_shown']);
 const all=vals.map(x=>({...x,quantity:{...x.quantity,conditions:[...x.quantity.conditions,{axis:'measurement_distance',value:'1 m',raw:'1 m',from:'labels' as const}]}}));
 assert.deepEqual(linkValues(qk,t,all).relationships.map(x=>x.kind),['aligned_point']);
});

test('S71 observation identity comes from the test: two tests with one number are two; one test reported twice is one; unknown is neither', ()=>{
 const twoTests=linkValues(qk,CURVE,[at('w2','power','speed 2'),{...at('w2b','power','speed 2'),test:'test-2'}]);
 assert.deepEqual(twoTests.repeatedReports,[]);assert.notEqual(res(twoTests,'w2').observation,res(twoTests,'w2b').observation);
 const oneTest=linkValues(qk,CURVE,[at('w2','power','speed 2'),at('w2b','power','speed 2')]);
 assert.deepEqual(oneTest.repeatedReports,[['w2','w2b']]);
 const unknown=linkValues(qk,CURVE,[noTest(at('w2','power','speed 2')),noTest(at('w2b','power','speed 2'))]);
 assert.deepEqual(unknown.repeatedReports,[]);assert.equal(res(unknown,'w2').observation,null);
 // contributions resting on unknown identities are not a complete set (independence not established)
 const t=view([meas('particle_cadr_x',[['o','partial']]),meas('power_by_fan_setting',[['o','partial']],{conditions:[PAIRING]})]);
 assert.equal(linkValues(qk,t,[CADR('c2','speed 2'),{...at('w2','power','speed 2'),source:'doc-2'}]).outcomes.find(o=>o.outcome==='o')?.assessment,'all_listed_contributions');
 assert.equal(linkValues(qk,t,[noTest(CADR('c2','speed 2')),{...at('w2','power','speed 2'),source:'doc-2'}]).outcomes.find(o=>o.outcome==='o')?.assessment,'partial_contributions');
});

test('S71 verified partial stays partial; unresolved never becomes direct; a complete translation keeps direct (metamorphic)', ()=>{
 const part=linkValues(qk,view([meas('mode_power_and_tco',[['energy_cost','partial']],{conditions:[PAIRING]})]),[at('w2','power','speed 2')]);
 assert.deepEqual(res(part,'w2').evidence.map(e=>e.force),['partial']);
 const unres=linkValues(qk,view([meas('mode_power_and_tco',[['energy_cost','direct']],{conditions:[PAIRING]})]),[at('w2','power','speed 2')]);
 assert.ok(!unres.outcomes.some(o=>o.assessment==='direct_evidence'));
 const typed=linkValues(qk,view([meas('power_by_fan_setting',[['energy_cost','direct']],{conditions:[PAIRING]})]),[at('w2','power','speed 2')]);
 assert.equal(typed.outcomes.find(o=>o.outcome==='energy_cost')?.assessment,'direct_evidence');
});

// S72 (owner review, 2026-10-19): a protocol is a procedure, not a run.
test('S72 one procedure supports compatibility but is never one observation: two runs of one protocol stay distinct', ()=>{
 const pr=(x:LinkValue,p:string|null='protocol:noise-from-1m',t:string|null=null):LinkValue=>({...x,test:t,protocol:p});
 const vals=[at('w2','power','speed 2'),CADR('c2','speed 2'),at('n2','sound_pressure_level','speed 2')].map(x=>pr(x));
 assert.deepEqual(linkValues(qk,CURVE,vals).relationships.map(x=>x.kind+':'+x.basis),['aligned_point:same_protocol']);
 // different procedures, no run, no method: not shown
 assert.deepEqual(linkValues(qk,CURVE,[vals[0],pr(vals[1],'protocol:other'),vals[2]]).relationships.map(x=>x.kind),['compatibility_not_shown']);
 // two values with one number under one protocol: not merged into one observation (identity unknown), not independent
 const two=linkValues(qk,CURVE,[pr(at('w2','power','speed 2')),pr(at('w2b','power','speed 2'))]);
 assert.deepEqual(two.repeatedReports,[]);assert.equal(res(two,'w2').observation,null);
 // a run identity, when known, still identifies: the same run reported twice is one
 const run=linkValues(qk,CURVE,[pr(at('w2','power','speed 2'),'protocol:p','run-7'),pr(at('w2b','power','speed 2'),'protocol:p','run-7')]);
 assert.deepEqual(run.repeatedReports,[['w2','w2b']]);
});

// R3: the most specific consistent candidate.
test('R3 lk.6 a candidate whose fixed condition the value states is chosen over one that fixes nothing; without the condition both stay', ()=>{
 const t=view([meas('sleep_cadr_by_pollutant',[['o1','partial']]),meas('cadr_by_pollutant',[['o2','partial']])]);
 // a hand-made descriptor fixing fan_setting=sleep on the first measurement
 const ds=t.measurements.map(m=>describeMeasurement(qk,m.concept,m.conditions));
 assert.ok(ds[0].fixed.some(f=>f.axis==='fan_setting'&&f.value==='sleep'));
 const atSleep=linkValues(qk,t,[v('c',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','sleep'],['challenge_pollutant','smoke']]})]);
 assert.deepEqual(res(atSleep,'c').measurements,['sleep_cadr_by_pollutant']);
 const none=linkValues(qk,t,[v('c',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['challenge_pollutant','smoke']]})]);
 assert.deepEqual(res(none,'c').measurements,['cadr_by_pollutant']); // the sleep one would assume an unstated condition
});

test('R3 lk.6 an unstated axis that partitions the candidates is the deciding question, not a reason to pick a third candidate', ()=>{
 const t=view([meas('sleep_cadr_by_pollutant',[['o1','partial']]),meas('max_speed_cadr_by_pollutant',[['o2','partial']]),meas('cadr_by_pollutant',[['o3','partial']])]);
 const r=linkValues(qk,t,[v('c',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['challenge_pollutant','smoke']]})]);
 assert.equal(res(r,'c').status,'ambiguous');assert.deepEqual(res(r,'c').decidingAxes,['fan_setting']);
 assert.deepEqual([...res(r,'c').measurements].sort(),['max_speed_cadr_by_pollutant','sleep_cadr_by_pollutant']);
 // stating the axis decides (metamorphic)
 const s2=linkValues(qk,t,[v('c',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['challenge_pollutant','smoke'],['fan_setting','top']]})]);
 assert.deepEqual(res(s2,'c').measurements,['max_speed_cadr_by_pollutant']);
});

test('R3 lk.6 a candidate that contradicts a stated condition neither partitions nor is chosen; one candidate fixing two values is no partition', ()=>{
 // dev review: a top-speed value was linked to the sleep-mode dust/pollen CADR because its two pollutant values "partitioned"
 const r=linkValues(qk,PURIFIER,[v('a',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','top']]})]);
 assert.notDeepEqual(res(r,'a').measurements,['pollen_dust_cadr_at_sleep_mode']);
 assert.ok(!res(r,'a').measurements.includes('pollen_dust_cadr_at_sleep_mode'));
 assert.ok(!(res(r,'a').decidingAxes??[]).includes('challenge_pollutant'));
});

test('R3 lk.6 candidates an unstated axis partitions stay ambiguous even when their consequences are equal', ()=>{
 const t=view([meas('sleep_cadr_by_pollutant',[['o1','partial']]),meas('max_speed_cadr_by_pollutant',[['o1','partial']])]);
 const r=linkValues(qk,t,[v('c',{kind:'volumetric_flow_rate',metric:'cadr'})]);
 assert.equal(res(r,'c').status,'ambiguous');assert.deepEqual(res(r,'c').decidingAxes,['fan_setting']);
});

test('R3 lk.6 a condition match does not choose a candidate whose name PEE cannot fully type', ()=>{
 // dev review: a measured eco-programme energy was linked to the EU-label per-100-cycles measurement on "eco" alone
 const t=view([meas('eu_label_kwh_per_100_eco_cycles',[['o1','partial']]),meas('wall_plug_kwh_per_programme',[['o2','partial']])]);
 const r=linkValues(qk,t,[v('e',{kind:'energy',conditions:[['programme','eco']]})]);
 assert.notEqual(res(r,'e').status,'linked');
 // a fully typed candidate is still chosen by its matched condition (metamorphic control)
 const t2=view([meas('pollen_dust_cadr_at_sleep_mode',[['o1','partial']]),meas('particle_cadr_by_pollutant_and_mode',[['o2','partial']])]);
 const r2=linkValues(qk,t2,[v('s',{kind:'volumetric_flow_rate',metric:'cadr',conditions:[['fan_setting','sleep'],['challenge_pollutant','dust']]})]);
 assert.deepEqual(res(r2,'s').measurements,['pollen_dust_cadr_at_sleep_mode']);
});
