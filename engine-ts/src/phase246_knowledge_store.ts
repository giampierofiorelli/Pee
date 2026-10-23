/** Phase246 — persistent, versioned product and category knowledge from authorized live research.
 *
 * Position in the architecture (extends, does not replace):
 *  - Phase101/104/105 remain the canonical store for REVIEWED, interpreted original-test evidence and its
 *    dependency graph. This store is the persistent STAGING tier that was missing between live observation
 *    (Phase222/241/245, transient) and those reviewed tiers: sources, byte revisions, product identities,
 *    unverified declarations, category hypotheses, research gaps and access history.
 *  - Category knowledge is kept as versioned items that compile into the existing Phase128 CategoryBrain128
 *    (proposed vs reviewed side by side) and Phase125 dialogue schema; Phase179 study streams label items.
 *  - Phase193 screening decisions are looked up per source revision; Phase243 receives candidates and
 *    host suspensions for budgeted, reversible waves.
 *
 * Integrity rules enforced here:
 *  - No page body, excerpt or full article is stored: only hashes, identities, short declared values.
 *  - Retention is decided per source policy. Unknown rights retain metadata only (URL, hash, time,
 *    identity); declarations need 'fact_storage' permission, or an explicit, expiring, local-only
 *    pending-rights cache that is never exported by default and never promoted.
 *  - A declaration is never independent test evidence and never authorizes ranking.
 *  - Product identities merge only on exact identifiers (valid GTIN, brand+MPN, host-scoped SKU/name);
 *    similar names never merge. Variants stay distinct.
 *  - A new source revision supersedes the old revision's declarations and marks dependent derived
 *    artifacts stale, leaving unrelated knowledge untouched.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync,existsSync,writeFileSync,readFileSync,renameSync,rmSync,readdirSync,copyFileSync,statSync} from 'node:fs';
import {dirname,join,resolve as resolvePath} from 'node:path';
import {homedir} from 'node:os';
import type {WebSourcePolicy} from './web_evidence_acquisition.js';
import {approvedMetadataDiscovery75} from './phase75_source_discovery.js';
import type {SpecExtraction245,Fact245} from './phase245_spec_extraction.js';
import type {Value245} from './phase245_value_normalizer.js';
import {validateBrain128,compileCategoryKnowledge128,type CategoryBrain128,type Concept128,type SourceRef128,
 type ConceptKind128,type Review128} from './phase128_category_cognition_dialogue_bridge.js';
import type {StudyStream179} from './phase179_category_learning.js';
import {lookupScreening193,type ScreeningLedger193,type SourceRevision193} from './phase193_screening_memory.js';
import type {CandidateResearch243} from './phase243_budgeted_category_search.js';
import {classDecision249,QUALITATIVE_AMENDMENT270,type SourceClassPolicy249,type Reservations249} from './phase249_retention_policy.js';
import type {QualitativeObservation269} from './phase269_qualitative_observations.js';
import {screenTestLead265,subjectAssociation265,reportedBy265,readingIdentity265,type TestLeadsInput265,type ReadingConfiguration265} from './phase265_test_measurements.js';

import type {PageReading98,ScientificReading98} from './scientific_reading98.js';
/** S98: the key of a Phase245 declaration within its revision (scientific_reading98.declarationKey98 derives the same). */
export function declarationKey246(f:{section:string|null;propertyKey:string;value:unknown;variant:string|null;product:{ref:string;name:string|null}}):string{
 return createHash('sha256').update(JSON.stringify([f.section,f.propertyKey,f.value,f.variant,f.product.ref,f.product.name])).digest('hex').slice(0,24);}
/** S98: a stored reading as read back (columns of scientific_readings98). */
export interface ScientificReadingRow98 {reading_id:string;revision_id:string;subject_table:'declarations'|'test_measurements265'|'document_quantity';subject_id:string;
 product_id:string|null;product_association:string;interpreter_version:string;definitions_identity:string;qk_identity:string;form:string;value:number|null;unit:string|null;
 kind:string|null;kind_status:string;metric:string|null;property_id:string|null;property_state:string;property_rule:string|null;definition_state:string|null;
 nature:string;nature_basis:string;knowledge_state:string;evidence_role:string;retention:string;expires_at:string|null;state:string;ranking_input:number;recorded_at:string;
 /** S99 (v12): the observation's identity and meaning, kept from source to store */
 statement_role:string|null;bound:string|null;statement_cue:string|null;statement_basis:string|null;subject_value:string|null;subject_name:string|null;subject_basis:string|null;
 provenance:string|null;result_basis:string|null;object:string|null;source_reader:string|null;observation_key:string|null;source_locator:string|null;source_offset:number|null;
 /** S100 (v13) */ semantics_json:string|null}
const normName246=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const STORE_SCHEMA_VERSION246=14;
/** Version of the store's identity rules; part of the derivation version recorded per revision, so a rule
 * change re-derives revisions whose bytes are available, like an extractor change. */
export const IDENTITY_RULES246='identity-4';
export type SourceType246='manufacturer'|'retailer'|'independent_original_test'|'editorial'|'community'|
 'promotional_announcement'|'reference_encyclopedia'|'unknown';
/** facts_retained_class_policy (Phase249): individual factual declarations kept privately under a documented
 * source-class policy (no per-source grant); never published, capped per host, reservations honoured. */
export type RetentionClass246='facts_retained'|'facts_retained_class_policy'|'local_pending_rights_review'|'metadata_only'|'blocked';
/** Retention classes whose declaration values are kept in the private store. */
export const VALUE_RETAINING246:readonly RetentionClass246[]=['facts_retained','facts_retained_class_policy','local_pending_rights_review'];
export type IdentityState246='discovered'|'extracted_unverified'|'reviewed'|'unsupported_after_rederivation'|'merged';
export type DeclarationState246='extracted_unverified'|'reviewed'|'verified_for_purpose'|'superseded_by_revision'|'superseded_by_extractor'|'expired_pending_rights';
export type KnowledgeClass246='observed_pattern'|'technical_hypothesis'|'reviewed_general_knowledge'|'evidence_supported_finding';
export const CATEGORY_SECTIONS246=['user_goals','product_subtypes','mechanisms','technical_characteristics',
 'performance_outcomes','spec_need_relevance','quality_measurements','constraints_requirements',
 'failure_modes_safety','trade_offs','user_questions','unknowns_priorities'] as const;
export type CategorySection246=typeof CATEGORY_SECTIONS246[number];
export type ItemProvenance246='assistant_authored_unreviewed'|'source_declaration_aggregate'|'professional_method_reference'|'reviewer_supplied';

/** Operator-owned storage policy. It is NOT a rights attestation; it states what this installation may keep. */
export interface StoragePolicy246 {
 policyVersion:string;
 /** Local-only cache for declarations whose rights are not yet reviewed. Off by default. Never exported
  * unless explicitly requested, never promoted, expires automatically. */
 localPendingRightsCache:{enabled:boolean;expiresAfterDays:number};
 /** S98: write the typed scientific reading of each kept observation (scientific_readings98). Off unless set (gated). */
 scientificReadings98?:boolean;
 /** Whether category-level aggregate patterns may be derived from declarations that are not retained. */
 deriveAggregatesFromUnretainedDeclarations:boolean;
 /** Phase249 source-class policy for factual observations (private, capped). Absent = per-source grants only. */
 classPolicy?:SourceClassPolicy249|null;
}
export const DEFAULT_STORAGE_POLICY246:StoragePolicy246={policyVersion:'pee246-default-deny',
 localPendingRightsCache:{enabled:false,expiresAfterDays:30},deriveAggregatesFromUnretainedDeclarations:false};
/** Default durable location: outside /tmp, overridable with PEE_KNOWLEDGE_DIR. */
export function defaultKnowledgeDir246():string{
 return process.env.PEE_KNOWLEDGE_DIR??join(homedir(),'.local','share','product-evidence-engine','knowledge');
}

const sha=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const canon=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?
 Object.fromEntries(Object.entries(x as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b))):x);
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const slug=(s:string)=>norm(s).replace(/[^\p{L}\p{N}+.-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,90);
const ident=(s:unknown):s is string=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(s);
const iso=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
const hex64=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const shortText=(s:unknown,max=300):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[<>\r\n]/.test(s);

/** GS1 check digit for GTIN-8/12/13/14. */
export function validGtin246(raw:string):string|null{
 const d=String(raw).replace(/\s+/g,'');
 if(!/^\d{8}$|^\d{12,14}$/.test(d))return null;
 const digits=d.split('').map(Number);const check=digits.pop()!;
 const sum=digits.reverse().reduce((a,n,i)=>a+n*(i%2===0?3:1),0);
 return (10-sum%10)%10===check?d.padStart(14,'0'):null;
}
/** Exact-identifier product key. Names only ever key within one host; nothing merges on similarity. */
export function productKey246(i:{host:string;name:string|null;brand?:string|null;gtin?:string|null;mpn?:string|null;
 sku?:string|null;productGroupId?:string|null}):{key:string;basis:'gtin'|'brand_mpn'|'host_group'|'host_sku'|'host_name'}{
 const g=i.gtin?validGtin246(i.gtin):null;
 if(g)return {key:'gtin:'+g,basis:'gtin'};
 if(i.brand&&i.mpn&&i.mpn.trim().length>=3)return {key:`mpn:${slug(i.brand)}:${slug(i.mpn)}`,basis:'brand_mpn'};
 if(i.productGroupId)return {key:`group:${i.host}:${slug(i.productGroupId)}`,basis:'host_group'};
 if(i.sku)return {key:`sku:${i.host}:${slug(i.sku)}`,basis:'host_sku'};
 if(!i.name)throw Error('246_product_without_identity');
 return {key:`name:${i.host}:${slug(i.name)}`,basis:'host_name'};
}
/** Phase252: the single model-code token of a product page URL's last path segment ("/microwaves/qs204aeb/",
 * "/henry-cordless-hvb160/"), or null when there is none or more than one. Used only to keep apart two pages that
 * share a generic name; a URL token is never used to merge anything. */
export function urlModelToken252(url:string):string|null{
 let seg='';try{seg=new URL(url).pathname.split('/').filter(Boolean).pop()??'';}catch{return null;}
 const t=[...new Set(seg.toLowerCase().split(/[-_.+]/).filter(x=>/^(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{4,}$/.test(x)))];
 return t.length===1?t[0]:null;
}
/** Every exact-identifier key of one identity, strongest first. The host-scoped name is used only when no
 * identifier exists. Two records sharing any of these keys denote the same product. */
export function productKeys246(i:Parameters<typeof productKey246>[0]):string[]{
 const keys:string[]=[];const g=i.gtin?validGtin246(i.gtin):null;
 if(g)keys.push('gtin:'+g);
 if(i.brand&&i.mpn&&i.mpn.trim().length>=3)keys.push(`mpn:${slug(i.brand)}:${slug(i.mpn)}`);
 if(i.productGroupId)keys.push(`group:${i.host}:${slug(i.productGroupId)}`);
 if(i.sku)keys.push(`sku:${i.host}:${slug(i.sku)}`);
 if(!keys.length)keys.push(productKey246(i).key);
 return keys;
}
/** Rights gate: what may be kept from one source under this installation's storage policy. */
export function retentionFor246(policy:WebSourcePolicy|undefined,storage:StoragePolicy246,asOf:string):RetentionClass246{
 if(!policy)return storage.localPendingRightsCache.enabled?'local_pending_rights_review':'metadata_only';
 if(policy.basis==='refused'||policy.websiteTerms==='reviewed_prohibited'||policy.robots==='disallowed')return 'blocked';
 if(approvedMetadataDiscovery75(policy,asOf)&&policy.permittedOperations.includes('fact_storage'))return 'facts_retained';
 return storage.localPendingRightsCache.enabled?'local_pending_rights_review':'metadata_only';
}
/** Retention with the Phase249 class policy: a per-source decision (grant, refusal, prohibited terms, robots) always
 * wins; otherwise the class policy applies, subject to per-observation checks at ingest (reservations, host cap). */
function retentionWithClassPolicy(policy:WebSourcePolicy|undefined,storage:StoragePolicy246,asOf:string):RetentionClass246{
 const base=retentionFor246(policy,storage,asOf);
 if(base!=='metadata_only'&&base!=='local_pending_rights_review')return base;
 if(policy&&(policy.basis==='refused'||policy.websiteTerms==='reviewed_prohibited'||policy.robots==='disallowed'))return base;
 return storage.classPolicy?'facts_retained_class_policy':base;
}
/** The evidentiary role of a declaration is fixed by its source type; none is an independent test result. */
export function declarationRole246(t:SourceType246):string{
 return {manufacturer:'manufacturer_declaration',retailer:'retailer_declaration',independent_original_test:
  'test_publisher_declaration_unreviewed',editorial:'editorial_declaration',community:'community_report',
  promotional_announcement:'promotional_claim',reference_encyclopedia:'secondary_reference_declaration',unknown:'unclassified_declaration'}[t];
}

const MIGRATIONS:string[]=[
 // v1
 `CREATE TABLE sources (source_id TEXT PRIMARY KEY, host TEXT NOT NULL, source_type TEXT NOT NULL,
   source_type_basis TEXT NOT NULL, policy_json TEXT, policy_digest TEXT, retention TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE revisions (revision_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(source_id),
   url TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, http_status INTEGER NOT NULL, fetched_at TEXT NOT NULL,
   extractor_version TEXT NOT NULL, retention TEXT NOT NULL, state TEXT NOT NULL, superseded_by TEXT,
   screening_verdict TEXT, raw_body_stored INTEGER NOT NULL DEFAULT 0 CHECK(raw_body_stored=0),
   declarations_seen INTEGER NOT NULL, declarations_retained INTEGER NOT NULL, UNIQUE(url,sha256));
  CREATE TABLE sightings (revision_id TEXT NOT NULL REFERENCES revisions(revision_id), seen_at TEXT NOT NULL, run_id TEXT NOT NULL,
   PRIMARY KEY(revision_id,seen_at,run_id));
  CREATE TABLE products (product_id TEXT PRIMARY KEY, key_basis TEXT NOT NULL, name TEXT, brand TEXT, declared_model TEXT,
   identifiers_json TEXT NOT NULL, identity_state TEXT NOT NULL, identity_review_json TEXT, category_hypotheses_json TEXT NOT NULL,
   first_seen TEXT NOT NULL, last_seen TEXT NOT NULL);
  CREATE TABLE variants (variant_id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(product_id), name TEXT NOT NULL,
   identifiers_json TEXT NOT NULL, attributes_json TEXT NOT NULL);
  CREATE TABLE product_sources (product_id TEXT NOT NULL, revision_id TEXT NOT NULL, role TEXT NOT NULL,
   PRIMARY KEY(product_id,revision_id,role));
  CREATE TABLE declarations (declaration_id TEXT PRIMARY KEY, revision_id TEXT NOT NULL REFERENCES revisions(revision_id),
   product_id TEXT NOT NULL REFERENCES products(product_id), variant_id TEXT, property TEXT NOT NULL, property_key TEXT NOT NULL,
   value_json TEXT NOT NULL, raw_value TEXT NOT NULL, section TEXT, component TEXT, method TEXT NOT NULL, locator TEXT NOT NULL,
   flags_json TEXT NOT NULL, evidence_role TEXT NOT NULL, retention TEXT NOT NULL, state TEXT NOT NULL,
   expires_at TEXT, review_json TEXT, verified_purposes_json TEXT NOT NULL DEFAULT '[]',
   independent_test_evidence INTEGER NOT NULL DEFAULT 0 CHECK(independent_test_evidence=0),
   ranking_authorized INTEGER NOT NULL DEFAULT 0 CHECK(ranking_authorized=0));
  CREATE INDEX decl_product ON declarations(product_id,property_key);
  CREATE TABLE category_items (item_id TEXT PRIMARY KEY, category_id TEXT NOT NULL, section TEXT NOT NULL, statement TEXT NOT NULL,
   knowledge_class TEXT NOT NULL, provenance TEXT NOT NULL, source_revision_ids_json TEXT NOT NULL, study_stream TEXT,
   concept_kind TEXT, concept_id TEXT, aliases_json TEXT NOT NULL, state TEXT NOT NULL, review_json TEXT,
   created_at TEXT NOT NULL, updated_at TEXT NOT NULL, superseded_by TEXT);
  CREATE TABLE category_versions (category_id TEXT NOT NULL, version INTEGER NOT NULL, profile_sha256 TEXT NOT NULL,
   previous_sha256 TEXT, created_at TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY(category_id,version));
  CREATE TABLE derived_nodes (node_id TEXT PRIMARY KEY, kind TEXT NOT NULL, deps_json TEXT NOT NULL,
   state TEXT NOT NULL CHECK(state IN ('stale','fresh')), result_sha256 TEXT, computed_at TEXT, stale_reason TEXT);
  CREATE TABLE derived_edges (dep_key TEXT NOT NULL, node_id TEXT NOT NULL REFERENCES derived_nodes(node_id), PRIMARY KEY(dep_key,node_id));
  CREATE TABLE host_access (host TEXT PRIMARY KEY, ok INTEGER NOT NULL DEFAULT 0, restricted INTEGER NOT NULL DEFAULT 0,
   last_status TEXT, suspended_until TEXT, reason TEXT);
  CREATE TABLE research_gaps (gap_id TEXT PRIMARY KEY, scope TEXT NOT NULL, ref_id TEXT NOT NULL, kind TEXT NOT NULL,
   detail TEXT NOT NULL, next_action TEXT NOT NULL, created_at TEXT NOT NULL, resolved_at TEXT);
  CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL,
   previous_sha256 TEXT NOT NULL, event_sha256 TEXT NOT NULL);
  CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'append_only_events'); END;
  CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'append_only_events'); END;
  CREATE TABLE store_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);`,
 // v2: alias keys, so an identity found later under a stronger identifier resolves to the same product.
 `CREATE TABLE product_keys (key TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(product_id));
  INSERT OR IGNORE INTO product_keys SELECT json_extract(identifiers_json,'$._key'),product_id FROM products WHERE json_extract(identifiers_json,'$._key') IS NOT NULL;`,
 // v3: which attributes a page declares (labels only, never values: page-structure metadata kept under every
 // non-blocked retention class), and typed, source-graded relations between category items.
 `CREATE TABLE revision_properties (revision_id TEXT NOT NULL REFERENCES revisions(revision_id), product_id TEXT NOT NULL,
   property_key TEXT NOT NULL, property_label TEXT NOT NULL, PRIMARY KEY(revision_id,product_id,property_key));
  CREATE TABLE category_relations (relation_id TEXT PRIMARY KEY, category_id TEXT NOT NULL, from_ref TEXT NOT NULL, to_ref TEXT NOT NULL,
   kind TEXT NOT NULL, support TEXT NOT NULL, qualification TEXT NOT NULL, source_revision_ids_json TEXT NOT NULL,
   review_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
 // v4 (Phase260): source memory. The authority is the hash-chained events journal; this table is only its projection,
 // rebuilt deterministically by phase260_source_memory_store.ts. Triggers keep it read-only outside that module's own
 // transaction, and the CHECK columns state what a memory record never is: evidence, an access permission or a ranking.
 `CREATE TABLE source_memory260 (record_id TEXT PRIMARY KEY, kind TEXT NOT NULL, event_seq INTEGER NOT NULL,
   source_id TEXT NOT NULL REFERENCES sources(source_id), revision_id TEXT REFERENCES revisions(revision_id),
   product_id TEXT REFERENCES products(product_id), criterion TEXT, field TEXT, value_json TEXT NOT NULL,
   basis TEXT NOT NULL CHECK(basis IN ('operator_annotation','verifier_accepted','unverified_claim')), review_id TEXT,
   supersedes TEXT, superseded_by TEXT, recorded_at TEXT NOT NULL, payload_sha256 TEXT NOT NULL,
   evidence_admitted INTEGER NOT NULL DEFAULT 0 CHECK(evidence_admitted=0),
   access_authorized INTEGER NOT NULL DEFAULT 0 CHECK(access_authorized=0),
   ranking_authorized INTEGER NOT NULL DEFAULT 0 CHECK(ranking_authorized=0));
  CREATE INDEX source_memory260_source ON source_memory260(source_id,kind);
  CREATE TRIGGER source_memory260_ro_insert BEFORE INSERT ON source_memory260 WHEN COALESCE((SELECT v FROM store_meta WHERE k='source_memory260_writer'),'0')<>'1'
   BEGIN SELECT RAISE(ABORT,'source_memory260_read_only_projection'); END;
  CREATE TRIGGER source_memory260_ro_update BEFORE UPDATE ON source_memory260 WHEN COALESCE((SELECT v FROM store_meta WHERE k='source_memory260_writer'),'0')<>'1'
   BEGIN SELECT RAISE(ABORT,'source_memory260_read_only_projection'); END;
  CREATE TRIGGER source_memory260_ro_delete BEFORE DELETE ON source_memory260 WHEN COALESCE((SELECT v FROM store_meta WHERE k='source_memory260_writer'),'0')<>'1'
   BEGIN SELECT RAISE(ABORT,'source_memory260_read_only_projection'); END;`,
 // v5 (Phase265): publisher-reported test measurements (Phase225/226/227 leads), staged with provenance. product_id is
 // nullable because a test subject may be legitimately unresolved; it is never forced onto a product. The CHECK
 // columns state what a row never is: reviewed, independent, scientifically admitted or ranking input.
 `CREATE TABLE test_measurements265 (measurement_id TEXT PRIMARY KEY, revision_id TEXT NOT NULL REFERENCES revisions(revision_id),
   lead_id TEXT NOT NULL, extractor_version TEXT NOT NULL, block_sha256 TEXT NOT NULL, block_index INTEGER NOT NULL, value_offset INTEGER NOT NULL,
   product_id TEXT REFERENCES products(product_id),
   subject_association TEXT NOT NULL CHECK(subject_association IN ('page_main_product_unverified','table_row_model_matches_page_product_unverified','subject_unresolved')),
   subject_assignment TEXT NOT NULL, value REAL, unit TEXT NOT NULL, dimension TEXT NOT NULL,
   dimension_basis TEXT NOT NULL CHECK(dimension_basis IN ('publisher_table_header','not_established')),
   target_scope TEXT NOT NULL CHECK(target_scope IN ('compartment_unspecified','whole_product_unspecified','not_established')),
   condition TEXT, instrument TEXT, method_cue TEXT NOT NULL, evidence_role TEXT NOT NULL,
   reported_by TEXT NOT NULL CHECK(reported_by IN ('manufacturer','test_publisher_operator_asserted','other_publisher')),
   independence TEXT NOT NULL DEFAULT 'not_established' CHECK(independence='not_established'),
   verification TEXT NOT NULL DEFAULT 'unreviewed' CHECK(verification='unreviewed'),
   market TEXT NOT NULL DEFAULT 'unknown' CHECK(market='unknown'),
   exact_variant_verified INTEGER NOT NULL DEFAULT 0 CHECK(exact_variant_verified=0),
   retention TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('current','superseded_by_revision','superseded_by_extractor','expired_pending_rights')),
   superseded_by_revision TEXT, expires_at TEXT, recorded_at TEXT NOT NULL,
   scientific_evidence_admitted INTEGER NOT NULL DEFAULT 0 CHECK(scientific_evidence_admitted=0),
   independent_test_evidence INTEGER NOT NULL DEFAULT 0 CHECK(independent_test_evidence=0),
   ranking_authorized INTEGER NOT NULL DEFAULT 0 CHECK(ranking_authorized=0),
   CHECK(value IS NOT NULL OR state='expired_pending_rights'), UNIQUE(revision_id,lead_id));
  CREATE INDEX test_measurements265_product ON test_measurements265(product_id,dimension,unit);`,
 // v6 (Phase268): the stated conditions of each measurement as PEE-authored codes (no text), so that comparability can be
 // judged from the store without the page: the value's own codes, the document's own protocol codes, the setpoint.
 `ALTER TABLE test_measurements265 ADD COLUMN condition_codes TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE test_measurements265 ADD COLUMN protocol_codes TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE test_measurements265 ADD COLUMN setpoint_c REAL;`,
 // v7 (Phase270): qualitative outcome codes under the pee249 v2 amendment. Codes only (no text); the CHECKs state what a
 // row never is: ranking input, a laboratory measurement or an independent finding.
 `CREATE TABLE qualitative_observations270 (observation_id TEXT PRIMARY KEY, revision_id TEXT NOT NULL REFERENCES revisions(revision_id),
   reader_version TEXT NOT NULL, product_id TEXT REFERENCES products(product_id),
   identity TEXT NOT NULL CHECK(identity IN ('page_main_product_unverified','appliance_class_only','subject_unresolved')),
   appliance TEXT, dish TEXT NOT NULL, outcome TEXT NOT NULL CHECK(outcome IN ('crispness','browning','evenness','doneness','moisture')),
   direction TEXT NOT NULL CHECK(direction IN ('positive','negative','mixed')), strength TEXT NOT NULL CHECK(strength IN ('explicit','hedged')),
   setting_adjusted INTEGER NOT NULL CHECK(setting_adjusted IN (0,1)), comparative INTEGER NOT NULL CHECK(comparative IN (0,1)),
   dish_from_heading INTEGER NOT NULL CHECK(dish_from_heading IN (0,1)), block_sha256 TEXT NOT NULL, block_index INTEGER NOT NULL,
   basis TEXT NOT NULL CHECK(basis='first_person_cooking_test'), policy_id TEXT NOT NULL, retention TEXT NOT NULL,
   state TEXT NOT NULL CHECK(state IN ('current','superseded_by_revision','superseded_by_reader')), recorded_at TEXT NOT NULL,
   ranking_input INTEGER NOT NULL DEFAULT 0 CHECK(ranking_input=0),
   laboratory_measurement INTEGER NOT NULL DEFAULT 0 CHECK(laboratory_measurement=0),
   independent_finding INTEGER NOT NULL DEFAULT 0 CHECK(independent_finding=0));
  CREATE INDEX qualitative_observations270_product ON qualitative_observations270(product_id,outcome);`,
 // v8 (Phase271): publisher-reported COMPARATIVE results (one task, several appliances: an air fryer and an oven are
 // different equipment classes, never variants of each other). Duration, energy and cost are separate measurands; a cost
 // is always derived from a tariff. experiment_key identifies the experiment by its content, so the same experiment
 // republished elsewhere is a duplicate, not a replication. The CHECKs state what a row never is.
 `CREATE TABLE comparative_results271 (result_id TEXT PRIMARY KEY, revision_id TEXT NOT NULL REFERENCES revisions(revision_id),
   reader_version TEXT NOT NULL, experiment_key TEXT NOT NULL, task_index INTEGER NOT NULL, task_label TEXT,
   equipment_class TEXT NOT NULL, subject_name TEXT, subject_model TEXT, product_id TEXT REFERENCES products(product_id),
   identity TEXT NOT NULL CHECK(identity IN ('exact_variant','named_product','equipment_class','ambiguous','unresolved')),
   measurand TEXT NOT NULL CHECK(measurand IN ('duration','energy','cost')), value REAL, unit TEXT NOT NULL,
   value_basis TEXT NOT NULL CHECK(value_basis IN ('measured','derived_from_tariff','estimated')), approximate INTEGER NOT NULL CHECK(approximate IN (0,1)),
   uncertainty TEXT, condition_codes TEXT NOT NULL, limitations TEXT NOT NULL, form TEXT NOT NULL, block_sha256 TEXT NOT NULL,
   testing_status TEXT NOT NULL CHECK(testing_status='first_hand_test_reported_unreviewed'),
   reported_by TEXT NOT NULL, duplicate_of_revision TEXT,
   independence TEXT NOT NULL DEFAULT 'not_established' CHECK(independence='not_established'),
   verification TEXT NOT NULL DEFAULT 'unreviewed' CHECK(verification='unreviewed'),
   ranking_input INTEGER NOT NULL DEFAULT 0 CHECK(ranking_input=0),
   retention TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('current','superseded_by_revision','superseded_by_reader')), recorded_at TEXT NOT NULL,
   CHECK(measurand<>'cost' OR value_basis='derived_from_tariff'), CHECK(value IS NOT NULL));
  CREATE INDEX comparative_results271_experiment ON comparative_results271(experiment_key,task_index,measurand);`,
 // v9 (S78): assessments of a category relation, journaled with their basis. 'sufficiency' says whether a measured_by
 // relation ESTABLISHES its outcome or only informs it; ranking needs positive evidence (owner S78). An assessment is
 // never a review receipt (support grades stay in category_relations) and never independent validation by itself.
 `CREATE TABLE relation_assessments (assessment_id TEXT PRIMARY KEY, relation_id TEXT NOT NULL REFERENCES category_relations(relation_id),
   aspect TEXT NOT NULL CHECK(aspect IN ('sufficiency')), value TEXT NOT NULL CHECK(value IN ('establishes','informs_only','unclear')),
   basis TEXT NOT NULL CHECK(basis IN ('teaching_source_statement','blind_source_verification','reviewed_receipt')),
   citation TEXT NOT NULL CHECK(length(citation) BETWEEN 3 AND 400), assessor TEXT NOT NULL, note TEXT,
   independence TEXT NOT NULL CHECK(independence IN ('same_model_not_independent','human_reviewer')),
   assessed_at TEXT NOT NULL, superseded_by TEXT REFERENCES relation_assessments(assessment_id));
  CREATE INDEX relation_assessments_relation ON relation_assessments(relation_id,aspect);`,
 // v10 (S78): typed statements translated from teaching documents (src/knowledge_translation.ts), kept with what the
 // relational schema cannot hold: polarity, hedge, the document's status labels, scope, typed subject/object/parts, and
 // provenance (document hash and line; never the quote). Machine translated and unreviewed: never a ranking input; each
 // row carries the measured reliability of its statement type. A newer translator supersedes a document's rows.
 `CREATE TABLE knowledge_statements (statement_id TEXT PRIMARY KEY, category_id TEXT NOT NULL, source_document TEXT NOT NULL,
   source_sha256 TEXT NOT NULL, line INTEGER NOT NULL, headings_json TEXT NOT NULL, type TEXT NOT NULL,
   polarity TEXT NOT NULL CHECK(polarity IN ('positive','negative')), hedge TEXT, status_json TEXT NOT NULL, scope_json TEXT NOT NULL,
   subject_json TEXT, object_json TEXT, parts_json TEXT NOT NULL, rendered TEXT NOT NULL, quote_sha256 TEXT NOT NULL,
   self_check_json TEXT NOT NULL, translator TEXT NOT NULL,
   reliability TEXT NOT NULL CHECK(reliability IN ('reliable_type','unreliable_type','unmeasured_type')),
   review TEXT NOT NULL DEFAULT 'machine_translated_unreviewed' CHECK(review='machine_translated_unreviewed'),
   ranking_input INTEGER NOT NULL DEFAULT 0 CHECK(ranking_input=0),
   state TEXT NOT NULL CHECK(state IN ('current','superseded_by_translator')), recorded_at TEXT NOT NULL);
  CREATE INDEX knowledge_statements_category ON knowledge_statements(category_id,type,state);`,
 // v11 (S98, owner decision 2026-10-20): the typed scientific reading of each extracted observation (one operational
 // interpretation path). A reading annotates a row the store already keeps (a declaration, a test measurement) and holds
 // only ids, codes and states; a quantity the structural document reader found in prose (subject_table
 // 'document_quantity') has no other row, so its value and unit are kept here under the same retention as test values.
 // Conditions use QK axis ids; explicit, inferred, missing and conflicting conditions stay apart. Written only when the
 // storage policy enables it (gated); never a ranking input; superseded when a newer interpreter reads the same subject.
 `CREATE TABLE scientific_readings98 (reading_id TEXT PRIMARY KEY, revision_id TEXT NOT NULL REFERENCES revisions(revision_id),
   subject_table TEXT NOT NULL CHECK(subject_table IN ('declarations','test_measurements265','document_quantity')), subject_id TEXT NOT NULL,
   product_id TEXT REFERENCES products(product_id), product_association TEXT NOT NULL CHECK(product_association IN ('as_subject_row','page_main_product_unverified','named_product_unverified','subject_unresolved')),
   interpreter_version TEXT NOT NULL, definitions_identity TEXT NOT NULL, qk_identity TEXT NOT NULL,
   form TEXT NOT NULL CHECK(form IN ('quantity','judgement','categorical')), value REAL, unit TEXT,
   kind TEXT, kind_status TEXT NOT NULL CHECK(kind_status IN ('typed','ambiguous','not_recognised')), metric TEXT,
   property_id TEXT, property_state TEXT NOT NULL CHECK(property_state IN ('stated','inferred','ambiguous','unknown')), property_rule TEXT, definition_state TEXT,
   conditions_json TEXT NOT NULL, missing_conditions_json TEXT NOT NULL, conflicting_conditions_json TEXT NOT NULL, method_json TEXT NOT NULL,
   nature TEXT NOT NULL CHECK(nature IN ('measured','declared','calculated','condition','unresolved')), nature_basis TEXT NOT NULL,
   knowledge_state TEXT NOT NULL CHECK(knowledge_state IN ('candidate','verified_for_purpose','uncertain','excluded')),
   evidence_role TEXT NOT NULL, retention TEXT NOT NULL, expires_at TEXT,
   state TEXT NOT NULL CHECK(state IN ('current','superseded_by_interpreter','expired_pending_rights')),
   ranking_input INTEGER NOT NULL DEFAULT 0 CHECK(ranking_input=0), recorded_at TEXT NOT NULL);
  CREATE INDEX scientific_readings98_subject ON scientific_readings98(subject_table,subject_id,state);
  CREATE INDEX scientific_readings98_product ON scientific_readings98(product_id,property_id,state);`,
 // v12 (S99, owner review of S98 2026-10-20): every reading keeps its observation's identity and meaning from source to
 // store: the statement role (result, specification, threshold, norm, target, condition, judgement) and bound, whose value
 // it is and on what evidence, who produced it, the result's basis and object, and which reader found it where (locator and
 // offset; no text). A product is linked only when the reading's subject is stated.
 `ALTER TABLE scientific_readings98 ADD COLUMN statement_role TEXT CHECK(statement_role IS NULL OR statement_role IN ('result','specification','threshold','norm','target','condition','judgement','unresolved'));
  ALTER TABLE scientific_readings98 ADD COLUMN bound TEXT CHECK(bound IS NULL OR bound IN ('min','max'));
  ALTER TABLE scientific_readings98 ADD COLUMN statement_cue TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN statement_basis TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN subject_value TEXT CHECK(subject_value IS NULL OR subject_value IN ('page_product','named_product','other_product','none','unresolved'));
  ALTER TABLE scientific_readings98 ADD COLUMN subject_name TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN subject_basis TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN provenance TEXT CHECK(provenance IS NULL OR provenance IN ('publisher','manufacturer','third_party','unresolved'));
  ALTER TABLE scientific_readings98 ADD COLUMN result_basis TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN object TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN source_reader TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN observation_key TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN source_locator TEXT;
  ALTER TABLE scientific_readings98 ADD COLUMN source_offset INTEGER;`,
 // v13 (S100, owner review of S99: rule governance): how role, nature and provenance were decided (deciding tier, scope and
 // rules; a conflict and its values; a presumption that decided nothing), so every stored meaning can be traced to its rules
 `ALTER TABLE scientific_readings98 ADD COLUMN semantics_json TEXT;`,
 // v14 (N1, owner authorisation 2026-10-21): relations of teaching-table rows as n-ary claims (src/relation_claims_n1.ts), a
 // compatible extension of category_relations in the same store: participants with column roles, links with the qualifiers
 // they carry, provenance (document SHA-256, header and row line, cell hashes) and the mapping version they were derived
 // with. Teaching relevance only: never a ranking input; a review records a correct reading, never an established result.
 `CREATE TABLE relation_claims_n1 (claim_id TEXT PRIMARY KEY, category_id TEXT NOT NULL, source_document TEXT NOT NULL,
   source_sha256 TEXT NOT NULL, header_line INTEGER NOT NULL, line INTEGER NOT NULL, headings_json TEXT NOT NULL,
   participants_json TEXT NOT NULL, identifier_columns_json TEXT NOT NULL, links_json TEXT NOT NULL, mapping TEXT NOT NULL,
   claim_type TEXT NOT NULL CHECK(claim_type='teaching_relevance'),
   support TEXT NOT NULL CHECK(support IN ('hypothesis','reviewed')),
   epistemic TEXT NOT NULL CHECK(epistemic IN ('machine_derived_unreviewed','reviewed_relevance')),
   review_json TEXT, ranking_input INTEGER NOT NULL DEFAULT 0 CHECK(ranking_input=0),
   state TEXT NOT NULL CHECK(state IN ('current','superseded')), recorded_at TEXT NOT NULL);
  CREATE INDEX relation_claims_n1_category ON relation_claims_n1(category_id,state);`,
];

/** Phase271: a retained comparative result as read back (columns of comparative_results271 plus its source). */
export interface ComparativeRow271 {result_id:string;revision_id:string;experiment_key:string;task_index:number;task_label:string|null;equipment_class:string;
 subject_name:string|null;subject_model:string|null;product_id:string|null;identity:string;measurand:string;value:number;unit:string;value_basis:string;approximate:number;
 condition_codes:string[];limitations:string[];form:string;duplicate_of_revision:string|null;retention:string;state:string;url:string;fetched_at:string;host:string;source_type:string;[k:string]:unknown}
export interface SourceInput246 {sourceId:string;host:string;sourceType:SourceType246;
 sourceTypeBasis:'operator_asserted'|'heuristic_unverified';policy?:WebSourcePolicy;}
export interface ObservationInput246 {
 source:SourceInput246;url:string;sha256:string;bytes:number;httpStatus:number;fetchedAt:string;runId:string;
 extractorVersion:string;extraction:SpecExtraction245|null;categoryHypotheses:readonly string[];
 /** Optional Phase193 ledger to link screening decisions for this revision. */
 screening?:{ledger:ScreeningLedger193;market:string;policyVersion:string};
 /** Phase249: machine-readable reservations seen for this page (robots Content-Signal, TDM reservation, noai). */
 reservations?:Reservations249;
 /** Phase265: Phase225/226/227 test-result leads from the same transient bytes (see phase265_test_measurements.ts). */
 testLeads?:TestLeadsInput265|null;
 /** Phase270: qualitative outcome codes from the same transient bytes (qualitativeObservations269), kept only under the
  * pee249 v2 amendment. */
 qualitative270?:{readerVersion:string;observations:readonly QualitativeObservation269[]}|null;
 /** S98: the shared scientific reading of this page (scientific_reading98.readPage98), stored only when the storage policy
  * enables scientificReadings98. */
 scientific98?:PageReading98|null;
}
export interface IngestResult246 {revisionId:string;newRevision:boolean;rederived?:boolean;retention:RetentionClass246;
 productIds:string[];variantIds:string[];declarationsSeen:number;declarationsRetained:number;
 supersededRevisionIds:string[];staleNodes:string[];screeningVerdict:string|null;
 /** Phase265: what happened to the test-result leads offered with this observation. */
 testMeasurements?:TestMeasurementOutcome265;qualitative270?:{offered:number;persisted:number;withheld:number;reason:string|null};}
export interface TestMeasurementOutcome265 {offered:number;persisted:number;associated:number;unresolved:number;
 alreadyStored:number;withheldRights:number;withheldReason:string|null;rejected:Record<string,number>;}
export interface CategoryItemInput246 {categoryId:string;section:CategorySection246;statement:string;
 knowledgeClass:KnowledgeClass246;provenance:ItemProvenance246;sourceRevisionIds?:readonly string[];
 studyStream?:StudyStream179;concept?:{kind:ConceptKind128;id:string;aliases:readonly string[]};}
export interface ReviewReceipt246 {reviewId:string;reviewerId:string;reviewedAt:string;
 /** Store revision ids the reviewer relied on. */
 sourceRevisionIds:readonly string[];note:string;}

export class KnowledgeStore246 {
 readonly db:DatabaseSync;readonly path:string;readonly storage:StoragePolicy246;
 constructor(path:string,storage:StoragePolicy246=DEFAULT_STORAGE_POLICY246){
  if(path!==':memory:'){
   if(path.startsWith('/tmp/')&&!process.env.PEE_ALLOW_TMP_STORE)throw Error('246_refusing_ephemeral_tmp_store');
   // Phase249: the operational store holds private retained values; it must live outside any Git working tree
   // so it cannot be committed by accident (PEE_ALLOW_STORE_IN_REPO=1 for deliberate local experiments only).
   if(insideGitWorkTree249(path)&&!process.env.PEE_ALLOW_STORE_IN_REPO)throw Error('249_refusing_store_inside_git_worktree');
   mkdirSync(dirname(path),{recursive:true});
  }
  this.path=path;this.storage=storage;
  if(!storage||typeof storage.policyVersion!=='string'||!(storage.localPendingRightsCache?.expiresAfterDays>=1))throw Error('246_invalid_storage_policy');
  this.db=new DatabaseSync(path);
  this.db.exec('PRAGMA busy_timeout=3000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  this.migrate();
 }
 /** Safe schema upgrade: applies missing migrations in one transaction; refuses newer stores. */
 private migrate():void{
  const v=(this.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version;
  if(v>MIGRATIONS.length)throw Error('246_store_newer_than_software');
  for(let i=v;i<MIGRATIONS.length;i++){
   this.db.exec('BEGIN IMMEDIATE');
   try{this.db.exec(MIGRATIONS[i]);this.db.exec(`PRAGMA user_version=${i+1}`);this.db.exec('COMMIT');}
   catch(e){this.db.exec('ROLLBACK');throw e;}
  }
 }
 schemaVersion():number{return (this.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version;}
 close():void{this.db.close();}
 private tx<T>(f:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const r=f();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 event(kind:string,payload:unknown,at=new Date().toISOString()):void{
  const prev=(this.db.prepare('SELECT event_sha256 FROM events ORDER BY seq DESC LIMIT 1').get() as {event_sha256:string}|undefined)?.event_sha256??'0'.repeat(64);
  const body=canon({at,kind,payload,prev});
  this.db.prepare('INSERT INTO events(at,kind,payload_json,previous_sha256,event_sha256) VALUES (?,?,?,?,?)')
   .run(at,kind,canon(payload),prev,sha(body));
 }
 /** Verifies the append-only event chain (detects accidental edits; not a signature). */
 verifyJournal():{events:number;ok:boolean}{
  const rows=this.db.prepare('SELECT * FROM events ORDER BY seq').all() as {at:string;kind:string;payload_json:string;previous_sha256:string;event_sha256:string}[];
  let prev='0'.repeat(64);
  for(const r of rows){if(r.previous_sha256!==prev||sha(canon({at:r.at,kind:r.kind,payload:JSON.parse(r.payload_json),prev}))!==r.event_sha256)return {events:rows.length,ok:false};prev=r.event_sha256;}
  return {events:rows.length,ok:true};
 }

 // ---------------- sources, access and suspension ----------------
 registerSource(s:SourceInput246,asOf=new Date().toISOString()):RetentionClass246{
  if(!s||!/^[a-z0-9][a-z0-9_.:-]{0,120}$/i.test(s.sourceId)||!/^[a-z0-9.-]+$/.test(s.host))throw Error('246_invalid_source');
  const retention=retentionWithClassPolicy(s.policy,this.storage,asOf);
  const digest=s.policy?sha(canon(s.policy)):null;
  const old=this.db.prepare('SELECT host,policy_digest,retention FROM sources WHERE source_id=?').get(s.sourceId) as {host:string;policy_digest:string|null;retention:string}|undefined;
  if(old&&old.host!==s.host)throw Error('246_source_identity_collision');
  if(!old){this.db.prepare('INSERT INTO sources VALUES (?,?,?,?,?,?,?,?)').run(s.sourceId,s.host,s.sourceType,s.sourceTypeBasis,
   s.policy?canon(s.policy):null,digest,retention,asOf);this.event('source_registered',{sourceId:s.sourceId,retention});}
  else if(old.policy_digest!==digest||old.retention!==retention){
   this.db.prepare('UPDATE sources SET policy_json=?,policy_digest=?,retention=?,source_type=?,source_type_basis=? WHERE source_id=?')
    .run(s.policy?canon(s.policy):null,digest,retention,s.sourceType,s.sourceTypeBasis,s.sourceId);
   this.event('source_policy_changed',{sourceId:s.sourceId,from:old.retention,to:retention});
  }
  return retention;
 }
 /** Access outcomes feed reversible host suspension (403/429/robots refusals), never bypass. */
 /** S85: 'robots_unknown' (a robots file that cannot be read as allowing PEE) is kept apart from an explicit refusal
  * ('robots_disallowed', 'forbidden') and from a temporary 'error': it is fail-closed for the wave, but, like an error,
  * it does not on its own suspend the host. */
 recordAccess246(host:string,outcome:'ok'|'forbidden'|'rate_limited'|'robots_disallowed'|'robots_unknown'|'error',at=new Date().toISOString()):{suspended:boolean}{
  this.db.prepare('INSERT OR IGNORE INTO host_access(host) VALUES (?)').run(host);
  if(outcome==='ok')this.db.prepare('UPDATE host_access SET ok=ok+1,last_status=? WHERE host=?').run(outcome,host);
  else this.db.prepare('UPDATE host_access SET restricted=restricted+1,last_status=? WHERE host=?').run(outcome,host);
  const r=this.db.prepare('SELECT restricted,ok FROM host_access WHERE host=?').get(host) as {restricted:number;ok:number};
  // Two restrictions (or one robots refusal) suspend the host for 30 days; reversible, not an exclusion.
  if(outcome==='robots_disallowed'||(outcome!=='ok'&&outcome!=='error'&&outcome!=='robots_unknown'&&r.restricted>=2)){
   const until=new Date(Date.parse(at)+30*86400000).toISOString();
   this.db.prepare('UPDATE host_access SET suspended_until=?,reason=? WHERE host=?').run(until,outcome,host);
   this.event('host_suspended',{host,until,reason:outcome},at);
   return {suspended:true};
  }
  return {suspended:false};
 }
 /** S87a: hosts whose access suspension is in force at asOf. A past restriction or an expired suspension is history, not an
  * exclusion (discovery used to drop any host ever restricted, so one temporary 429 removed a source for good). */
 activeSuspensions246(asOf=new Date().toISOString()):Set<string>{
  return new Set((this.db.prepare('SELECT host,suspended_until FROM host_access WHERE suspended_until IS NOT NULL').all() as {host:string;suspended_until:string}[])
   .filter(r=>Date.parse(r.suspended_until)>Date.parse(asOf)).map(r=>r.host));
 }
 hostSuspended246(host:string,asOf=new Date().toISOString()):boolean{
  const r=this.db.prepare('SELECT suspended_until FROM host_access WHERE host=?').get(host) as {suspended_until:string|null}|undefined;
  return !!r?.suspended_until&&Date.parse(r.suspended_until)>Date.parse(asOf);
 }
 liftSuspension246(host:string,reason:string):void{
  this.db.prepare('UPDATE host_access SET suspended_until=NULL,restricted=0,reason=? WHERE host=?').run('lifted:'+reason,host);
  this.event('host_suspension_lifted',{host,reason});
 }

 // ---------------- observations ----------------
 /** Ingests one observed page revision. Identical bytes are a sighting, not new knowledge. */
 ingestObservation246(o:ObservationInput246):IngestResult246{
  if(!o||!/^https:\/\//.test(o.url)||!hex64(o.sha256)||!iso(o.fetchedAt)||!Number.isInteger(o.httpStatus)||
   !/^[a-z0-9_.:-]{1,80}$/i.test(o.runId)||!shortText(o.extractorVersion,80))throw Error('246_invalid_observation');
  // S98: with typed readings enabled, the interpreter version is part of the derivation, so a new interpreter re-derives
  // S102: the derivation key names the reader, its rule programs, the definitions and the quantity knowledge, so already-seen
  // bytes are re-derived when any of them changes (it used to name the reader only)
  const sci98=this.storage.scientificReadings98===true&&o.scientific98?{decl:new Map(o.scientific98.declarations.map(d=>[d.key,d.reading])),
   version:[o.scientific98.interpreter.reader,o.scientific98.interpreter.definitions,o.scientific98.interpreter.quantityKnowledge].join('|')}:null;
  const derivationVersion=o.extractorVersion+'+'+IDENTITY_RULES246+(sci98?'+'+sci98.version:'');
  return this.tx(()=>{
   const retention=this.registerSource(o.source,o.fetchedAt);
   if(retention==='blocked'){this.event('observation_blocked',{url:o.url,sourceId:o.source.sourceId},o.fetchedAt);
    return {revisionId:'',newRevision:false,retention,productIds:[],variantIds:[],declarationsSeen:0,declarationsRetained:0,
     supersededRevisionIds:[],staleNodes:[],screeningVerdict:null};}
   const revisionId='rev_'+sha(o.url+'|'+o.sha256).slice(0,24);
   const existing=this.db.prepare('SELECT revision_id FROM revisions WHERE revision_id=?').get(revisionId);
   let rederive=false;let priorLinks:string[]=[];const stale=new Set<string>();
   if(existing){
    this.db.prepare('INSERT OR IGNORE INTO sightings VALUES (?,?,?)').run(revisionId,o.fetchedAt,o.runId);
    const prev=this.db.prepare('SELECT extractor_version,retention FROM revisions WHERE revision_id=?').get(revisionId) as {extractor_version:string;retention:string};
    // Same bytes, same extraction rules: nothing new to learn. Same bytes under NEW rules (or a retention
    // class that now allows keeping values): re-derive this revision only; reviewed declarations are kept.
    if(!o.extraction||(prev.extractor_version===derivationVersion&&prev.retention===retention)){
     this.event('revision_seen_again',{revisionId},o.fetchedAt);
     const products=(this.db.prepare('SELECT DISTINCT product_id FROM product_sources WHERE revision_id=?').all(revisionId) as {product_id:string}[]).map(r=>r.product_id);
     // Phase265: the same bytes may carry test leads not yet stored (first offered now, or under a new lead extractor).
     let tm:TestMeasurementOutcome265|undefined;
     if(o.testLeads){
      const eff=(this.db.prepare('SELECT retention FROM revisions WHERE revision_id=?').get(revisionId) as {retention:RetentionClass246}).retention;
      const main=(this.db.prepare("SELECT product_id FROM product_sources WHERE revision_id=? AND role='main_product'").get(revisionId) as {product_id:string}|undefined)?.product_id??null;
      const kinds2=eff==='facts_retained_class_policy'&&this.storage.classPolicy?(this.storage.classPolicy.classes[o.source.sourceType]??this.storage.classPolicy.classes.unknown).valueKinds:null;
      let keep2=VALUE_RETAINING246.includes(eff)&&(!kinds2||kinds2.includes('quantity'));
      // Step 3: identical bytes may be re-derived under a new reading version; the reservations and host cap of THIS
      // observation still decide whether values may be written (the stored revision class alone is not enough).
      let rightsNow:string|null=null;
      if(keep2&&eff==='facts_retained_class_policy'&&this.storage.classPolicy){const d=this.classDecisionNow246(o,o.source.host,main);if(!d.retain){keep2=false;rightsNow=d.reason;}}
      const exp2=eff==='local_pending_rights_review'?new Date(Date.parse(o.fetchedAt)+this.storage.localPendingRightsCache.expiresAfterDays*86400000).toISOString():null;
      tm=this.applyTestLeads265(o,revisionId,main,keep2,eff,keep2?null:(rightsNow??eff),exp2);
      this.applyComparative271(o,revisionId,main,keep2,eff);
     }
     let q270:{offered:number;persisted:number;withheld:number;reason:string|null}|undefined;
     if(o.qualitative270){const eff=(this.db.prepare('SELECT retention FROM revisions WHERE revision_id=?').get(revisionId) as {retention:RetentionClass246}).retention;
      const main=(this.db.prepare("SELECT product_id FROM product_sources WHERE revision_id=? AND role='main_product'").get(revisionId) as {product_id:string}|undefined)?.product_id??null;
      q270=this.applyQualitative270(o,revisionId,main,eff==='facts_retained_class_policy',eff);}
     return {revisionId,newRevision:false,retention,productIds:products,variantIds:[],declarationsSeen:0,declarationsRetained:0,
      supersededRevisionIds:[],staleNodes:[],screeningVerdict:null,...(tm?{testMeasurements:tm}:{}),...(q270?{qualitative270:q270}:{})};
    }
    rederive=true;
    // Product links of this revision are derived: recomputed under the new rules (products themselves are kept).
    priorLinks=(this.db.prepare('SELECT DISTINCT product_id FROM product_sources WHERE revision_id=?').all(revisionId) as {product_id:string}[]).map(r=>r.product_id);
    this.db.prepare('DELETE FROM product_sources WHERE revision_id=?').run(revisionId);
    this.db.prepare('DELETE FROM revision_properties WHERE revision_id=?').run(revisionId);
    const old=this.db.prepare("SELECT declaration_id FROM declarations WHERE revision_id=? AND state='extracted_unverified'").all(revisionId) as {declaration_id:string}[];
    this.db.prepare("UPDATE declarations SET state='superseded_by_extractor' WHERE revision_id=? AND state='extracted_unverified'").run(revisionId);
    for(const n of this.invalidate(['rev:'+revisionId,...old.map(d=>'decl:'+d.declaration_id)],'extraction_rules_changed'))stale.add(n);
    this.event('revision_rederived',{revisionId,from:prev.extractor_version,to:derivationVersion,retentionFrom:prev.retention,retentionTo:retention,superseded:old.length},o.fetchedAt);
   }
   // A different revision of the same URL supersedes the current one.
   const previous=rederive?[]:this.db.prepare("SELECT revision_id FROM revisions WHERE url=? AND state='current'").all(o.url) as {revision_id:string}[];
   const superseded:string[]=[];
   for(const p of previous){
    this.db.prepare("UPDATE revisions SET state='superseded',superseded_by=? WHERE revision_id=?").run(revisionId,p.revision_id);
    const decls=this.db.prepare("SELECT declaration_id FROM declarations WHERE revision_id=? AND state!='superseded_by_revision'").all(p.revision_id) as {declaration_id:string}[];
    this.db.prepare("UPDATE declarations SET state='superseded_by_revision' WHERE revision_id=?").run(p.revision_id);
    this.db.prepare("UPDATE test_measurements265 SET state='superseded_by_revision',superseded_by_revision=? WHERE revision_id=? AND state='current'").run(revisionId,p.revision_id);
    superseded.push(p.revision_id);
    for(const n of this.invalidate(['rev:'+p.revision_id,...decls.map(d=>'decl:'+d.declaration_id)],'source_revision_changed'))stale.add(n);
   }
   const host=o.source.host;const x=o.extraction;
   let verdict:string|null=null;
   if(o.screening){
    const rev:SourceRevision193={sourceId:o.source.sourceId.replace(/[^a-zA-Z0-9_.:-]/g,'_'),url:o.url,contentHash:o.sha256,contentBasis:'publisher_bytes',
     policyVersion:o.screening.policyVersion,market:o.screening.market,category:(o.categoryHypotheses[0]??'unclassified').replace(/[^a-zA-Z0-9_.:-]/g,'_'),
     variantId:'page',field:null,observedAt:o.fetchedAt.replace(/\.\d+Z$/,'Z'),classificationRevision:'phase246.v1'};
    verdict=lookupScreening193(o.screening.ledger,rev,'document').verdict;
   }
   const facts=x?.facts??[];
   if(rederive)this.db.prepare('UPDATE revisions SET extractor_version=?,retention=?,declarations_seen=? WHERE revision_id=?').run(derivationVersion,retention,facts.length,revisionId);
   else this.db.prepare('INSERT INTO revisions VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,0,?,0)').run(revisionId,o.source.sourceId,o.url,o.sha256,o.bytes,o.httpStatus,
    o.fetchedAt,derivationVersion,retention,'current',verdict,facts.length);
   // Products and variants (identity metadata is retained under every non-blocked class).
   const productIds:string[]=[];const variantIds:string[]=[];
   const upsertProduct=(name:string|null,ids:Record<string,string>,state:IdentityState246,role:string):string=>{
    const ki={host,name,brand:ids.brand??null,gtin:ids.gtin13??ids.gtin14??ids.gtin12??ids.gtin8??ids.gtin??null,
     mpn:ids.mpn??null,sku:ids.sku??null,productGroupId:ids.productGroupID??null};
    let k:{key:string;basis:string}=productKey246(ki);let keys=productKeys246(ki);
    // Resolve through alias keys first: the same product may have been recorded under a weaker identifier.
    const lookup=(ks:string[])=>[...new Set(ks.map(key=>(this.db.prepare('SELECT product_id FROM product_keys WHERE key=?').get(key) as {product_id:string}|undefined)?.product_id).filter(Boolean) as string[])];
    let hits=lookup(keys);
    // Phase252: a generic page name ("20 Litre Microwave Oven") shared by two model pages of one host is not one
    // product. When the name-only key hits a product whose own pages carry a different model code in their URL, this
    // page's product is keyed by its own URL model code instead, and the collision is recorded as a gap.
    const token=k.basis==='host_name'&&role==='main_product'?urlModelToken252(o.url):null;
    if(token&&hits.length){
     const other=(this.db.prepare("SELECT r.url FROM product_sources ps JOIN revisions r USING(revision_id) WHERE ps.product_id=? AND ps.role='main_product'").all(hits[0]) as {url:string}[])
      .map(r=>urlModelToken252(r.url)).filter((x):x is string=>!!x);
     if(other.length&&!other.includes(token)){
      this.addGap('product',hits[0],'identity_name_shared_by_model_pages',`page ${o.url.slice(0,160)} has the same name but model code ${token}`,'review_identity_split',o.fetchedAt);
      k={key:`model:${host}:${token}`,basis:'host_model'};keys=[k.key];hits=lookup(keys);
     }
    }
    if(hits.length>1)this.addGap('product',hits[0],'identity_keys_split_across_products',`exact identifiers of one page product point to ${hits.length} stored products: ${hits.join(',')}`.slice(0,300),'review_identity_merge',o.fetchedAt);
    const pid=hits[0]??'prd_'+sha(k.key).slice(0,24);
    const row=this.db.prepare('SELECT identity_state,category_hypotheses_json,identifiers_json FROM products WHERE product_id=?').get(pid) as
     {identity_state:string;category_hypotheses_json:string;identifiers_json:string}|undefined;
    if(!row){
     this.db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,NULL,?,?,?)').run(pid,k.basis,name,ids.brand??null,ids.model??ids.mpn??null,
      canon({...ids,_key:k.key}),state,canon([...new Set(o.categoryHypotheses)].sort()),o.fetchedAt,o.fetchedAt);
    }else{
     const cats=[...new Set([...JSON.parse(row.category_hypotheses_json),...o.categoryHypotheses])].sort();
     const keepState=row.identity_state==='reviewed'?'reviewed':row.identity_state==='merged'?'merged':null;
     const newState=keepState??(state==='extracted_unverified'||row.identity_state==='unsupported_after_rederivation'?state==='discovered'&&row.identity_state!=='unsupported_after_rederivation'?row.identity_state:state:row.identity_state);
     // Identifiers only accumulate (first value per identifier kept); the original key stays the record's _key.
     const merged={...ids,...JSON.parse(row.identifiers_json)};
     this.db.prepare('UPDATE products SET last_seen=?,category_hypotheses_json=?,identity_state=?,identifiers_json=? WHERE product_id=?').run(o.fetchedAt,canon(cats),newState,canon(merged),pid);
    }
    for(const key of keys)this.db.prepare('INSERT OR IGNORE INTO product_keys VALUES (?,?)').run(key,pid);
    this.db.prepare('INSERT OR IGNORE INTO product_sources VALUES (?,?,?)').run(pid,revisionId,role);
    if(!productIds.includes(pid))productIds.push(pid);
    return pid;
   };
   let mainId:string|null=null;
   // A page title alone (h1/og:title without structured product data or any product declaration) is not
   // evidence that the page is about one product: category pages and app shells have titles too.
   // A product-type page (og:type product, or one or two purchase controls rather than a grid of them) also counts.
   const sig=x?.mainProduct.pageSignals;
   const productPage=!!sig&&(/^(?:product|og:product|product\.item)$/.test(sig.ogType??'')||(sig.purchaseControls>=1&&sig.purchaseControls<=2&&!/^(?:article|website|blog)$/.test(sig.ogType??'')));
   const productEvidence=!!x&&(x.mainProduct.source==='json_ld'||x.mainProduct.source==='microdata'||x.facts.some(f=>f.product.ref==='main')||productPage);
   if(x&&x.mainProduct.name&&!x.mainProduct.ambiguous&&!productEvidence)
    this.addGap('source',revisionId,'no_product_declared',`page title "${x.mainProduct.name.slice(0,80)}" without product data or declarations`,'classify_page_type',o.fetchedAt);
   if(x&&x.mainProduct.name&&!x.mainProduct.ambiguous&&productEvidence){
    mainId=upsertProduct(x.mainProduct.name,{...x.mainProduct.identifiers},'extracted_unverified','main_product');
    for(const v of x.variants){
     const vk=productKey246({host,name:v.name,sku:v.sku});
     const vid='var_'+sha(mainId+'|'+vk.key).slice(0,24);
     this.db.prepare('INSERT OR IGNORE INTO variants VALUES (?,?,?,?,?)').run(vid,mainId,v.name,canon({sku:v.sku}),canon(v.properties));
     variantIds.push(vid);
    }
   }
   const named=new Map<string,string>();
   const ownerOf=(f:Fact245):string|null=>{
    if(f.product.ref==='main')return mainId;
    if(f.product.ref==='named'&&f.product.name){
     if(!named.has(f.product.name))named.set(f.product.name,upsertProduct(f.product.name,{},'discovered','named_in_table'));
     return named.get(f.product.name)!;}
    return null;
   };
   let retained=0;
   // Phase249 class policy: per-observation checks (reservations, per-host cap) decide this revision's retention.
   let effective:RetentionClass246=retention;let kinds:readonly string[]|null=null;let classReason:string|null=null;
   if(retention==='facts_retained_class_policy'&&this.storage.classPolicy){
    const d=this.classDecisionNow246(o,host,mainId);
    if(d.retain)kinds=d.rule.valueKinds;
    else{effective='metadata_only';classReason=d.reason;this.addGap('source',revisionId,d.reason,`class policy ${this.storage.classPolicy.policyId}: ${d.reason}`.slice(0,300),
     d.reason==='insubstantial_part_cap_reached'?'per_source_rights_review_to_exceed_cap':'respect_reservation_metadata_only',o.fetchedAt);}
    this.db.prepare('UPDATE revisions SET retention=? WHERE revision_id=?').run(effective,revisionId);
   }
   const keep=VALUE_RETAINING246.includes(effective);
   const expires=retention==='local_pending_rights_review'?new Date(Date.parse(o.fetchedAt)+this.storage.localPendingRightsCache.expiresAfterDays*86400000).toISOString():null;
   const role=declarationRole246(o.source.sourceType);
   // Products named in comparison tables are identity metadata (state 'discovered'), kept under every non-blocked class.
   for(const f of facts)if(f.product.ref==='named')ownerOf(f);
   // Attribute vocabulary (labels only) for every attributed declaration, whatever the retention class.
   for(const f of facts){const pid=f.product.ref==='main'?mainId:f.product.ref==='named'&&f.product.name?named.get(f.product.name)??null:null;
    if(pid)this.db.prepare('INSERT OR IGNORE INTO revision_properties VALUES (?,?,?,?)').run(revisionId,pid,f.propertyKey,f.property.slice(0,80));}
   if(keep)for(const f of facts){
    const pid=ownerOf(f);if(!pid)continue;
    if(kinds&&!kinds.includes(f.value.kind))continue;
    const vid=f.variant&&mainId===pid?variantIds.find(v=>(this.db.prepare('SELECT name FROM variants WHERE variant_id=?').get(v) as {name:string}).name===f.variant)??null:null;
    const did='dcl_'+sha(canon([revisionId,pid,vid,f.variant,f.section,f.propertyKey,f.value])).slice(0,24);
    // A declaration re-derived unchanged under new rules is revived rather than duplicated.
    const res=this.db.prepare(`INSERT INTO declarations(declaration_id,revision_id,product_id,variant_id,property,property_key,value_json,
     raw_value,section,component,method,locator,flags_json,evidence_role,retention,state,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(declaration_id) DO UPDATE SET state='extracted_unverified',retention=excluded.retention,expires_at=excluded.expires_at,
      method=excluded.method,locator=excluded.locator,flags_json=excluded.flags_json WHERE declarations.state='superseded_by_extractor'`)
     .run(did,revisionId,pid,vid,f.property,f.propertyKey,canon(f.value),f.rawValue.slice(0,120),f.section,f.component,f.method,f.locator.slice(-200),
      canon(f.flags),role,effective,'extracted_unverified',expires);
    if(Number(res.changes))retained++;
    // S100: the reading's product follows its stated subject (a provenance header read as a product, or a threshold, links none)
    if(sci98){const r=sci98.decl.get(declarationKey246(f));if(r){const own=r.subject?.value==='page_product'||r.subject?.value==='named_product';
     this.insertReading98(o,revisionId,'declarations',did,own?pid:null,own?'as_subject_row':'subject_unresolved',r,effective,expires);}}
   }
   this.db.prepare('UPDATE revisions SET declarations_retained=? WHERE revision_id=?').run(retained,revisionId);
   const tm=o.testLeads?this.applyTestLeads265(o,revisionId,mainId,keep&&(!kinds||kinds.includes('quantity')),effective,
    !keep?(classReason??effective):kinds&&!kinds.includes('quantity')?'value_kind_not_retained':null,expires):undefined;
   if(o.testLeads)this.applyComparative271(o,revisionId,mainId,keep&&(!kinds||kinds.includes('quantity')),effective);
   // S98: quantities the structural document reader found that no extractor captured, kept only when interpreted to a
   // defined property, under the same retention as test values; the product is linked only on exact name identity
   if(sci98&&keep&&(!kinds||kinds.includes('quantity'))){const mainName=x&&!x.mainProduct.ambiguous?x.mainProduct.name:null;
    for(const d of o.scientific98!.document){const sj=d.reading.subject;
     // S99: the product comes from the reading's stated subject only: the page product when the source states it, a product
     // the page's tables name when the clause names exactly that product; never for a threshold, norm, target or condition
     const pid=sj.value==='page_product'&&mainName?mainId:sj.value==='named_product'&&sj.name&&named.has(sj.name)?named.get(sj.name)??null:
      sj.value==='named_product'&&sj.name&&mainName&&normName246(sj.name)===normName246(mainName)?mainId:null;
     const assoc=!pid?'subject_unresolved':pid===mainId?'page_main_product_unverified':'named_product_unverified';
     this.insertReading98(o,revisionId,'document_quantity','dq_'+d.key,pid,assoc,d.reading,effective,expires,d.value,d.unit);}}
   const q270=o.qualitative270?this.applyQualitative270(o,revisionId,mainId,keep&&effective==='facts_retained_class_policy',effective):undefined;
   this.db.prepare('INSERT OR IGNORE INTO sightings VALUES (?,?,?)').run(revisionId,o.fetchedAt,o.runId);
   for(const pid of priorLinks)if(!this.db.prepare('SELECT 1 FROM product_sources WHERE product_id=?').get(pid)){
    this.db.prepare("UPDATE products SET identity_state='unsupported_after_rederivation' WHERE product_id=? AND identity_state NOT IN ('reviewed','merged')").run(pid);
    this.event('product_unsupported_after_rederivation',{productId:pid,revisionId},o.fetchedAt);}
   if(x&&!x.mainProduct.ambiguous)this.resolveGaps246(revisionId,'main_product_ambiguous',o.fetchedAt);
   if(mainId)this.resolveGaps246(revisionId,'no_product_declared',o.fetchedAt);
   if(x&&x.mainProduct.ambiguous)this.addGap('source',revisionId,'main_product_ambiguous',
    `page declares ${x.mainProduct.declaredProductCount} products; identity not assigned, ${x.ambiguous.length} values held back`,'resolve_main_product_identity',o.fetchedAt);
   if(keep&&retained){for(const ref of [revisionId,mainId,...productIds].filter(Boolean) as string[])this.resolveGaps246(ref,'declarations_not_retained_rights',o.fetchedAt);}
   if(!keep&&facts.length)this.addGap('product',mainId??revisionId,'declarations_not_retained_rights',
    `${facts.length} declarations observed; retention needs fact_storage permission or an operator storage decision`,'review_source_rights_then_reobserve',o.fetchedAt);
   if(verdict&&verdict!=='reuse_screening_decision')this.addGap('product',mainId??revisionId,'screening_required',
    `Phase193 verdict ${verdict}`,'screen_source_revision',o.fetchedAt);
   // Category-level aggregates over this category become stale when new declarations arrive.
   for(const c of o.categoryHypotheses)for(const n of this.invalidate(['category_observations:'+c],'new_observation'))stale.add(n);
   this.event('revision_ingested',{revisionId,url:o.url,sha256:o.sha256,retention,seen:facts.length,retained,superseded},o.fetchedAt);
   return {revisionId,newRevision:!rederive,rederived:rederive,retention,productIds,variantIds,declarationsSeen:facts.length,declarationsRetained:retained,
    supersededRevisionIds:superseded,staleNodes:[...stale].sort(),screeningVerdict:verdict,...(tm?{testMeasurements:tm}:{}),...(q270?{qualitative270:q270}:{})};
  });
 }
 /** Phase249 class-policy decision for THIS observation: its machine-readable reservations and the host's current
  * insubstantial-part count. Used at first ingest and (Step 3) whenever identical bytes are re-derived, so a new reading
  * version can never write values that the rights in force now would not allow. */
 private classDecisionNow246(o:ObservationInput246,host:string,mainId:string|null){
  const counted=(this.db.prepare(`SELECT DISTINCT d.product_id FROM declarations d JOIN revisions r USING(revision_id) JOIN sources s ON s.source_id=r.source_id
     WHERE s.host=? AND d.retention='facts_retained_class_policy' AND d.state NOT IN ('superseded_by_revision','superseded_by_extractor')
     UNION SELECT DISTINCT COALESCE(t.product_id,'rev:'||t.revision_id) FROM test_measurements265 t JOIN revisions r USING(revision_id) JOIN sources s ON s.source_id=r.source_id
     WHERE s.host=? AND t.retention='facts_retained_class_policy' AND t.state='current'`).all(host,host) as {product_id:string}[]).map(r=>r.product_id);
  return classDecision249(this.storage.classPolicy!,o.source.sourceType,o.reservations,counted.length,!!mainId&&counted.includes(mainId));
 }
 /** Phase265: persist the screened test-result leads of one revision (inside the caller's ingest transaction). Values
  * are kept only when this revision's retention keeps values; otherwise only counts are journaled and a gap records
  * why. Re-offering the same leads is a no-op; a new lead extractor supersedes and re-derives this revision's rows. */
 private applyTestLeads265(o:ObservationInput246,revisionId:string,mainId:string|null,keep:boolean,retention:RetentionClass246,
  withheldReason:string|null,expires:string|null):TestMeasurementOutcome265{
  const t=o.testLeads!;const out:TestMeasurementOutcome265={offered:0,persisted:0,associated:0,unresolved:0,alreadyStored:0,withheldRights:0,withheldReason:null,rejected:{}};
  if(!t||typeof t.extractorVersion!=='string'||!shortText(t.extractorVersion,80)||t.probe?.schema!=='pee225.transient-test-probe.v1'||t.probe.sourceUrl!==o.url||
   !Array.isArray(t.probe.candidates)||t.probe.sourceBodyRetained!==false||t.probe.sourcePassagesRetained!==false)throw Error('265_invalid_test_leads');
  // Step 3: a plan-guided reading carries its configuration, and its version must be the digest of that configuration.
  if(t.readingConfiguration!==undefined&&(!t.readingConfiguration||typeof t.readingConfiguration!=='object'||readingIdentity265(t.readingConfiguration)!==t.extractorVersion))
   throw Error('265_reading_configuration_mismatch');
  const cfg=t.readingConfiguration?{readingConfiguration:t.readingConfiguration}:{};
  const cands=t.probe.candidates;out.offered=cands.length;
  // Step 3: rows derived under another reading configuration stop being current whatever this reading finds — also when
  // it finds nothing, and also when its values are withheld (they are incompatible with the reading now in force).
  const existing=this.db.prepare("SELECT COUNT(*) AS n FROM test_measurements265 WHERE revision_id=? AND extractor_version=? AND state='current'").get(revisionId,t.extractorVersion) as {n:number};
  const otherVersion=Number((this.db.prepare("UPDATE test_measurements265 SET state='superseded_by_extractor' WHERE revision_id=? AND extractor_version<>? AND state='current'").run(revisionId,t.extractorVersion)).changes);
  if(!cands.length){if(otherVersion)this.event('test_measurements_ingested',{revisionId,extractorVersion:t.extractorVersion,offered:0,persisted:0,associated:0,unresolved:0,alreadyStored:0,
   supersededByExtractor:otherVersion,previouslyCurrent:existing.n,rejected:{},...cfg},o.fetchedAt);return out;}
  if(!keep){out.withheldRights=cands.length;out.withheldReason=withheldReason??retention;
   this.addGap('source',revisionId,'test_measurements_not_retained_rights',`${cands.length} publisher-reported test measurement leads observed; values not retained (${out.withheldReason})`,
    'review_source_rights_then_reobserve',o.fetchedAt);
   this.event('test_measurements_withheld',{revisionId,offered:cands.length,reason:out.withheldReason,...(otherVersion?{extractorVersion:t.extractorVersion,supersededByExtractor:otherVersion,...cfg}:{})},o.fetchedAt);return out;}
  const main=mainId?this.db.prepare('SELECT name,declared_model,identifiers_json FROM products WHERE product_id=?').get(mainId) as {name:string|null;declared_model:string|null;identifiers_json:string}:null;
  const pageLead=o.extraction&&o.extraction.mainProduct.name&&!o.extraction.mainProduct.ambiguous&&mainId?
   {name:o.extraction.mainProduct.name,model:o.extraction.mainProduct.identifiers.model??o.extraction.mainProduct.identifiers.mpn??null,sku:o.extraction.mainProduct.identifiers.sku??null}:
   main&&main.name?{name:main.name,model:main.declared_model,sku:(JSON.parse(main.identifiers_json) as Record<string,string>).sku??null}:null;
  const role=declarationRole246(o.source.sourceType);const by=reportedBy265(o.source.sourceType);
  // S86: values the readers set aside as declared or quoted (not this publisher's measurements) are counted with the rejections
  if(t.probe.declaredValuesSkipped86)out.rejected.declared_value_not_measured=t.probe.declaredValuesSkipped86;
  for(const c of cands){
   const r=screenTestLead265(c,{url:o.url,sha256:o.sha256});
   if(!r.ok){out.rejected[r.reason]=(out.rejected[r.reason]??0)+1;continue;}
   const l=r.lead;const assoc=subjectAssociation265(l,pageLead);const pid=assoc==='subject_unresolved'?null:mainId;
   const mid='tm_'+sha(revisionId+'|'+l.leadId).slice(0,24);
   const res=this.db.prepare(`INSERT INTO test_measurements265(measurement_id,revision_id,lead_id,extractor_version,block_sha256,block_index,value_offset,product_id,
     subject_association,subject_assignment,value,unit,dimension,dimension_basis,target_scope,condition,instrument,method_cue,evidence_role,reported_by,retention,state,expires_at,recorded_at,
     condition_codes,protocol_codes,setpoint_c)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'current',?,?,?,?,?)
     ON CONFLICT(measurement_id) DO UPDATE SET state='current',extractor_version=excluded.extractor_version,product_id=excluded.product_id,
      subject_association=excluded.subject_association,dimension=excluded.dimension,dimension_basis=excluded.dimension_basis,target_scope=excluded.target_scope,
      retention=excluded.retention,expires_at=excluded.expires_at,condition_codes=excluded.condition_codes,protocol_codes=excluded.protocol_codes,
      setpoint_c=excluded.setpoint_c,
      -- Step 3: a revived row takes EVERY derived column from the reading now in force (no stale offset, cue, condition,
      -- instrument, attribution or provenance time survives from the version that first wrote it).
      block_sha256=excluded.block_sha256,block_index=excluded.block_index,value_offset=excluded.value_offset,subject_assignment=excluded.subject_assignment,
      value=excluded.value,unit=excluded.unit,condition=excluded.condition,instrument=excluded.instrument,method_cue=excluded.method_cue,
      evidence_role=excluded.evidence_role,reported_by=excluded.reported_by,recorded_at=excluded.recorded_at
      WHERE test_measurements265.state='superseded_by_extractor'`)
    .run(mid,revisionId,l.leadId,t.extractorVersion,l.blockSha256,l.blockIndex,l.valueOffset,pid,assoc,l.subjectAssignment,l.value,l.unit,l.dimension,l.dimensionBasis,
     l.targetScope,l.condition,l.instrument,l.methodCue,role,by,retention,expires,o.fetchedAt,JSON.stringify(l.conditionCodes),JSON.stringify(l.protocolCodes),l.setpointC);
   if(Number(res.changes)){out.persisted++;if(pid)out.associated++;else out.unresolved++;}else out.alreadyStored++;
   if(this.storage.scientificReadings98===true&&o.scientific98){const r=o.scientific98.leads.find(x=>x.leadId===l.leadId)?.reading;
    // S102 (IR7): the reading's product link follows its subject; a threshold, norm, target or condition is no product's value
    if(r){const lp=r.subject?.value==='none'?null:pid;this.insertReading98(o,revisionId,'test_measurements265',mid,lp,lp?'as_subject_row':'subject_unresolved',r,retention,expires);}}
  }
  if(out.persisted||otherVersion||Object.keys(out.rejected).length)this.event('test_measurements_ingested',{revisionId,extractorVersion:t.extractorVersion,offered:out.offered,
   persisted:out.persisted,associated:out.associated,unresolved:out.unresolved,alreadyStored:out.alreadyStored,supersededByExtractor:otherVersion,
   previouslyCurrent:existing.n,rejected:out.rejected,...cfg},o.fetchedAt);
  if(out.unresolved)this.addGap('source',revisionId,'test_measurement_subject_unresolved',`${out.unresolved} test measurements kept without a product: subject not identified on the page`,
   'review_test_subject_identity',o.fetchedAt);
  return out;
 }
 /** Phase270: keep qualitative outcome codes under the pee249 v2 amendment: only when the revision keeps values under the
  * class policy, only for the amendment's source classes, and only codes from PEE's vocabulary. Anything else is
  * withheld with a reason (counts only). Re-offering is a no-op; a new reader version supersedes this revision's rows. */
 private applyQualitative270(o:ObservationInput246,revisionId:string,mainId:string|null,classKeeps:boolean,retention:RetentionClass246):{offered:number;persisted:number;withheld:number;reason:string|null}{
  const q=o.qualitative270!;const obs=Array.isArray(q?.observations)?q.observations:null;
  if(!obs||!shortText(q.readerVersion,80))throw Error('270_invalid_qualitative');
  const out={offered:obs.length,persisted:0,withheld:0,reason:null as string|null};if(!obs.length)return out;
  const allowed=classKeeps&&(QUALITATIVE_AMENDMENT270.sourceClasses as readonly string[]).includes(o.source.sourceType);
  if(!allowed){out.withheld=obs.length;out.reason=!classKeeps?`revision_retention_${retention}`:'source_class_not_in_amendment';
   this.event('qualitative_codes_withheld',{revisionId,offered:obs.length,reason:out.reason},o.fetchedAt);return out;}
  const ok=(x:QualitativeObservation269)=>!!x&&/^[a-z_]{2,40}$/.test(x.dish)&&['crispness','browning','evenness','doneness','moisture'].includes(x.outcome)&&
   ['positive','negative','mixed'].includes(x.direction)&&['explicit','hedged'].includes(x.strength)&&/^[0-9a-f]{64}$/.test(x.blockSha256)&&Number.isSafeInteger(x.blockIndex)&&
   x.rankingInput===false&&x.laboratoryMeasurement===false&&x.independentFinding===false&&x.basis==='first_person_cooking_test'&&(x.appliance===null||x.appliance===undefined||/^[a-z_]{3,20}$/.test(x.appliance));
  this.db.prepare("UPDATE qualitative_observations270 SET state='superseded_by_reader' WHERE revision_id=? AND reader_version<>? AND state='current'").run(revisionId,q.readerVersion);
  for(const x of obs){
   if(!ok(x)){out.withheld++;out.reason='invalid_code';continue;}
   // An outcome attributed to another appliance in a comparison is not the page product's outcome.
   const identity=x.appliance?'appliance_class_only':mainId?'page_main_product_unverified':'subject_unresolved';
   const pid=identity==='page_main_product_unverified'?mainId:null;
   const id='qo_'+sha([revisionId,q.readerVersion,x.blockSha256,x.dish,x.outcome,x.direction,x.appliance??'',x.settingAdjusted].join('|')).slice(0,24);
   const r=this.db.prepare(`INSERT OR IGNORE INTO qualitative_observations270(observation_id,revision_id,reader_version,product_id,identity,appliance,dish,outcome,direction,strength,
     setting_adjusted,comparative,dish_from_heading,block_sha256,block_index,basis,policy_id,retention,state,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'current',?)`)
    .run(id,revisionId,q.readerVersion,pid,identity,x.appliance??null,x.dish,x.outcome,x.direction,x.strength,x.settingAdjusted?1:0,x.comparative?1:0,x.dishFromHeading?1:0,
     x.blockSha256,x.blockIndex,x.basis,QUALITATIVE_AMENDMENT270.policyId,retention,o.fetchedAt);
   if(Number(r.changes))out.persisted++;
  }
  if(out.persisted||out.withheld)this.event('qualitative_codes_ingested',{revisionId,readerVersion:q.readerVersion,...out},o.fetchedAt);
  return out;
 }
 /** Phase271: keep the comparative results of one revision under the same rule as its test measurements (values only when
  * the revision keeps measurement kinds). Re-offering is a no-op; a new reader version supersedes this revision's rows.
  * A row is linked to a store product only when its subject is exactly the page's own product (never by fuzzy names). */
 private applyComparative271(o:ObservationInput246,revisionId:string,mainId:string|null,keep:boolean,retention:RetentionClass246):number{
  const rows=o.testLeads?.comparative270??[];
  // Step 3: the comparative reader does not use the plan, so a plan-guided reading keeps the base reader's version
  // (no needless supersession); other reader versions stop being current before any early return.
  const ver=String(o.testLeads?.comparativeReaderVersion??o.testLeads?.extractorVersion??'')+'+cmp271';if(!shortText(ver,80))throw Error('271_invalid_reader_version');
  const superseded=o.testLeads?Number(this.db.prepare("UPDATE comparative_results271 SET state='superseded_by_reader' WHERE revision_id=? AND reader_version<>? AND state='current'").run(revisionId,ver).changes):0;
  if(superseded)this.event('comparative_results_superseded',{revisionId,readerVersion:ver,superseded},o.fetchedAt);
  if(!rows.length)return 0;
  if(!keep){this.event('comparative_results_withheld',{revisionId,offered:rows.length,reason:retention},o.fetchedAt);return 0;}
  // S85 (owner: declarations never enter measured comparative evidence). A comparative result is stored as a first-hand
  // test result ('measured', testing_status first_hand_test_reported_unreviewed) only when the source's role is a test
  // publisher. Results read on a manufacturer's or another publisher's page are not tests: they are withheld, counted
  // and journaled with the role that decided it (never silently dropped, never relabelled as measured).
  const role=reportedBy265(o.source.sourceType);
  if(role!=='test_publisher_operator_asserted'){this.event('comparative_results_withheld',{revisionId,offered:rows.length,reason:'source_role_not_test:'+role},o.fetchedAt);return 0;}
  const main=mainId?(this.db.prepare('SELECT name FROM products WHERE product_id=?').get(mainId) as {name:string|null}|undefined)?.name??null:null;
  // The experiment, by content: the same subjects, tasks and values reported again are the same experiment.
  const key='exp_'+sha(rows.map(r=>[r.appliance,r.subject?.name??'',r.taskLabel??r.taskIndex,r.dimension,r.value,r.unit].join('|')).sort().join('\n')).slice(0,24);
  const dup=(this.db.prepare("SELECT revision_id FROM comparative_results271 WHERE experiment_key=? AND revision_id<>? AND state='current' LIMIT 1").get(key,revisionId) as {revision_id:string}|undefined)?.revision_id??null;
  const by=reportedBy265(o.source.sourceType);let n=0;
  for(const r of rows){
   if(!r||!['duration','energy','cost'].includes(r.dimension)||!Number.isFinite(r.value)||!/^[0-9a-f]{64}$/.test(r.blockSha256))continue;
   const identity=r.appliance==='several'?'ambiguous':r.subject?.model?'exact_variant':r.subject?'named_product':'equipment_class';
   const pid=r.subject&&main&&r.subject.name===main?mainId:null;
   const lim=[...(r.conditionCodes.includes('quantity_reduced')?['load_not_matched']:[]),...(r.approximate?['approximate_value']:[]),...(identity==='exact_variant'?[]:['variant_not_established'])];
   const id='cr_'+sha([revisionId,ver,r.blockSha256,r.appliance,r.taskIndex,r.dimension,r.value,r.unit].join('|')).slice(0,24);
   // Step 3: a rolled-back reader version revives its own rows (same id = same reader version and content) with every
   // derived column re-computed now; a current row is never touched.
   const res=this.db.prepare(`INSERT INTO comparative_results271(result_id,revision_id,reader_version,experiment_key,task_index,task_label,equipment_class,subject_name,subject_model,product_id,
     identity,measurand,value,unit,value_basis,approximate,uncertainty,condition_codes,limitations,form,block_sha256,testing_status,reported_by,duplicate_of_revision,retention,state,recorded_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,'first_hand_test_reported_unreviewed',?,?,?,'current',?)
     ON CONFLICT(result_id) DO UPDATE SET state='current',experiment_key=excluded.experiment_key,task_label=excluded.task_label,subject_name=excluded.subject_name,
      subject_model=excluded.subject_model,product_id=excluded.product_id,identity=excluded.identity,value_basis=excluded.value_basis,approximate=excluded.approximate,
      condition_codes=excluded.condition_codes,limitations=excluded.limitations,form=excluded.form,reported_by=excluded.reported_by,
      duplicate_of_revision=excluded.duplicate_of_revision,retention=excluded.retention,recorded_at=excluded.recorded_at
      WHERE comparative_results271.state='superseded_by_reader'`)
    .run(id,revisionId,ver,key,r.taskIndex,r.taskLabel,r.appliance,r.subject?.name?.slice(0,180)??null,r.subject?.model??null,pid,identity,r.dimension,r.value,r.unit,
     r.dimension==='cost'?'derived_from_tariff':r.approximate?'estimated':'measured',r.approximate?1:0,JSON.stringify(r.conditionCodes),JSON.stringify(lim),r.form,r.blockSha256,by,dup,retention,o.fetchedAt);
   n+=Number(res.changes);
  }
  if(n)this.event('comparative_results_ingested',{revisionId,experimentKey:key,persisted:n,duplicateOf:dup},o.fetchedAt);
  return n;
 }
 /** Phase271: a page headline recorded as a product before the Phase271 headline rule (a comparison or guide article) is
  * not a product; it leaves the active product set with a journaled reason (reversible, nothing deleted). */
 retireNonProduct271(productId:string,reason:string,at=new Date().toISOString()):boolean{
  const r=this.db.prepare("UPDATE products SET identity_state='unsupported_after_rederivation' WHERE product_id=? AND identity_state NOT IN ('reviewed','merged')").run(productId);
  if(Number(r.changes))this.event('product_not_a_product',{productId,reason:reason.slice(0,200)},at);return Number(r.changes)>0;
 }
 /** Phase271: stored comparative results (current only), with their source. Unreviewed; never ranking input. */
 comparativeResults271(f:{equipmentClass?:string;measurand?:string;experimentKey?:string}={}){
  const w:string[]=["c.state='current'"];const a:string[]=[];
  if(f.equipmentClass){w.push('c.equipment_class=?');a.push(f.equipmentClass);}if(f.measurand){w.push('c.measurand=?');a.push(f.measurand);}
  if(f.experimentKey){w.push('c.experiment_key=?');a.push(f.experimentKey);}
  return (this.db.prepare(`SELECT c.*,r.url,r.fetched_at,s.host,s.source_type FROM comparative_results271 c JOIN revisions r USING(revision_id) JOIN sources s ON s.source_id=r.source_id
   WHERE ${w.join(' AND ')} ORDER BY c.experiment_key,c.task_index,c.measurand,c.equipment_class`).all(...a) as Record<string,unknown>[]).map(r=>({...r,
   condition_codes:JSON.parse(String(r.condition_codes)) as string[],limitations:JSON.parse(String(r.limitations)) as string[]}) as ComparativeRow271);
 }
 /** Phase270: stored qualitative outcome codes (current only). Never ranking input. */
 qualitativeObservations270(f:{productId?:string|null}={}){
  return (this.db.prepare(`SELECT q.*,r.url,s.host FROM qualitative_observations270 q JOIN revisions r USING(revision_id) JOIN sources s ON s.source_id=r.source_id
   WHERE q.state='current'${f.productId?' AND q.product_id=?':''} ORDER BY q.observation_id`).all(...(f.productId?[f.productId]:[])) as Record<string,unknown>[]);
 }
 /** Phase265: stored test measurements with provenance (current only unless asked). Unreviewed and never evidence. */
 /** Step 3: every reading configuration the journal recorded, by extractor version: which scientific plan (by content
  * digest) and which reader versions produced the test measurements of that version. `verified` recomputes the version
  * from the configuration. The base (no-plan) version has no configuration and is not listed. */
 readingConfigurations265():{extractorVersion:string;configuration:ReadingConfiguration265;firstRecordedAt:string;verified:boolean}[]{
  const out=new Map<string,{extractorVersion:string;configuration:ReadingConfiguration265;firstRecordedAt:string;verified:boolean}>();
  for(const e of this.db.prepare("SELECT at,payload_json FROM events WHERE kind IN ('test_measurements_ingested','test_measurements_withheld') ORDER BY seq").all() as {at:string;payload_json:string}[]){
   const p=JSON.parse(e.payload_json) as {extractorVersion?:string;readingConfiguration?:ReadingConfiguration265};
   if(!p.extractorVersion||!p.readingConfiguration||out.has(p.extractorVersion))continue;
   out.set(p.extractorVersion,{extractorVersion:p.extractorVersion,configuration:p.readingConfiguration,firstRecordedAt:e.at,verified:readingIdentity265(p.readingConfiguration)===p.extractorVersion});}
  return [...out.values()];
 }
 /** Step 3: what must be reconsidered when scientific knowledge changes. Given the plans in force now (category and
  * content digest), the current test measurements derived under a DIFFERENT plan of the same category, grouped by
  * revision. Re-deriving those revisions from their retained bytes (same source revision, new reading version)
  * supersedes them under the ordinary rules. No-plan rows were not derived from a plan and are not listed. */
 readingsToReconsider265(plansNow:readonly {categoryId:string;contentDigest:string}[]):{revisionId:string;url:string;extractorVersion:string;categoryId:string;
  planDigestUsed:string;planDigestNow:string;currentMeasurements:number}[]{
  const now=new Map(plansNow.map(p=>[p.categoryId,p.contentDigest]));const out=[];
  for(const c of this.readingConfigurations265()){const d=now.get(c.configuration.plan.categoryId);if(!d||d===c.configuration.plan.contentDigest)continue;
   for(const r of this.db.prepare("SELECT t.revision_id AS revisionId,r.url AS url,COUNT(*) AS n FROM test_measurements265 t JOIN revisions r USING(revision_id) WHERE t.extractor_version=? AND t.state='current' GROUP BY t.revision_id,r.url ORDER BY t.revision_id").all(c.extractorVersion) as {revisionId:string;url:string;n:number}[])
    out.push({revisionId:r.revisionId,url:r.url,extractorVersion:c.extractorVersion,categoryId:c.configuration.plan.categoryId,planDigestUsed:c.configuration.plan.contentDigest,planDigestNow:d,currentMeasurements:Number(r.n)});}
  return out;
 }
 testMeasurements265(f:{productId?:string|null;revisionId?:string;includeSuperseded?:boolean}={}){
  const where:string[]=[];const args:string[]=[];
  if(f.productId!==undefined){if(f.productId===null)where.push('t.product_id IS NULL');else{where.push('t.product_id=?');args.push(f.productId);}}
  if(f.revisionId){where.push('t.revision_id=?');args.push(f.revisionId);}
  if(!f.includeSuperseded)where.push("t.state='current'");
  return (this.db.prepare(`SELECT t.*,r.url,r.sha256,r.fetched_at,s.host,s.source_type,s.source_type_basis FROM test_measurements265 t JOIN revisions r USING(revision_id)
   JOIN sources s ON s.source_id=r.source_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY t.measurement_id`).all(...args) as Record<string,unknown>[]).map(r=>({
   measurementId:r.measurement_id as string,revisionId:r.revision_id as string,leadId:r.lead_id as string,extractorVersion:r.extractor_version as string,
   source:{url:r.url as string,sha256:r.sha256 as string,fetchedAt:r.fetched_at as string,host:r.host as string,sourceType:r.source_type as string,sourceTypeBasis:r.source_type_basis as string},
   locator:{blockSha256:r.block_sha256 as string,blockIndex:r.block_index as number,valueOffset:r.value_offset as number},
   productId:(r.product_id as string|null)??null,subjectAssociation:r.subject_association as string,subjectAssignment:r.subject_assignment as string,
   value:r.value as number|null,unit:r.unit as string,dimension:r.dimension as string,dimensionBasis:r.dimension_basis as string,targetScope:r.target_scope as string,
   condition:(r.condition as string|null)??null,instrument:(r.instrument as string|null)??null,methodCue:r.method_cue as string,
   conditionCodes:JSON.parse((r.condition_codes as string|undefined)??'[]') as string[],protocolCodes:JSON.parse((r.protocol_codes as string|undefined)??'[]') as string[],
   setpointC:(r.setpoint_c as number|null|undefined)??null,
   evidenceRole:r.evidence_role as string,reportedBy:r.reported_by as string,independence:r.independence as string,verification:r.verification as string,
   market:r.market as string,exactVariantVerified:r.exact_variant_verified===1,retention:r.retention as string,state:r.state as string,
   supersededByRevision:(r.superseded_by_revision as string|null)??null,expiresAt:(r.expires_at as string|null)??null,recordedAt:r.recorded_at as string,
   scientificEvidenceAdmitted:false as const,independentTestEvidence:false as const,rankingAuthorized:false as const}));
 }
 /** Phase265: current measurements of one product that report the same publisher-declared dimension, unit, condition
  * and scope. Different values are a conflict; equal values from different revisions are repeated observations (which
  * says nothing about independence). Measurements whose dimension is not established are never grouped. */
 testMeasurementConflicts265(productId:string){
  const g=new Map<string,ReturnType<KnowledgeStore246['testMeasurements265']>>();
  for(const m of this.testMeasurements265({productId}))if(m.dimensionBasis==='publisher_table_header'){
   const k=[m.dimension,m.unit,m.condition??'',m.targetScope].join('|');g.set(k,[...(g.get(k)??[]),m]);}
  return [...g.entries()].filter(([,v])=>v.length>1).map(([k,v])=>{const values=[...new Set(v.map(m=>m.value))];
   return {key:k,kind:values.length>1?'conflicting_values' as const:'repeated_observation' as const,values,
    measurements:v.map(m=>({measurementId:m.measurementId,value:m.value,host:m.source.host,reportedBy:m.reportedBy,revisionId:m.revisionId}))};});
 }
 /** Removes expired local pending-rights declarations; metadata and receipts stay. */
 /** S98: persist one typed reading for a kept subject row; an older interpreter's reading of the same subject is superseded. */
 private insertReading98(o:ObservationInput246,revisionId:string,subjectTable:'declarations'|'test_measurements265'|'document_quantity',subjectId:string,
  productId:string|null,association:string,r:ScientificReading98,retention:string,expires:string|null,value:number|null=null,unit:string|null=null):boolean{
  const sci=o.scientific98!;const v=sci.interpreter.reader;
  // S100 (rule audit): a reading is superseded when the reader, the definitions or the quantity knowledge it was read with change
  this.db.prepare("UPDATE scientific_readings98 SET state='superseded_by_interpreter' WHERE subject_table=? AND subject_id=? AND (interpreter_version<>? OR definitions_identity<>? OR qk_identity<>?) AND state='current'")
   .run(subjectTable,subjectId,v,sci.interpreter.definitions,sci.interpreter.quantityKnowledge);
  const id='sr_'+sha(subjectTable+'|'+subjectId+'|'+v+'|'+sci.interpreter.definitions+'|'+sci.interpreter.quantityKnowledge).slice(0,24);
  const res=this.db.prepare(`INSERT INTO scientific_readings98(reading_id,revision_id,subject_table,subject_id,product_id,product_association,interpreter_version,definitions_identity,qk_identity,
    form,value,unit,kind,kind_status,metric,property_id,property_state,property_rule,definition_state,conditions_json,missing_conditions_json,conflicting_conditions_json,method_json,
    nature,nature_basis,knowledge_state,evidence_role,retention,expires_at,state,recorded_at,
    statement_role,bound,statement_cue,statement_basis,subject_value,subject_name,subject_basis,provenance,result_basis,object,source_reader,observation_key,source_locator,source_offset,semantics_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'current',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(reading_id) DO UPDATE SET state='current',product_id=excluded.product_id,product_association=excluded.product_association,retention=excluded.retention,expires_at=excluded.expires_at
    WHERE scientific_readings98.state<>'current'`).run(id,revisionId,subjectTable,subjectId,productId,association,v,sci.interpreter.definitions,sci.interpreter.quantityKnowledge,
    r.form,value,unit,r.quantity?.kind??null,r.quantity?.kindStatus??'not_recognised',r.quantity?.metric??null,r.property.id,r.property.state,r.property.rule,r.property.definitionState,
    canon(r.conditions),canon(r.missing),canon(r.conflicts),canon(r.method),r.nature,r.natureBasis,r.knowledgeState,declarationRole246(o.source.sourceType),retention,expires,o.fetchedAt,
    r.statement?.role??null,r.statement?.bound??null,r.statement?.cue??null,r.statement?.basis??null,r.subject?.value??null,r.subject?.name??null,r.subject?.basis??null,r.provenance??null,
    r.resultBasis??null,r.object??null,r.source?.reader??null,r.source?.key??null,r.source?.locator??null,r.source?.offset??null,r.semantics?canon(r.semantics):null);
  return Number(res.changes)>0;
 }
 /** S98: the current typed readings, optionally of one product or property, with their subject rows still current. */
 scientificReadings98(filter:{productId?:string;propertyId?:string}={}){
  const rows=this.db.prepare(`SELECT r.*,(SELECT v.source_id FROM revisions v WHERE v.revision_id=r.revision_id) AS source_id FROM scientific_readings98 r WHERE r.state='current'
    AND (? IS NULL OR r.product_id=?) AND (? IS NULL OR r.property_id=?)
    AND (r.subject_table='document_quantity'
     OR (r.subject_table='declarations' AND EXISTS (SELECT 1 FROM declarations d WHERE d.declaration_id=r.subject_id AND d.state NOT IN ('superseded_by_revision','superseded_by_extractor','expired_pending_rights')))
     OR (r.subject_table='test_measurements265' AND EXISTS (SELECT 1 FROM test_measurements265 t WHERE t.measurement_id=r.subject_id AND t.state='current')))
    ORDER BY r.reading_id`).all(filter.productId??null,filter.productId??null,filter.propertyId??null,filter.propertyId??null) as Record<string,unknown>[];
  return rows.map(r=>({...(r as unknown as ScientificReadingRow98&{source_id:string}),conditions:JSON.parse(String(r.conditions_json)) as ScientificReading98['conditions'],missing:JSON.parse(String(r.missing_conditions_json)) as string[],
   conflicts:JSON.parse(String(r.conflicting_conditions_json)) as string[],method:JSON.parse(String(r.method_json)) as ScientificReading98['method']}));
 }
 purgeExpired246(asOf=new Date().toISOString()):number{
  const n=Number(this.db.prepare("UPDATE declarations SET state='expired_pending_rights',value_json='null',raw_value='' WHERE retention='local_pending_rights_review' AND expires_at<=? AND state!='expired_pending_rights'").run(asOf).changes);
  if(n)this.event('pending_rights_declarations_expired',{count:n},asOf);
  const m=Number(this.db.prepare("UPDATE test_measurements265 SET state='expired_pending_rights',value=NULL WHERE retention='local_pending_rights_review' AND expires_at<=? AND state!='expired_pending_rights'").run(asOf).changes);
  if(m)this.event('pending_rights_test_measurements_expired',{count:m},asOf);
  const k=Number(this.db.prepare("UPDATE scientific_readings98 SET state='expired_pending_rights',value=NULL WHERE retention='local_pending_rights_review' AND expires_at<=? AND state!='expired_pending_rights'").run(asOf).changes);
  if(k)this.event('pending_rights_scientific_readings_expired',{count:k},asOf);
  return n+m+k;
 }

 // ---------------- product knowledge reads and reviews ----------------
 product246(productId:string){
  const p=this.db.prepare('SELECT * FROM products WHERE product_id=?').get(productId) as Record<string,string>|undefined;
  if(!p)return null;
  return {productId,keyBasis:p.key_basis,name:p.name,brand:p.brand,declaredModel:p.declared_model,
   identifiers:JSON.parse(p.identifiers_json),identityState:p.identity_state as IdentityState246,
   categoryHypotheses:JSON.parse(p.category_hypotheses_json) as string[],firstSeen:p.first_seen,lastSeen:p.last_seen,
   variants:(this.db.prepare('SELECT * FROM variants WHERE product_id=? ORDER BY name').all(productId) as Record<string,string>[])
    .map(v=>({variantId:v.variant_id,name:v.name,identifiers:JSON.parse(v.identifiers_json),attributes:JSON.parse(v.attributes_json)})),
   sources:(this.db.prepare(`SELECT r.url,r.sha256,r.fetched_at,r.state,ps.role,s.source_type,r.retention FROM product_sources ps JOIN revisions r USING(revision_id)
    JOIN sources s USING(source_id) WHERE ps.product_id=? ORDER BY r.fetched_at`).all(productId) as Record<string,string>[]),
   rankingAuthorized:false as const,independentTestEvidence:false as const};
 }
 products246(filter:{category?:string;includeInactive?:boolean}={}):string[]{
  const rows=this.db.prepare(`SELECT product_id,category_hypotheses_json FROM products ${filter.includeInactive?'':"WHERE identity_state NOT IN ('unsupported_after_rederivation','merged')"} ORDER BY product_id`).all() as {product_id:string;category_hypotheses_json:string}[];
  return rows.filter(r=>!filter.category||JSON.parse(r.category_hypotheses_json).includes(filter.category)).map(r=>r.product_id);
 }
 declarations246(productId:string,opts:{includeSuperseded?:boolean}={}){
  const rows=this.db.prepare(`SELECT * FROM declarations WHERE product_id=? ${opts.includeSuperseded?'':"AND state NOT IN ('superseded_by_revision','superseded_by_extractor','expired_pending_rights')"} ORDER BY property_key,declaration_id`).all(productId) as Record<string,string|number|null>[];
  return rows.map(r=>({declarationId:r.declaration_id as string,revisionId:r.revision_id as string,variantId:r.variant_id as string|null,
   property:r.property as string,propertyKey:r.property_key as string,value:JSON.parse(r.value_json as string) as Value245|null,
   rawValue:r.raw_value as string,section:r.section as string|null,method:r.method as string,evidenceRole:r.evidence_role as string,
   retention:r.retention as RetentionClass246,state:r.state as DeclarationState246,flags:JSON.parse(r.flags_json as string) as string[],
   verifiedPurposes:JSON.parse(r.verified_purposes_json as string) as string[],independentTestEvidence:false as const,rankingAuthorized:false as const}));
 }
 /** Unresolved disagreements: same product/variant/section/property with different current values. */
 conflicts246(productId:string){
  const d=this.declarations246(productId);const g=new Map<string,typeof d>();
  for(const x of d){const k=[x.variantId,x.section,x.propertyKey].join('|');g.set(k,[...(g.get(k)??[]),x]);}
  return [...g].filter(([,v])=>new Set(v.map(x=>canon(x.value))).size>1).map(([k,v])=>({key:k,values:v.map(x=>({value:x.value,revisionId:x.revisionId}))}));
 }
 reviewProductIdentity246(productId:string,receipt:ReviewReceipt246,verify:(r:ReviewReceipt246)=>boolean):void{
  if(!verify||!verify(receipt))throw Error('246_review_not_verified');
  this.tx(()=>{
   const n=this.db.prepare("UPDATE products SET identity_state='reviewed',identity_review_json=? WHERE product_id=?").run(canon(receipt),productId).changes;
   if(!n)throw Error('246_unknown_product');
   this.event('product_identity_reviewed',{productId,reviewId:receipt.reviewId},receipt.reviewedAt);
   this.invalidate(['product:'+productId],'identity_reviewed');
  });
 }
 /** Marks a declaration usable for one named purpose. Requires retained rights and an independent verifier.
  * It never turns a declaration into test evidence or a ranking input. */
 verifyDeclarationForPurpose246(declarationId:string,purpose:string,receipt:ReviewReceipt246,verify:(r:ReviewReceipt246)=>boolean):void{
  if(!ident(purpose))throw Error('246_invalid_purpose');
  const r=this.db.prepare('SELECT retention,state,verified_purposes_json FROM declarations WHERE declaration_id=?').get(declarationId) as {retention:string;state:string;verified_purposes_json:string}|undefined;
  if(!r)throw Error('246_unknown_declaration');
  if(r.retention!=='facts_retained'&&r.retention!=='facts_retained_class_policy')throw Error('246_rights_insufficient_for_promotion');
  if(r.state==='superseded_by_revision'||r.state==='expired_pending_rights')throw Error('246_declaration_not_current');
  if(!verify||!verify(receipt))throw Error('246_review_not_verified');
  const purposes=[...new Set([...JSON.parse(r.verified_purposes_json),purpose])].sort();
  this.tx(()=>{
   this.db.prepare("UPDATE declarations SET state='verified_for_purpose',review_json=?,verified_purposes_json=? WHERE declaration_id=?").run(canon(receipt),canon(purposes),declarationId);
   this.event('declaration_verified_for_purpose',{declarationId,purpose,reviewId:receipt.reviewId},receipt.reviewedAt);
   this.invalidate(['decl:'+declarationId],'declaration_reviewed');
  });
 }

 // ---------------- research gaps ----------------
 addGap(scope:'product'|'category'|'source',refId:string,kind:string,detail:string,nextAction:string,at=new Date().toISOString()):string{
  const id='gap_'+sha(canon([scope,refId,kind])).slice(0,20);
  this.db.prepare('INSERT OR IGNORE INTO research_gaps VALUES (?,?,?,?,?,?,?,NULL)').run(id,scope,refId,kind,detail.slice(0,300),nextAction,at);
  return id;
 }
 /** Closes open gaps of one kind for one reference (the gap row is kept with its resolution time). */
 resolveGaps246(refId:string,kind:string,at=new Date().toISOString()):number{
  const n=Number(this.db.prepare('UPDATE research_gaps SET resolved_at=? WHERE ref_id=? AND kind=? AND resolved_at IS NULL').run(at,refId,kind).changes);
  if(n)this.event('gap_resolved',{refId,kind,count:n},at);
  return n;
 }
 /** Maintenance: identity gaps of revisions that now have a main product are resolved. */
 reconcileIdentityGaps246(at=new Date().toISOString()):number{
  const rows=this.db.prepare(`SELECT g.ref_id,g.kind FROM research_gaps g WHERE g.kind IN ('main_product_ambiguous','no_product_declared') AND g.resolved_at IS NULL AND EXISTS
   (SELECT 1 FROM product_sources ps WHERE ps.revision_id=g.ref_id AND ps.role='main_product')`).all() as {ref_id:string;kind:string}[];
  return rows.reduce((a,r)=>a+this.resolveGaps246(r.ref_id,r.kind,at),0);
 }
 /** Phase249: closes 'declarations_not_retained_rights' gaps of products and revisions that now hold retained values
 * (after a retention policy change re-derived them). */
 reconcileRetentionGaps249(at=new Date().toISOString()):number{
  const refs=(this.db.prepare(`SELECT DISTINCT product_id ref FROM declarations WHERE state='extracted_unverified' AND retention IN ('facts_retained','facts_retained_class_policy','local_pending_rights_review')
   UNION SELECT DISTINCT revision_id FROM declarations WHERE state='extracted_unverified'`).all() as {ref:string}[]).map(r=>r.ref);
  let n=0;for(const r of refs)n+=this.resolveGaps246(r,'declarations_not_retained_rights',at);
  // Phase263: a rights gap must not outlive its cause. When no current revision linked to the product (or the revision
  // itself) is still held back by its retention class, the missing values are an extraction, identity or absence
  // question, not a rights one: the gap is closed and the reason journaled. Gaps of still-restricted revisions stay open.
  const open=this.db.prepare("SELECT DISTINCT ref_id FROM research_gaps WHERE kind='declarations_not_retained_rights' AND resolved_at IS NULL").all() as {ref_id:string}[];
  for(const {ref_id} of open){
   const linked=this.db.prepare(`SELECT r.retention FROM revisions r WHERE r.state='current' AND (r.revision_id=? OR r.revision_id IN (SELECT revision_id FROM product_sources WHERE product_id=?))`)
    .all(ref_id,ref_id) as {retention:string}[];
   if(linked.some(r=>!VALUE_RETAINING246.includes(r.retention as RetentionClass246)))continue;
   const closed=Number(this.db.prepare("UPDATE research_gaps SET resolved_at=? WHERE ref_id=? AND kind='declarations_not_retained_rights' AND resolved_at IS NULL").run(at,ref_id).changes);
   if(closed){n+=closed;this.event('gap_reclassified',{refId:ref_id,kind:'declarations_not_retained_rights',count:closed,
    reason:linked.length?'all_current_linked_revisions_retain_values':'no_current_linked_revision'},at);}
  }
  return n;
 }
 gaps246(filter:{scope?:string;refId?:string}={}){
  return (this.db.prepare('SELECT * FROM research_gaps WHERE resolved_at IS NULL ORDER BY gap_id').all() as Record<string,string>[])
   .filter(g=>(!filter.scope||g.scope===filter.scope)&&(!filter.refId||g.ref_id===filter.refId));
 }

 // ---------------- category knowledge ----------------
 addCategoryItem246(i:CategoryItemInput246,at=new Date().toISOString()):string{
  if(!ident(i.categoryId)||!CATEGORY_SECTIONS246.includes(i.section)||!shortText(i.statement))throw Error('246_invalid_category_item');
  if(i.knowledgeClass==='reviewed_general_knowledge'||i.knowledgeClass==='evidence_supported_finding')
   throw Error('246_reviewed_classes_require_review_promotion');
  if(i.knowledgeClass==='observed_pattern'&&i.provenance!=='source_declaration_aggregate')throw Error('246_pattern_requires_aggregate_provenance');
  const revs=[...(i.sourceRevisionIds??[])];
  for(const r of revs)if(!this.db.prepare('SELECT 1 FROM revisions WHERE revision_id=?').get(r))throw Error('246_unknown_source_revision');
  if(i.provenance==='professional_method_reference'&&!revs.length)throw Error('246_method_reference_requires_source');
  // Phase269: a 'measurement' concept (what would establish an outcome, or a test condition) has no everyday aliases.
  if(i.concept&&(!ident(i.concept.id)||(!i.concept.aliases.length&&i.concept.kind!=='measurement')||(i.concept.kind==='measurement'&&i.concept.aliases.length)))throw Error('246_invalid_concept');
  const id='cat_'+sha(canon([i.categoryId,i.section,norm(i.statement)])).slice(0,20);
  return this.tx(()=>{
   const exists=this.db.prepare('SELECT 1 FROM category_items WHERE item_id=?').get(id);
   if(!exists){
    this.db.prepare('INSERT INTO category_items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,NULL)').run(id,i.categoryId,i.section,i.statement,
     i.knowledgeClass,i.provenance,canon(revs),i.studyStream??null,i.concept?.kind??null,i.concept?.id??null,canon(i.concept?.aliases??[]),
     'proposed_unverified',at,at);
    this.event('category_item_added',{itemId:id,categoryId:i.categoryId,class:i.knowledgeClass},at);
    this.invalidate(['category:'+i.categoryId],'category_item_added');
   }
   return id;
  });
 }
 /** Review promotion. reviewed_general_knowledge needs a verified receipt; evidence_supported_finding also
  * needs at least one cited revision from an independent original-test source. */
 reviewCategoryItem246(itemId:string,toClass:'reviewed_general_knowledge'|'evidence_supported_finding',receipt:ReviewReceipt246,
  verify:(r:ReviewReceipt246)=>boolean):void{
  const it=this.db.prepare('SELECT * FROM category_items WHERE item_id=?').get(itemId) as Record<string,string>|undefined;
  if(!it)throw Error('246_unknown_category_item');
  if(!verify||!verify(receipt)||!receipt.sourceRevisionIds.length)throw Error('246_review_not_verified');
  for(const r of receipt.sourceRevisionIds)if(!this.db.prepare('SELECT 1 FROM revisions WHERE revision_id=?').get(r))throw Error('246_unknown_source_revision');
  if(toClass==='evidence_supported_finding'){
   const ok=receipt.sourceRevisionIds.some(r=>(this.db.prepare('SELECT s.source_type FROM revisions r JOIN sources s USING(source_id) WHERE r.revision_id=?').get(r) as {source_type:string}).source_type==='independent_original_test');
   if(!ok)throw Error('246_finding_requires_independent_original_test');
  }
  this.tx(()=>{
   this.db.prepare("UPDATE category_items SET state='reviewed',knowledge_class=?,review_json=?,updated_at=? WHERE item_id=?").run(toClass,canon(receipt),receipt.reviewedAt,itemId);
   this.event('category_item_reviewed',{itemId,toClass,reviewId:receipt.reviewId},receipt.reviewedAt);
   this.invalidate(['category:'+it.category_id,'catitem:'+itemId],'category_item_reviewed');
  });
 }
 /** Phase251: adds a category hypothesis to ONE product, with its evidence journaled (basis, citing revisions). It never
  * touches identity, never merges products and applies to that product's variants by construction. */
 assignProductCategory251(productId:string,categoryId:string,evidence:{basis:string[];revisionIds:string[];detail:string},at=new Date().toISOString()):boolean{
  if(!ident(categoryId)||!evidence.basis.length||!shortText(evidence.detail,300))throw Error('251_invalid_category_assignment');
  const row=this.db.prepare('SELECT category_hypotheses_json FROM products WHERE product_id=?').get(productId) as {category_hypotheses_json:string}|undefined;
  if(!row)throw Error('251_unknown_product');
  for(const r of evidence.revisionIds)if(!this.db.prepare('SELECT 1 FROM revisions WHERE revision_id=?').get(r))throw Error('246_unknown_source_revision');
  const cats:string[]=JSON.parse(row.category_hypotheses_json);if(cats.includes(categoryId))return false;
  this.tx(()=>{this.db.prepare('UPDATE products SET category_hypotheses_json=? WHERE product_id=?').run(canon([...cats,categoryId].sort()),productId);
   this.event('product_category_assigned',{productId,categoryId,basis:evidence.basis,revisionIds:evidence.revisionIds,detail:evidence.detail},at);
   this.invalidate(['category:'+categoryId,'category_observations:'+categoryId],'product_category_assigned');});
  return true;
 }
 /** Phase251: retires a category item (it stays in the table, journaled, and stops being returned). Used to withdraw
  * an item that should not be category knowledge, e.g. a persistence test item. Nothing is deleted. */
 retireCategoryItem246(itemId:string,reason:string,at=new Date().toISOString()):boolean{
  if(!/^cat_[0-9a-f]{20}$/.test(itemId)||!/^[a-z0-9_]{3,60}$/.test(reason))throw Error('251_invalid_retirement');
  const it=this.db.prepare('SELECT category_id,superseded_by FROM category_items WHERE item_id=?').get(itemId) as {category_id:string;superseded_by:string|null}|undefined;
  if(!it)throw Error('251_unknown_item');if(it.superseded_by)return false;
  this.tx(()=>{this.db.prepare('UPDATE category_items SET superseded_by=?,updated_at=? WHERE item_id=?').run('retired:'+reason,at,itemId);
   this.event('category_item_retired',{itemId,categoryId:it.category_id,reason},at);this.invalidate(['category:'+it.category_id,'catitem:'+itemId],'category_item_retired');});
  return true;
 }
 /** Phase252: splits a product whose name-only identity covers pages of different models. The declarations and
  * source links of the named revisions (whole pages, never single values) move to a new product keyed by the moved
  * page's model code; both records get their model code as declared_model and a model key, so re-ingesting either
  * page resolves to its own product. Refused if a moved declaration belongs to a variant (no evidence-free moves
  * between variants) or if the original would keep no page. Journaled with everything needed to reverse it. */
 splitProductIdentity252(productId:string,move:{revisionIds:string[];movedModel:string;keptModel:string;reason:string;detail:string},at=new Date().toISOString()):string{
  const p=this.db.prepare('SELECT * FROM products WHERE product_id=?').get(productId) as Record<string,string>|undefined;
  if(!p)throw Error('252_unknown_product');
  const code=/^[a-z0-9]{3,24}$/;if(!code.test(move.movedModel)||!code.test(move.keptModel)||move.movedModel===move.keptModel||!/^[a-z0-9_]{3,60}$/.test(move.reason)||!shortText(move.detail,300)||!move.revisionIds.length)throw Error('252_invalid_split');
  const own=(this.db.prepare("SELECT revision_id FROM product_sources WHERE product_id=? AND role='main_product'").all(productId) as {revision_id:string}[]).map(r=>r.revision_id);
  if(move.revisionIds.some(r=>!own.includes(r))||own.every(r=>move.revisionIds.includes(r)))throw Error('252_split_must_keep_and_move_own_pages');
  const qs=move.revisionIds.map(()=>'?').join(',');
  const decls=this.db.prepare(`SELECT declaration_id,variant_id FROM declarations WHERE product_id=? AND revision_id IN (${qs})`).all(productId,...move.revisionIds) as {declaration_id:string;variant_id:string|null}[];
  if(decls.some(d=>d.variant_id))throw Error('252_split_would_move_variant_declarations');
  const host=new URL((this.db.prepare('SELECT url FROM revisions WHERE revision_id=?').get(move.revisionIds[0]) as {url:string}).url).host;
  const newKey=`model:${host}:${move.movedModel}`,keptKey=`model:${host}:${move.keptModel}`;
  if(this.db.prepare('SELECT 1 FROM product_keys WHERE key=? OR key=?').get(newKey,keptKey))throw Error('252_model_key_exists');
  const newId='prd_'+sha(newKey).slice(0,24);
  const seen=this.db.prepare(`SELECT min(fetched_at) a,max(fetched_at) b FROM revisions WHERE revision_id IN (${qs})`).get(...move.revisionIds) as {a:string;b:string};
  this.tx(()=>{
   this.db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(newId,'host_model',p.name,p.brand,move.movedModel.toUpperCase(),
    canon({_key:newKey,splitFrom:productId}),p.identity_state,canon({split252:{from:productId,reason:move.reason,detail:move.detail,at}}),p.category_hypotheses_json,seen.a,seen.b);
   this.db.prepare(`UPDATE declarations SET product_id=? WHERE product_id=? AND revision_id IN (${qs})`).run(newId,productId,...move.revisionIds);
   this.db.prepare(`UPDATE product_sources SET product_id=? WHERE product_id=? AND revision_id IN (${qs})`).run(newId,productId,...move.revisionIds);
   this.db.prepare('UPDATE products SET declared_model=?,identity_review_json=? WHERE product_id=?').run(move.keptModel.toUpperCase(),
    canon({split252:{to:newId,reason:move.reason,detail:move.detail,at,previousDeclaredModel:p.declared_model??null}}),productId);
   this.db.prepare('INSERT INTO product_keys VALUES (?,?)').run(newKey,newId);this.db.prepare('INSERT INTO product_keys VALUES (?,?)').run(keptKey,productId);
   this.event('product_identity_split',{from:productId,to:newId,movedRevisionIds:move.revisionIds,movedDeclarationIds:decls.map(d=>d.declaration_id),
    newKey,keptKey,movedModel:move.movedModel,keptModel:move.keptModel,previousDeclaredModel:p.declared_model??null,reason:move.reason,detail:move.detail},at);
   this.invalidate(['product:'+productId,'product:'+newId,...decls.map(d=>'decl:'+d.declaration_id),...JSON.parse(p.category_hypotheses_json).map((c:string)=>'category_observations:'+c)],'product_identity_split');
  });
  return newId;
 }
 /** Phase252: reverses splitProductIdentity252 from its journal event (the split product is kept, marked merged). */
 reverseProductSplit252(newProductId:string,reason:string,at=new Date().toISOString()):boolean{
  if(!/^[a-z0-9_]{3,60}$/.test(reason))throw Error('252_invalid_reversal');
  const ev=(this.db.prepare("SELECT payload_json FROM events WHERE kind='product_identity_split' ORDER BY seq DESC").all() as {payload_json:string}[])
   .map(e=>JSON.parse(e.payload_json)).find(e=>e.to===newProductId);
  if(!ev)throw Error('252_unknown_split');
  if((this.db.prepare('SELECT identity_state FROM products WHERE product_id=?').get(newProductId) as {identity_state:string}).identity_state==='merged')return false;
  const qs=ev.movedRevisionIds.map(()=>'?').join(',');
  this.tx(()=>{
   this.db.prepare(`UPDATE declarations SET product_id=? WHERE product_id=? AND revision_id IN (${qs})`).run(ev.from,newProductId,...ev.movedRevisionIds);
   this.db.prepare(`UPDATE product_sources SET product_id=? WHERE product_id=? AND revision_id IN (${qs})`).run(ev.from,newProductId,...ev.movedRevisionIds);
   this.db.prepare('DELETE FROM product_keys WHERE key IN (?,?)').run(ev.newKey,ev.keptKey);
   this.db.prepare("UPDATE products SET identity_state='merged' WHERE product_id=?").run(newProductId);
   this.db.prepare('UPDATE products SET declared_model=? WHERE product_id=?').run(ev.previousDeclaredModel,ev.from);
   this.event('product_identity_split_reversed',{from:ev.from,to:newProductId,reason},at);
   this.invalidate(['product:'+ev.from,'product:'+newProductId,...ev.movedDeclarationIds.map((d:string)=>'decl:'+d)],'product_identity_split_reversed');
  });
  return true;
 }
 /** Phase253: types a source registered as 'unknown' from journaled evidence (basis 'heuristic_unverified'), and
  * re-derives the evidence role of that source's unclassified declarations. Only 'unknown' sources can be typed here:
  * an operator-asserted type is never overwritten. No value, product or identity changes; reversible from the journal. */
 classifySourceType253(sourceId:string,to:'manufacturer'|'retailer',evidence:{rule:string;detail:string},at=new Date().toISOString()):boolean{
  if(!/^[a-z0-9_]{3,60}$/.test(evidence.rule)||!shortText(evidence.detail,300))throw Error('253_invalid_source_classification');
  const s=this.db.prepare('SELECT source_type,source_type_basis FROM sources WHERE source_id=?').get(sourceId) as {source_type:string;source_type_basis:string}|undefined;
  if(!s)throw Error('253_unknown_source');if(s.source_type===to&&s.source_type_basis==='heuristic_unverified')return false;
  if(s.source_type!=='unknown')throw Error('253_only_unknown_sources_can_be_classified');
  const decls=(this.db.prepare("SELECT d.declaration_id FROM declarations d JOIN revisions r USING(revision_id) WHERE r.source_id=? AND d.evidence_role='unclassified_declaration'").all(sourceId) as {declaration_id:string}[]).map(d=>d.declaration_id);
  const role=declarationRole246(to);
  this.tx(()=>{this.db.prepare("UPDATE sources SET source_type=?,source_type_basis='heuristic_unverified' WHERE source_id=?").run(to,sourceId);
   const up=this.db.prepare('UPDATE declarations SET evidence_role=? WHERE declaration_id=?');for(const d of decls)up.run(role,d);
   this.event('source_type_classified',{sourceId,from:s.source_type,fromBasis:s.source_type_basis,to,rule:evidence.rule,detail:evidence.detail,declarationIds:decls},at);
   this.invalidate(['source:'+sourceId,...decls.map(d=>'decl:'+d)],'source_type_classified');});
  return true;
 }
 /** Phase253: reverses classifySourceType253 from its journal event. */
 reverseSourceClassification253(sourceId:string,reason:string,at=new Date().toISOString()):boolean{
  if(!/^[a-z0-9_]{3,60}$/.test(reason))throw Error('253_invalid_reversal');
  const ev=(this.db.prepare("SELECT payload_json FROM events WHERE kind='source_type_classified' ORDER BY seq DESC").all() as {payload_json:string}[]).map(e=>JSON.parse(e.payload_json)).find(e=>e.sourceId===sourceId);
  if(!ev)throw Error('253_unknown_classification');
  const s=this.db.prepare('SELECT source_type FROM sources WHERE source_id=?').get(sourceId) as {source_type:string};if(s.source_type===ev.from)return false;
  this.tx(()=>{this.db.prepare('UPDATE sources SET source_type=?,source_type_basis=? WHERE source_id=?').run(ev.from,ev.fromBasis,sourceId);
   const up=this.db.prepare('UPDATE declarations SET evidence_role=? WHERE declaration_id=?');for(const d of ev.declarationIds)up.run(declarationRole246(ev.from),d);
   this.event('source_type_classification_reversed',{sourceId,to:ev.from,reason},at);
   this.invalidate(['source:'+sourceId,...ev.declarationIds.map((d:string)=>'decl:'+d)],'source_type_classification_reversed');});
  return true;
 }
 /** Adds request vocabulary to every item carrying a concept (vocabulary only; class, state and review unchanged). */
 addConceptAliases246(categoryId:string,conceptId:string,aliases:readonly string[],at=new Date().toISOString()):number{
  const rows=this.db.prepare('SELECT item_id,aliases_json FROM category_items WHERE category_id=? AND concept_id=?').all(categoryId,conceptId) as {item_id:string;aliases_json:string}[];
  let changed=0;
  for(const r of rows){const cur:string[]=JSON.parse(r.aliases_json);
   const next=[...new Map([...cur,...aliases].filter(a=>shortText(a,80)).map(a=>[a.toLowerCase(),a.trim()])).values()].slice(0,40);
   if(next.length!==cur.length){this.db.prepare('UPDATE category_items SET aliases_json=?,updated_at=? WHERE item_id=?').run(canon(next),at,r.item_id);changed++;}}
  if(changed){this.event('concept_aliases_added',{categoryId,conceptId,count:aliases.length},at);this.invalidate(['category:'+categoryId],'concept_aliases_added');}
  return changed;
 }
 categoryItems246(categoryId:string){
  return (this.db.prepare("SELECT * FROM category_items WHERE category_id=? AND superseded_by IS NULL ORDER BY section,item_id").all(categoryId) as Record<string,string>[])
   .map(r=>({itemId:r.item_id,section:r.section as CategorySection246,statement:r.statement,knowledgeClass:r.knowledge_class as KnowledgeClass246,
    provenance:r.provenance as ItemProvenance246,sourceRevisionIds:JSON.parse(r.source_revision_ids_json) as string[],studyStream:r.study_stream,
    concept:r.concept_id?{kind:r.concept_kind as ConceptKind128,id:r.concept_id,aliases:JSON.parse(r.aliases_json) as string[]}:null,
    state:r.state as 'proposed_unverified'|'reviewed',review:r.review_json?JSON.parse(r.review_json) as ReviewReceipt246:null}));
 }
 /** Observed category patterns from RETAINED, current declarations of distinct products (or, if the storage
  * policy allows, from transient counts supplied by the caller). Frequency is reported, never importance. */
 deriveObservedPatterns246(categoryId:string,at=new Date().toISOString()):string[]{
  const rows=this.db.prepare(`SELECT d.product_id,d.property_key,d.property,d.value_json FROM declarations d JOIN products p USING(product_id)
   WHERE d.state IN ('extracted_unverified','reviewed','verified_for_purpose') AND p.category_hypotheses_json LIKE ?`).all('%"'+categoryId+'"%') as Record<string,string>[];
  const by=new Map<string,{label:string;products:Set<string>;nums:number[];unit:string|null}>();
  for(const r of rows){
   const v=JSON.parse(r.value_json) as Value245;const e=by.get(r.property_key)??{label:r.property,products:new Set(),nums:[],unit:null};
   e.products.add(r.product_id);
   if(v&&(v.kind==='quantity'||v.kind==='price')){const n=v.kind==='quantity'?v.number:v.amount;const u=v.kind==='quantity'?v.unit:v.currency;
    if(e.unit===null||e.unit===u){e.unit=u;e.nums.push(n);}}
   by.set(r.property_key,e);
  }
  const total=new Set(rows.map(r=>r.product_id)).size;const ids:string[]=[];
  for(const [key,e] of [...by].sort((a,b)=>a[0].localeCompare(b[0]))){
   if(e.products.size<2)continue;
   const range=e.nums.length>=2?`; declared values ${Math.min(...e.nums)}–${Math.max(...e.nums)} ${e.unit}`:'';
   const id=this.addCategoryItem246({categoryId,section:'technical_characteristics',knowledgeClass:'observed_pattern',
    provenance:'source_declaration_aggregate',studyStream:'product_variant_observations',
    statement:`"${e.label}" declared for ${e.products.size} of ${total} observed products${range}. Frequency of declaration is not evidence of importance or performance.`.slice(0,300)},at);
   ids.push(id);
   this.registerDerived246('pattern:'+categoryId+':'+key,'observed_pattern',['category_observations:'+categoryId],sha(id));
  }
  return ids;
 }
 /** Versioned category profile: sections with classes kept apart. Committing a version is append-only. */
 categoryProfile246(categoryId:string){
  const items=this.categoryItems246(categoryId);
  const sections=Object.fromEntries(CATEGORY_SECTIONS246.map(s=>[s,{
   observedPatterns:items.filter(i=>i.section===s&&i.knowledgeClass==='observed_pattern'),
   technicalHypotheses:items.filter(i=>i.section===s&&i.knowledgeClass==='technical_hypothesis'),
   reviewedGeneralKnowledge:items.filter(i=>i.section===s&&i.knowledgeClass==='reviewed_general_knowledge'),
   evidenceSupportedFindings:items.filter(i=>i.section===s&&i.knowledgeClass==='evidence_supported_finding')}]));
  // Relations (schema v3) are part of the versioned profile: a new or re-graded relation is a new version.
  const relations=(this.db.prepare('SELECT relation_id,support FROM category_relations WHERE category_id=? ORDER BY relation_id').all(categoryId) as {relation_id:string;support:string}[]).map(r=>[r.relation_id,r.support]);
  const body={categoryId,items:items.map(i=>[i.itemId,i.knowledgeClass,i.state,i.review?.reviewId??null]),...(relations.length?{relations}:{})};
  const version=(this.db.prepare('SELECT MAX(version) AS v FROM category_versions WHERE category_id=?').get(categoryId) as {v:number|null}).v??0;
  return {schema:'pee246.category-profile.v1',categoryId,version,profileSha256:sha(canon(body)),sections,
   counts:{relations:relations.length,items:items.length,reviewed:items.filter(i=>i.state==='reviewed').length,hypotheses:items.filter(i=>i.knowledgeClass==='technical_hypothesis').length,
    patterns:items.filter(i=>i.knowledgeClass==='observed_pattern').length},
   products:this.products246({category:categoryId}).length,gaps:this.gaps246({scope:'category',refId:categoryId}).length,
   rankingAuthorized:false as const,performanceEstablished:false as const};
 }
 commitCategoryVersion246(categoryId:string,reason:string,at=new Date().toISOString()):{version:number;profileSha256:string;changed:boolean}{
  const p=this.categoryProfile246(categoryId);
  const last=this.db.prepare('SELECT version,profile_sha256 FROM category_versions WHERE category_id=? ORDER BY version DESC LIMIT 1').get(categoryId) as {version:number;profile_sha256:string}|undefined;
  if(last&&last.profile_sha256===p.profileSha256)return {version:last.version,profileSha256:p.profileSha256,changed:false};
  const version=(last?.version??0)+1;
  this.db.prepare('INSERT INTO category_versions VALUES (?,?,?,?,?,?)').run(categoryId,version,p.profileSha256,last?.profile_sha256??null,at,reason.slice(0,200));
  this.event('category_version_committed',{categoryId,version,profileSha256:p.profileSha256},at);
  return {version,profileSha256:p.profileSha256,changed:true};
 }
 categoryVersions246(categoryId:string){return this.db.prepare('SELECT * FROM category_versions WHERE category_id=? ORDER BY version').all(categoryId);}

 // ---------------- derived artifacts and invalidation ----------------
 registerDerived246(nodeId:string,kind:string,deps:readonly string[],resultSha256:string|null=null):void{
  const old=this.db.prepare('SELECT deps_json FROM derived_nodes WHERE node_id=?').get(nodeId) as {deps_json:string}|undefined;
  if(old&&old.deps_json!==canon([...deps].sort()))throw Error('246_derived_dependencies_changed_use_new_node');
  if(!old){this.db.prepare('INSERT INTO derived_nodes VALUES (?,?,?,?,?,?,NULL)').run(nodeId,kind,canon([...deps].sort()),resultSha256?'fresh':'stale',resultSha256,resultSha256?new Date().toISOString():null);
   for(const d of deps)this.db.prepare('INSERT OR IGNORE INTO derived_edges VALUES (?,?)').run(d,nodeId);}
  else if(resultSha256)this.markComputed246(nodeId,resultSha256);
 }
 markComputed246(nodeId:string,resultSha256:string):void{
  this.db.prepare("UPDATE derived_nodes SET state='fresh',result_sha256=?,computed_at=?,stale_reason=NULL WHERE node_id=?").run(resultSha256,new Date().toISOString(),nodeId);
 }
 /** Marks every node reachable from the changed keys as stale (transitively); returns their ids. */
 invalidate(keys:readonly string[],reason:string):string[]{
  const seen=new Set<string>();const queue=[...keys];
  while(queue.length){
   const k=queue.shift()!;
   for(const r of this.db.prepare('SELECT node_id FROM derived_edges WHERE dep_key=?').all(k) as {node_id:string}[]){
    if(seen.has(r.node_id))continue;seen.add(r.node_id);
    this.db.prepare("UPDATE derived_nodes SET state='stale',stale_reason=? WHERE node_id=?").run(reason,r.node_id);
    queue.push('node:'+r.node_id);
   }
  }
  return [...seen].sort();
 }
 staleNodes246(){return this.db.prepare("SELECT node_id,kind,stale_reason FROM derived_nodes WHERE state='stale' ORDER BY node_id").all() as {node_id:string;kind:string;stale_reason:string|null}[];}
 derivedNode246(nodeId:string){return this.db.prepare('SELECT * FROM derived_nodes WHERE node_id=?').get(nodeId) as {state:string;result_sha256:string|null}|undefined;}

 // ---------------- Phase128 bridge ----------------
 /** Builds a Phase128 CategoryBrain128 from this store's category items: reviewed items with a concept become
  * reviewed definitions (their review cites store sources mapped to Phase128 source roles); everything else
  * stays proposed_unverified. Sources whose type has no Phase128 role cannot back a reviewed concept. */
 categoryBrain246(categoryId:string,aliases:readonly string[]):CategoryBrain128{
  const roleOf:Partial<Record<SourceType246,SourceRef128['role']>>={independent_original_test:'original_product_test',
   manufacturer:'manufacturer_specification',community:'user_problem_report'};
  const items=this.categoryItems246(categoryId).filter(i=>i.concept);
  const sources=new Map<string,SourceRef128>();
  const refFor=(revId:string,method:boolean):string|null=>{
   const r=this.db.prepare('SELECT r.url,r.revision_id,s.source_type FROM revisions r JOIN sources s USING(source_id) WHERE r.revision_id=?').get(revId) as {url:string;revision_id:string;source_type:SourceType246}|undefined;
   if(!r)return null;
   const role=method&&(r.source_type==='independent_original_test'||r.source_type==='editorial')?'original_expert_method':roleOf[r.source_type];
   if(!role)return null;
   const id=('src_'+r.revision_id.replace(/^rev_/,'')).slice(0,80);
   sources.set(id,{id,url:r.url,title:'Source revision '+r.revision_id,originalDocumentId:('doc_'+r.revision_id.replace(/^rev_/,'')).slice(0,80),role});
   return id;
  };
  const concepts:Concept128[]=[];
  for(const i of items){
   const refs=(i.review?.sourceRevisionIds??[]).map(r=>refFor(r,i.provenance==='professional_method_reference')).filter(Boolean) as string[];
   const reviewed=i.state==='reviewed'&&refs.length>0;
   const base={id:i.concept!.id,kind:i.concept!.kind,label:i.statement.slice(0,160).trim(),aliases:[...new Map(i.concept!.aliases.map(a=>[a.toLowerCase(),a.trim()])).values()],evidenceKeys:[]};
   if(concepts.some(c=>c.id===base.id))continue;
   concepts.push(reviewed?{...base,state:'reviewed_definition',review:{reviewId:ident(i.review!.reviewId)?i.review!.reviewId:'r_'+sha(i.review!.reviewId).slice(0,12),
    reviewerId:ident(i.review!.reviewerId)?i.review!.reviewerId:'reviewer_'+sha(i.review!.reviewerId).slice(0,8),sourceRefIds:[...new Set(refs)].sort(),reviewScope:'category_definition'} as Review128}:
    {...base,state:'proposed_unverified'});
  }
  const brain:CategoryBrain128={categoryId,schemaVersion:1,aliases:[...aliases],sources:[...sources.values()].sort((a,b)=>a.id.localeCompare(b.id)),
   concepts:concepts.sort((a,b)=>a.id.localeCompare(b.id)),quality:[],distinctions:[]};
  validateBrain128(brain);
  return brain;
 }
 /** Compiles the Phase128 projection and records it as a derived node depending on the category items. */
 compileCategory246(categoryId:string,aliases:readonly string[]){
  const compiled=compileCategoryKnowledge128(this.categoryBrain246(categoryId,aliases));
  this.registerDerived246('compiled128:'+categoryId,'phase128_compiled_category',['category:'+categoryId]);
  this.markComputed246('compiled128:'+categoryId,compiled.ontologySnapshot);
  return compiled;
 }

 // ---------------- Phase243 bridge ----------------
 /** Store products as Phase243 candidates; research state follows what is actually stored. */
 candidates243(categoryId:string,market:string,familyId='unreviewed_family'):CandidateResearch243[]{
  return this.products246({category:categoryId}).map(pid=>{
   const p=this.product246(pid)!;const d=this.declarations246(pid);
   return {product:{id:pid,categoryId,market,familyId,stage:d.length?'structured_record':'discovery_stub',editorialAppearances:[],
    officialProductIdentityConfirmed:p.identityState==='reviewed',marketListingConfirmed:false,novelVerifiedTechnicalFeature:false,
    explicitNeedTriggered:false,validatedNicheFit:false,verifiedDiscontinued:false},
    researchState:p.sources.some(s=>s.role==='main_product')?'cheap_screened':'unseen',signals:[],suspendedUnderScope:null,reviewedHighPotential:false};
  });
 }

 // ---------------- export, import, backup ----------------
 /** JSON export. Pending-rights declarations are excluded unless explicitly requested; never page bodies. */
 export246(opts:{includePendingRights?:boolean}={}){
  const tables:Record<string,unknown[]>={};
  for(const t of ['sources','revisions','sightings','products','variants','product_sources','declarations','category_items','category_versions',
   'derived_nodes','derived_edges','host_access','research_gaps','events','product_keys','revision_properties','category_relations','test_measurements265','qualitative_observations270','comparative_results271','relation_assessments','knowledge_statements','scientific_readings98']){
   let rows=this.db.prepare(`SELECT * FROM ${t}`).all() as Record<string,unknown>[];
   if((t==='declarations'||t==='test_measurements265'||t==='scientific_readings98')&&!opts.includePendingRights)rows=rows.filter(r=>r.retention==='facts_retained'||r.retention==='facts_retained_class_policy');
   tables[t]=rows;
  }
  const body={schema:'pee246.knowledge-export.v1',storeSchemaVersion:this.schemaVersion(),storagePolicy:this.storage,
   includesPendingRights:!!opts.includePendingRights,
   notice:opts.includePendingRights?'CONTAINS DECLARATIONS PENDING RIGHTS REVIEW: local use only, not for publication or redistribution.':
    'Declarations limited to sources whose policy permits fact storage.',tables};
  return {...body,contentSha256:sha(canon(body))};
 }
 writeExport246(path:string,opts:{includePendingRights?:boolean}={}):string{
  const e=this.export246(opts);mkdirSync(dirname(path),{recursive:true});
  const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(e)+'\n',{mode:0o600});renameSync(tmp,path);return e.contentSha256;
 }
 /** Rebuilds a store from an export into a NEW database file (refuses to overwrite). */
 static import246(exportPath:string,dbPath:string,storage:StoragePolicy246=DEFAULT_STORAGE_POLICY246):KnowledgeStore246{
  const e=JSON.parse(readFileSync(exportPath,'utf8'));
  const {contentSha256,...body}=e;
  if(e.schema!=='pee246.knowledge-export.v1'||sha(canon(body))!==contentSha256)throw Error('246_export_integrity_failed');
  if(e.storeSchemaVersion>STORE_SCHEMA_VERSION246)throw Error('246_export_newer_than_software');
  if(existsSync(dbPath))throw Error('246_import_target_exists');
  const s=new KnowledgeStore246(dbPath,storage);
  s.db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE; DROP TRIGGER events_no_update; DROP TRIGGER events_no_delete;');
  try{
   for(const [t,rows] of Object.entries(e.tables as Record<string,Record<string,unknown>[]>)){
    for(const r of rows){const cols=Object.keys(r);
     s.db.prepare(`INSERT INTO ${t}(${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).run(...cols.map(c=>r[c] as never));}
   }
   s.db.exec(`CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'append_only_events'); END;
    CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'append_only_events'); END; COMMIT; PRAGMA foreign_keys=ON;`);
  }catch(err){s.db.exec('ROLLBACK');s.close();rmSync(dbPath,{force:true});throw err;}
  if(!s.verifyJournal().ok){s.close();throw Error('246_imported_journal_broken');}
  return s;
 }
 private static readonly TABLE_KEYS:Record<string,string>={sources:'source_id',revisions:'revision_id',sightings:'revision_id,seen_at,run_id',
  products:'product_id',variants:'variant_id',product_sources:'product_id,revision_id,role',declarations:'declaration_id',category_items:'item_id',
  category_versions:'category_id,version',derived_nodes:'node_id',derived_edges:'dep_key,node_id',host_access:'host',research_gaps:'gap_id',events:'seq',
  product_keys:'key',revision_properties:'revision_id,product_id,property_key',category_relations:'relation_id',test_measurements265:'measurement_id',qualitative_observations270:'observation_id',comparative_results271:'result_id',relation_assessments:'assessment_id',knowledge_statements:'statement_id',scientific_readings98:'reading_id'};
 /** Diff-friendly export: one NDJSON file per table, rows in primary-key order, canonical JSON, plus a manifest
  * with per-file SHA-256. Re-exporting an unchanged store reproduces identical files, so a git history of
  * these files shows exactly which knowledge changed. Pending-rights values are excluded unless requested. */
 exportShards246(dir:string,opts:{includePendingRights?:boolean;audience?:'private'|'public'}={}):{manifestSha256:string;files:Record<string,{rows:number;sha256:string}>;audience:'private'|'public'}{
  // A public destination (e.g. a public repository) is publication: declaration values go there only when the
  // source policy permits derived publication; pending-rights values never do.
  const audience=opts.audience??'private';
  if(audience==='public'&&opts.includePendingRights)throw Error('246_pending_rights_never_public');
  const publishable=new Set((this.db.prepare('SELECT source_id,policy_json FROM sources').all() as {source_id:string;policy_json:string|null}[])
   .filter(r=>{try{return !!r.policy_json&&(JSON.parse(r.policy_json).permittedOperations??[]).includes('derived_publication');}catch{return false;}}).map(r=>r.source_id));
  const revSource=new Map((this.db.prepare('SELECT revision_id,source_id FROM revisions').all() as {revision_id:string;source_id:string}[]).map(r=>[r.revision_id,r.source_id]));
  mkdirSync(dir,{recursive:true});
  const files:Record<string,{rows:number;sha256:string}>={};
  for(const [t,key] of Object.entries(KnowledgeStore246.TABLE_KEYS)){
   let rows=this.db.prepare(`SELECT * FROM ${t} ORDER BY ${key}`).all() as Record<string,unknown>[];
   if((t==='declarations'||t==='test_measurements265'||t==='scientific_readings98')&&!opts.includePendingRights)rows=rows.filter(r=>r.retention==='facts_retained'||r.retention==='facts_retained_class_policy');
   // S98: typed readings derive from private retained values: never in a public destination
   if(t==='scientific_readings98'&&audience==='public')rows=[];
   if((t==='declarations'||t==='test_measurements265')&&audience==='public')rows=rows.filter(r=>r.retention==='facts_retained'&&publishable.has(revSource.get(r.revision_id as string)??''));
   // Phase270: qualitative codes are kept under a private amendment that permits no publication.
   if(t==='qualitative_observations270'&&audience==='public')rows=[];
   // S78: assessments cite owner research packages (private): never in a public destination
   if((t==='relation_assessments'||t==='knowledge_statements')&&audience==='public')rows=[];
   if(t==='comparative_results271'&&audience==='public')rows=rows.filter(r=>r.retention==='facts_retained'&&publishable.has(revSource.get(r.revision_id as string)??''));
   const body=rows.map(r=>canon(r)).join('\n')+(rows.length?'\n':'');
   const f=join(dir,t+'.ndjson');writeFileSync(f+'.tmp',body,{mode:0o600});renameSync(f+'.tmp',f);
   files[t+'.ndjson']={rows:rows.length,sha256:sha(body)};
  }
  const manifest={schema:'pee246.knowledge-shards.v1',storeSchemaVersion:this.schemaVersion(),storagePolicy:this.storage,
   includesPendingRights:!!opts.includePendingRights,audience,files};
  const text=JSON.stringify(manifest,null,1)+'\n';writeFileSync(join(dir,'manifest.json'),text,{mode:0o600});
  return {manifestSha256:sha(text),files,audience};
 }
 /** Rebuilds a NEW store from a shard directory after verifying every file hash. */
 static importShards246(dir:string,dbPath:string,storage:StoragePolicy246=DEFAULT_STORAGE_POLICY246):KnowledgeStore246{
  const m=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8'));
  if(m.schema!=='pee246.knowledge-shards.v1')throw Error('246_shards_schema');
  if(m.storeSchemaVersion>STORE_SCHEMA_VERSION246)throw Error('246_export_newer_than_software');
  const tables:Record<string,unknown[]>={};
  for(const [f,info] of Object.entries(m.files as Record<string,{rows:number;sha256:string}>)){
   const body=readFileSync(join(dir,f),'utf8');
   if(sha(body)!==info.sha256)throw Error('246_shard_integrity_failed:'+f);
   tables[f.replace(/\.ndjson$/,'')]=body.split('\n').filter(Boolean).map(l=>JSON.parse(l));
  }
  const body={schema:'pee246.knowledge-export.v1',storeSchemaVersion:m.storeSchemaVersion,storagePolicy:m.storagePolicy,
   includesPendingRights:m.includesPendingRights,notice:'rebuilt from shards',tables};
  const tmp=dbPath+'.import.json';writeFileSync(tmp,JSON.stringify({...body,contentSha256:sha(canon(body))}),{mode:0o600});
  try{return KnowledgeStore246.import246(tmp,dbPath,storage);}finally{rmSync(tmp,{force:true});}
 }

 // ---------------- revisit planning ----------------
 /** Decides, per current source revision, whether visiting it again has a purpose. Deterministic for a
  * given store state and asOf. Nothing is fetched here. */
 revisitPlan246(opts:{asOf:string;extractorVersion:string;baseIntervalDays?:number;urls?:readonly string[]}){
  const base=opts.baseIntervalDays??30;const asOf=Date.parse(opts.asOf);
  const revs=this.db.prepare(`SELECT r.revision_id,r.url,r.retention,r.extractor_version,r.declarations_seen,s.host,
   (SELECT MAX(seen_at) FROM sightings x WHERE x.revision_id=r.revision_id) AS last_seen FROM revisions r JOIN sources s USING(source_id)
   WHERE r.state='current' ORDER BY r.url`).all() as {revision_id:string;url:string;retention:string;extractor_version:string;declarations_seen:number;host:string;last_seen:string}[];
  const plan:{url:string;revisionId:string;action:string;reason:string;intervalDays:number;ageDays:number;rulesChanged:boolean}[]=[];
  for(const r of revs){
   if(opts.urls&&!opts.urls.includes(r.url))continue;
   const history=this.db.prepare('SELECT fetched_at FROM revisions WHERE url=? ORDER BY fetched_at').all(r.url) as {fetched_at:string}[];
   // Pages observed to change get a shorter interval (half the shortest observed change gap, 3..base days).
   const gaps=history.slice(1).map((h,i)=>(Date.parse(h.fetched_at)-Date.parse(history[i].fetched_at))/86400000).filter(g=>g>0);
   const interval=gaps.length?Math.max(3,Math.min(base,Math.min(...gaps)/2)):base;
   const age=(asOf-Date.parse(r.last_seen))/86400000;
   const identityGap=!!this.db.prepare("SELECT 1 FROM research_gaps WHERE resolved_at IS NULL AND ref_id=? AND kind='main_product_ambiguous'").get(r.revision_id);
   const valuesKeepable=VALUE_RETAINING246.includes(r.retention as RetentionClass246);
   const rulesChanged=r.extractor_version!==opts.extractorVersion+'+'+IDENTITY_RULES246;
   let action:string,reason:string;
   if(this.hostSuspended246(r.host,opts.asOf)){action='skip';reason='host_suspended';}
   else if(r.retention==='blocked'){action='skip';reason='source_blocked';}
   else if(rulesChanged&&(valuesKeepable||identityGap)){action='refetch';reason=valuesKeepable?'extraction_rules_changed_values_retainable':'extraction_rules_changed_identity_gap';}
   else if(age<interval){action='skip';reason=`verified_${Math.floor(age)}d_ago_interval_${Math.round(interval)}d`;}
   else if(!valuesKeepable&&!identityGap){action='low_value';reason='metadata_only_source_revisit_yields_hash_only';}
   else {action='refetch';reason='revisit_interval_elapsed';}
   plan.push({url:r.url,revisionId:r.revision_id,action,reason,intervalDays:Math.round(interval*10)/10,ageDays:Math.round(age*10)/10,rulesChanged});
  }
  const count=(a:string)=>plan.filter(p=>p.action===a).length;
  return {asOf:opts.asOf,extractorVersion:opts.extractorVersion,summary:{revisions:plan.length,refetch:count('refetch'),skip:count('skip'),lowValue:count('low_value')},plan};
 }

 // ---------------- rights review ----------------
 /** Per-source worksheet for an operator rights decision: what is observed, what is retained now, and what a
  * fact_storage policy would allow keeping. It grants nothing. */
 rightsWorksheet246(){
  return (this.db.prepare(`SELECT s.source_id,s.host,s.source_type,s.retention,COUNT(r.revision_id) AS revisions,
   COALESCE(SUM(r.declarations_seen),0) AS seen,COALESCE(SUM(r.declarations_retained),0) AS retained
   FROM sources s LEFT JOIN revisions r USING(source_id) GROUP BY s.source_id ORDER BY seen DESC,s.host`).all() as Record<string,string|number>[]).map(x=>({
   sourceId:x.source_id,host:x.host,sourceType:x.source_type,currentRetention:x.retention,revisions:x.revisions,
   declarationsObserved:x.seen,declarationsRetained:x.retained,
   retainableWithFactStoragePolicy:x.seen,
   decisionNeeded:x.retention==='facts_retained'?'none':'operator review of the site terms; record a WebSourcePolicy with basis, rights document, reviewer, validity and permittedOperations including fact_storage, or keep metadata only',
   whatWouldBeStored:'short declared values (<=120 chars) with property, unit, section, locator and the page hash; never page text or images'}));
 }
 /** Consistent online backup (SQLite VACUUM INTO) to a new file. */
 backup246(destPath:string):void{
  if(existsSync(destPath))throw Error('246_backup_target_exists');
  mkdirSync(dirname(destPath),{recursive:true});
  this.db.exec(`VACUUM INTO '${destPath.replace(/'/g,"''")}'`);
 }
 /** Phase249: timestamped, verified backup in `dir`, keeping the newest `keep` backups. Each backup gets a manifest
  * (SHA-256, schema version, counts, journal check) so a restore can be checked before use. */
 backupRotate249(dir:string,keep=7,at=new Date().toISOString()):{path:string;manifest:BackupManifest249;removed:string[]}{
  if(!Number.isInteger(keep)||keep<1)throw Error('249_invalid_keep');
  mkdirSync(dir,{recursive:true});
  const path=join(dir,`pee-knowledge-${at.replace(/[:.]/g,'-')}.sqlite`);
  this.backup246(path);
  const manifest=verifyStoreFile249(path);
  if(!manifest.integrityOk||!manifest.journalOk){rmSync(path,{force:true});throw Error('249_backup_failed_verification');}
  writeFileSync(path+'.manifest.json',JSON.stringify(manifest,null,1)+'\n');
  const all=readdirSync(dir).filter(f=>/^pee-knowledge-.*\.sqlite$/.test(f)).sort();
  const removed=all.slice(0,Math.max(0,all.length-keep)).map(f=>join(dir,f));
  for(const f of removed){rmSync(f,{force:true});rmSync(f+'.manifest.json',{force:true});}
  this.event('backup_written',{path,sha256:manifest.sha256,removed:removed.length},at);
  return {path,manifest,removed};
 }
 stats246(){
  const c=(sql:string)=>(this.db.prepare(sql).get() as {n:number}).n;
  return {schemaVersion:this.schemaVersion(),sources:c('SELECT COUNT(*) n FROM sources'),revisions:c('SELECT COUNT(*) n FROM revisions'),
   sightings:c('SELECT COUNT(*) n FROM sightings'),products:c('SELECT COUNT(*) n FROM products'),variants:c('SELECT COUNT(*) n FROM variants'),
   declarations:c('SELECT COUNT(*) n FROM declarations'),declarationsRetained:c("SELECT COUNT(*) n FROM declarations WHERE retention='facts_retained'"),
   declarationsRetainedClassPolicy:c("SELECT COUNT(*) n FROM declarations WHERE retention='facts_retained_class_policy' AND state NOT IN ('superseded_by_revision','superseded_by_extractor')"),
   declarationsPendingRights:c("SELECT COUNT(*) n FROM declarations WHERE retention='local_pending_rights_review' AND state!='expired_pending_rights'"),
   declarationsObservedNotRetained:c('SELECT COALESCE(SUM(declarations_seen-declarations_retained),0) n FROM revisions'),
   categoryItems:c('SELECT COUNT(*) n FROM category_items'),categoryVersions:c('SELECT COUNT(*) n FROM category_versions'),
   staleDerived:c("SELECT COUNT(*) n FROM derived_nodes WHERE state='stale'"),openGaps:c('SELECT COUNT(*) n FROM research_gaps WHERE resolved_at IS NULL'),
   events:c('SELECT COUNT(*) n FROM events'),suspendedHosts:c('SELECT COUNT(*) n FROM host_access WHERE suspended_until IS NOT NULL')};
 }
}

/** Phase249 storage helpers. */
export function insideGitWorkTree249(path:string):boolean{
 let d=dirname(resolvePath(path));
 for(let i=0;i<64;i++){if(existsSync(join(d,'.git')))return true;const up=dirname(d);if(up===d)return false;d=up;}
 return false;
}
export interface BackupManifest249 {file:string;sha256:string;bytes:number;schemaVersion:number|null;integrityOk:boolean;journalOk:boolean;
 counts:Record<string,number>;verifiedAt:string}
/** Opens a store file read-only and checks SQLite integrity, the hash-chained event journal and basic counts. */
export function verifyStoreFile249(path:string):BackupManifest249{
 const bytes=readFileSync(path);const db=new DatabaseSync(path,{readOnly:true});
 try{
  const integrity=(db.prepare('PRAGMA integrity_check').get() as {integrity_check:string}).integrity_check==='ok';
  const version=(db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version;
  const count=(t:string)=>{try{return (db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as {n:number}).n;}catch{return -1;}};
  const counts=Object.fromEntries(['sources','revisions','products','declarations','category_items','events'].map(t=>[t,count(t)]));
  // The hash-chained journal is re-verified on the read-only connection (the file is never modified).
  const rows=db.prepare('SELECT * FROM events ORDER BY seq').all() as {at:string;kind:string;payload_json:string;previous_sha256:string;event_sha256:string}[];
  let prev='0'.repeat(64),journalOk=true;
  for(const r of rows){if(r.previous_sha256!==prev||sha(canon({at:r.at,kind:r.kind,payload:JSON.parse(r.payload_json),prev}))!==r.event_sha256){journalOk=false;break;}prev=r.event_sha256;}
  db.close();
  return {file:path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,schemaVersion:version,
   integrityOk:integrity,journalOk,counts,verifiedAt:new Date().toISOString()};
 }catch(e){try{db.close();}catch{/* already closed */}throw e;}
}
/** Restores a verified backup over `target`, keeping the replaced file as `<target>.replaced-<time>`. */
export function restoreStore249(backup:string,target:string,at=new Date().toISOString()):{restored:string;keptPrevious:string|null;manifest:BackupManifest249}{
 const m=verifyStoreFile249(backup);
 if(!m.integrityOk||!m.journalOk)throw Error('249_backup_not_restorable');
 const mf=backup+'.manifest.json';
 if(existsSync(mf)){const rec=JSON.parse(readFileSync(mf,'utf8')) as BackupManifest249;if(rec.sha256!==m.sha256)throw Error('249_backup_hash_mismatch');}
 mkdirSync(dirname(target),{recursive:true});
 let kept:string|null=null;
 if(existsSync(target)){kept=`${target}.replaced-${at.replace(/[:.]/g,'-')}`;renameSync(target,kept);
  for(const x of ['-wal','-shm'])if(existsSync(target+x))renameSync(target+x,kept+x);}
 copyFileSync(backup,target);
 if(statSync(target).size!==m.bytes)throw Error('249_restore_size_mismatch');
 return {restored:target,keptPrevious:kept,manifest:m};
}
