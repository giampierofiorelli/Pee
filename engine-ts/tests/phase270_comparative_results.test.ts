import test from 'node:test';import assert from 'node:assert/strict';
import {comparativeResults270} from '../src/phase270_comparative_results.js';

// Phase270 §8. FICTIONAL documents written for this test (structures: result table, <br> list, first-person prose).
const page=(body:string)=>`<html><body>${body}</body></html>`;
const brief=(r:ReturnType<typeof comparativeResults270>['results'])=>r.map(x=>[x.appliance,x.dimension,x.value,x.unit,x.subject?.name??null]);

test('a result table: appliance rows, time/energy/cost columns kept apart; class rows resolved only by the document appliance list',()=>{
 const html=page(`<p>For our test we cooked the same dishes in both appliances and measured the energy in our laboratory.</p><h3>Roast vegetables</h3>
 <table><tr><th>Appliance</th><th>Cooking time</th><th>Energy used</th><th>Cost</th><th>Cooking quality</th></tr>
 <tr><td>Air fryer</td><td>31 mins</td><td>0.41kWh</td><td>11p</td><td>4* Even browning</td></tr>
 <tr><td>Built-in oven</td><td>47 mins</td><td>0.98kWh</td><td>26p</td><td>3* Patchy</td></tr></table>
 <p>We calculated costs at 26.5p per kWh.</p><p>We tested the Gamma Heat GH4000X built-in electric oven and the Zephyrine Crisp ZC300X air fryer.</p>`);
 const r=comparativeResults270(html,{testedClass:'air_fryer'}).results;
 assert.deepEqual(brief(r),[['air_fryer','duration',31,'minutes','Zephyrine Crisp ZC300X air fryer'],['air_fryer','energy',0.41,'kwh','Zephyrine Crisp ZC300X air fryer'],['air_fryer','cost',11,'p','Zephyrine Crisp ZC300X air fryer'],
  ['oven','duration',47,'minutes','Gamma Heat GH4000X'],['oven','energy',0.98,'kwh','Gamma Heat GH4000X'],['oven','cost',26,'p','Gamma Heat GH4000X']]);
 assert.ok(r.every(x=>x.form==='table_row'&&x.rankingInput===false));
 assert.ok(r.every(x=>x.subjectAssignment==='class_row_resolved_by_document_appliance_list'));
});

test('a <br> list per meal and first-person prose: attribution per clause; tariffs, prices, bounds, ranges and hypotheticals are not results',()=>{
 const html=page(`<p>I used my smart meter to measure the electricity, with nothing else on. I picked up the Nimbus Duo Air Fryer for £117.45.</p>
 <p>Meal 1: Fish fingers<br>Oven &ndash; 28min, 21 cents<br>Air fryer &ndash; 14 min, 6 cents</p>
 <p>We cooked two jacket potatoes in the air fryer for 45 minutes at a cost of 12p, or 0.31kwh. But in the oven the same potatoes cost 30p and took 65 minutes.</p>
 <p>Toast took seven minutes under the grill for 5p, compared to four minutes in the air fryer for 2p.</p>
 <p>The oven takes at least 10 minutes to heat up at a cost of 9p to 14p. If you cooked this every day you would save around £20 a year. The grill uses 2,000W.</p>`);
 const r=comparativeResults270(html,{testedClass:'air_fryer'}).results;
 assert.deepEqual(brief(r).map(x=>x.slice(0,4)),[['oven','duration',28,'minutes'],['oven','cost',21,'cents'],['air_fryer','duration',14,'minutes'],['air_fryer','cost',6,'cents'],
  ['air_fryer','duration',45,'minutes'],['air_fryer','cost',12,'p'],['air_fryer','energy',0.31,'kwh'],['oven','cost',30,'p'],['oven','duration',65,'minutes'],
  ['grill','duration',7,'minutes'],['grill','cost',5,'p'],['air_fryer','duration',4,'minutes'],['air_fryer','cost',2,'p']]);
 assert.ok(r.filter(x=>x.appliance==='air_fryer').every(x=>x.subject?.name==='Nimbus Duo Air Fryer'&&x.subjectAssignment==='document_tested_product'));
});

test('no first-person measurement, or a single-appliance review, yields nothing',()=>{
 assert.deepEqual(comparativeResults270(page('<p>A 1500W air fryer used for one hour will use 1.5 kWh, which at 34p per kWh is 51p. An oven of 3000W costs more.</p>')).results,[]);
 assert.deepEqual(comparativeResults270(page('<p>I measured its electricity usage with a power meter: 0.48kwh in one hour, 13p at a unit cost of 26.11p, in the air fryer.</p>')).results,[]);
});
