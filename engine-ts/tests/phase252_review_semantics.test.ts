import test from 'node:test';import assert from 'node:assert/strict';
import {checkFaithfulness252,wordingSign252,type CheckedAtom252} from '../src/phase252_review_semantics.js';
// Phase252 T1 tests: synthetic sentences; faithfulness of an encoding to its span, never truth.
const A=(o:Partial<CheckedAtom252>={}):CheckedAtom252=>({variantId:'this_product',kind:'observation',polarity:'favorable',evidenceMode:'expert_judgement',epistemicStatus:'observed',conditionCodes:[],...o});
const V=['this_product','other_product'];
test('each bounded check rejects its distortion and accepts the faithful encoding',()=>{
 assert.deepEqual(checkFaithfulness252('lasts six hours unless Bluetooth is on',A(),V),['condition_dropped']);
 assert.deepEqual(checkFaithfulness252('lasts six hours unless Bluetooth is on',A({conditionCodes:['bluetooth_off']}),V),[]);
 assert.ok(checkFaithfulness252('The lid is not easy to clean',A(),V).includes('polarity_contradicts_wording'));
 assert.deepEqual(checkFaithfulness252('No complaints about the noise level',A(),V),[]);
 assert.ok(checkFaithfulness252('the maker claims 60 dB',A({kind:'measurement',evidenceMode:'direct_test'}),V).includes('attribution_promoted_to_observation'));
 assert.ok(checkFaithfulness252('Some users say it overheats',A({polarity:'unfavorable'}),V).includes('speculation_promoted_to_observation'));
 assert.ok(checkFaithfulness252('My old blender leaked',A({polarity:'unfavorable'}),V).includes('previous_product_attributed_to_this'));
 assert.deepEqual(checkFaithfulness252('My old blender leaked',A({variantId:'other_product',polarity:'unfavorable'}),V),[]);
 assert.ok(checkFaithfulness252('It is not louder than my previous vacuum',A({kind:'comparison',relation:{direction:'worse',targetVariantId:'other_product'}}),V).includes('comparison_direction_contradicts_wording'));
 assert.ok(checkFaithfulness252('The 1.7 litre version leaks',A({variantId:'variant_1_5_litre',polarity:'unfavorable'}),['variant_1_7_litre','variant_1_5_litre']).includes('span_names_other_variant'));
 assert.equal(wordingSign252('not as quiet as I hoped'),-1);
});
