import test from 'node:test';import assert from 'node:assert/strict';
import {probeTransientTestContent225} from '../src/phase225_transient_test_probe.js';
import {TEST_LEAD_EXTRACTOR265} from '../src/phase265_test_measurements.js';

// S83 (owner review of S82, condition 3): fix Phase225 negation before its condition codes gain evidential weight.
// Fictional protocol paragraphs. Probe v2 read every "empty" and "preheat" as a stated condition; v3 must not read a
// negated condition or "empty" used as a verb, and must still read a stated one (recovery of justified conclusions).
const review=(protocol:string)=>`<html><head><meta property="og:type" content="article" /></head><body><h1>Fictional Fryer review</h1>`+
 `<h2>How I tested the fryer</h2><p>${protocol}</p><p>One hour&rsquo;s usage at 200&deg;C consumed 0.512 kWh of electricity.</p></body></html>`;
const codes=(protocol:string)=>{const c=probeTransientTestContent225(review(protocol),'https://www.fryerlab.test/reviews/x',{productLeads:[{name:'X',model:null,sku:null}]}).candidates;
 assert.equal(c.length,1);return c[0].documentProtocolCodes;};
test('S83 Phase225 probe v3: a stated empty run is still read',()=>{
 assert.deepEqual(codes('Before any cooking, I test the power consumption by running it empty for 1 hour at 200&deg;C, using a plug-in power meter.'),
  ['duration_1h','load_empty','power_meter','setpoint_c']);
 assert.deepEqual(codes('I test the power consumption for 1 hour at 200&deg;C with a plug-in power meter, including a preheat, with the drawer empty.'),
  ['duration_1h','includes_preheat','load_empty','power_meter','setpoint_c']);
});
test('S83 Phase225 probe v3: negated conditions and "empty" as a verb are not conditions (v2 read both)',()=>{
 assert.deepEqual(codes('Before any cooking, I test the power consumption for 1 hour at 200&deg;C with a plug-in power meter. There is no need to preheat. Empty the basket after use.'),
  ['duration_1h','power_meter','setpoint_c']);
 assert.deepEqual(codes('I test the power consumption for 1 hour at 200&deg;C with a plug-in power meter, with the basket not empty, without preheating.'),
  ['duration_1h','power_meter','setpoint_c']);
});
test('S83: stored rows name the probe version that read their codes',()=>{
 // S86: probe v4 (S83 introduced v3)
 assert.match(TEST_LEAD_EXTRACTOR265,/^pee225-probe\.v4\+/);
});
