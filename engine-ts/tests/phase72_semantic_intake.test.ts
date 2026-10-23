import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acquireSuggestedCategoryEvidence,type EphemeralSemanticSuggestion,type LocalSemanticAdapter} from '../src/phase72_semantic_intake.js';
import type {WebCandidate,WebSourcePolicy} from '../src/web_evidence_acquisition.js';
import type {CategoryFieldRegistry} from '../src/category_evidence_matrix.js';
import type {SourceTransport} from '../src/approved_web_reader.js';
const now='2026-10-10T19:00:00Z';
const text='Voices remain clear in shared offices. A second paragraph with separate methodological context.';
const candidate:WebCandidate={id:'independent_review',sourceId:'licensed_editorial',
 url:'https://review.testing.org/reviews/headset-one',exactVariantId:'headset_one',
 originalTestId:'test_headset_one',lineageAttestationReference:'review_reference_for_lineage',
 kind:'original_editorial_assessment',publishedAt:null,updatedAt:null,metadataOrigin:'human_supplied'};
const policy:WebSourcePolicy={sourceId:candidate.sourceId,host:'review.testing.org',basis:'written_permission',
 rightsDocumentId:'synthetic_permission_reference',rightsDocumentUrl:'https://rights.testing.org/permission',
 reviewedBy:'fixture_operator',reviewedAt:'2026-10-10T18:00:00Z',validUntil:'2026-11-01T00:00:00Z',
 permittedOperations:['metadata_discovery','page_retrieval','local_analysis','fact_storage','public_citation'],
 robots:'allowed',robotsCheckedAt:'2026-10-10T18:30:00Z',websiteTerms:'reviewed_permitted',
 termsCheckedAt:'2026-10-10T18:30:00Z',commercialUseReviewed:true};
const registry:CategoryFieldRegistry={categoryId:'headphones',schemaVersion:1,reviewedBy:'operator',
 reviewReference:'test_registry',fields:[{key:'battery_life',type:'number',unit:'hours',allowedValues:[],
  permittedOrigins:['independent_professional_assessment'],requiresProtocol:false,contextKeys:['usage']}]};
const definition={kind:'field' as const,field:{key:'speech_clarity_in_office',type:'enum' as const,unit:null,
 allowedValues:['good','poor'],permittedOrigins:['independent_professional_assessment' as const],
 requiresProtocol:false,contextKeys:['environment']}};
const valid:EphemeralSemanticSuggestion={id:'obs_speech',definition,origin:'independent_professional_assessment',
 value:{type:'enum',choice:'good'},context:{environment:'office'},protocolId:null,protocolVersion:null,
 anchorText:'Voices remain clear in shared offices.',literalText:'clear',interpretation:'semantic_assessment'};
const adapter=(suggestions:EphemeralSemanticSuggestion[]):LocalSemanticAdapter=>({execution:'local_only',suggestTransient:()=>suggestions});
let count=0;
const transport:SourceTransport={async get(url){count++;
 return url.endsWith('/robots.txt')?{status:200,finalUrl:url,contentType:'text/plain',body:'User-agent: *\nAllow: /'}:
 {status:200,finalUrl:url,contentType:'text/html',body:text};}};
const run=(a:LocalSemanticAdapter=adapter([valid]),p=policy)=>(acquireSuggestedCategoryEvidence({registry,candidate,policy:p,adapter:a,transport,asOf:now}));

test('mocked local semantic suggestion is grounded, quarantined and creates a schema gap',async()=>{
 const out=await run();
 assert.equal(out.status,'quarantined');assert.equal(out.acceptedSuggestions,1);
 assert.equal(out.gapSignals.length,1);assert.equal(out.observations.length,0);
 assert.equal(out.catalog?.proposals[0].status,'needs_more_evidence');
 assert.equal(out.remoteAIUsed,false);assert.equal(out.rankingEligible,false);
 assert.equal(out.noTextStored,true);assert.equal(JSON.stringify(out).includes('Voices remain'),false);
});

test('invented quantified evaluation has no proof and is excluded',async()=>{
 const invalid={...valid,value:{type:'number' as const,number:9,unit:'score'},
  definition:{kind:'field' as const,field:{...definition.field,key:'quality_score',type:'number' as const,unit:'score',allowedValues:[]}},
  literalText:'clear',interpretation:'direct_source_value' as const};
 const out=await run(adapter([invalid]));
 assert.equal(out.status,'blocked');assert.equal(out.gapSignals.length,0);
 assert.equal(out.invalidSuggestions,1);
});

test('a hallucinated quote is excluded and never appears in output',async()=>{
 const out=await run(adapter([{...valid,anchorText:'This invented excerpt was not in the original source.'}]));
 assert.equal(out.status,'blocked');assert.equal(out.invalidSuggestions,1);
});

test('unreviewed terms block request before adapter or page fetch',async()=>{
 count=0;const out=await run(adapter([valid]),{...policy,websiteTerms:'unknown'});
 assert.equal(out.status,'blocked');assert.equal(count,0);
});

test('semantic category interpreter does not need a production field to store a quarantined gap',async()=>{
 const out=await run(adapter([valid]));
 assert.equal(out.gapSignals[0].proposal.kind,'field');
 assert.equal(out.gapSignals[0].proposal.kind==='field'&&out.gapSignals[0].proposal.field.type,'enum');
 assert.equal(out.catalog?.autoFields.length,0);
});

test('existing field cannot be redefined by a local model suggestion',async()=>{
 const revisedRegistry={...registry,fields:[...registry.fields,{
   ...definition.field,allowedValues:['good','poor']}]};
 const mismatch={...valid,definition:{kind:'field' as const,
  field:{...definition.field,allowedValues:['excellent','poor']}}};
 const out=await acquireSuggestedCategoryEvidence({registry:revisedRegistry,candidate,policy,
  adapter:adapter([mismatch]),asOf:now,transport});
 assert.equal(out.status,'blocked');assert.ok(out.reasons.some(r=>r.includes('semantic_conflict')));
});

test('a single source cannot manufacture multiple independent observations of identical context',async()=>{
 const out=await run(adapter([valid,{...valid,id:'obs_dup'}]));
 assert.equal(out.acceptedSuggestions,1);assert.ok(out.reasons.some(r=>r.includes('duplicate_field_context')));
});

test('a proposed number must match a literal number, not a substring of 14',async()=>{
 const source='A controlled session recorded 14 hours for one battery cycle.';
 const localTransport:SourceTransport={async get(url){return url.endsWith('/robots.txt')?
  {status:200,finalUrl:url,contentType:'text/plain',body:'User-agent: *\nAllow: /'}:
  {status:200,finalUrl:url,contentType:'text/plain',body:source};}};
 const numberSuggestion:EphemeralSemanticSuggestion={id:'obs_4',definition:{kind:'field',field:{...registry.fields[0]}},
  origin:'independent_professional_assessment',value:{type:'number',number:4,unit:'hours'},context:{usage:'typical'},
  protocolId:null,protocolVersion:null,anchorText:source,literalText:'4',interpretation:'direct_source_value'};
 const out=await acquireSuggestedCategoryEvidence({registry,candidate,policy,adapter:adapter([numberSuggestion]),
  asOf:now,transport:localTransport});
 assert.equal(out.status,'blocked');assert.equal(out.invalidSuggestions,1);
});

test('malformed model ontology proposal is rejected without unhandled exceptions',async()=>{
 const registryWithExisting={...registry,fields:[...registry.fields,definition.field]};
 const invalidDef={...valid,definition:{kind:'field' as const,field:{...definition.field,allowedValues:['good','good']}}};
 const out=await acquireSuggestedCategoryEvidence({registry:registryWithExisting,candidate,policy,
  adapter:adapter([invalidDef]),asOf:now,transport});
 assert.equal(out.status,'blocked');assert.ok(out.reasons.some(s=>s.includes('semantic_conflict')));
});
