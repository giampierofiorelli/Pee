/** Phase228: public PDF/DOCX metadata/specification leads, research-only.
 * Source URL -> existing safe HTTPS/robots -> volatile binary -> local reader.
 * Does not retain PDF/DOCX bodies, text paragraphs or review excerpts.
 */
import {createHash} from 'node:crypto';
import {buildDocumentDiscrepancies238,type DocumentDiscrepancies238} from './phase238_document_discrepancy_graph.js';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {RESEARCH_AGENT,restrictedHttpsTransport,type SourceTransport} from './approved_web_reader.js';
import {publicRobotsDecision223} from './phase223_public_metadata_access.js';
import {safeMetadataUrl75} from './phase75_source_discovery.js';
import type {Registry220,Run220} from './phase220_autonomous_discovery_worker.js';
import type {SearchRun223} from './phase223_search_discovery.js';
const sha=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
export type Format228='pdf'|'docx';
export interface DocClaim228 {
 claimId:string;label:string;value:number|null;unit:string;model:string|null;
 modelAssignment:'single_declared_model_unverified'|'unresolved';
 locator:{page?:number;line?:number;paragraph?:number;table?:number;row?:number;box?:readonly [number,number,number,number]};
 extractionMethod?:'plain_key_value'|'poppler_aligned_two_column_candidate'|'poppler_scoped_component_table_candidate'|'pdf_explicit_variant_weight_candidate'|'pdf_explicit_scoped_interval_candidate'|'pdf_authored_accessory_list_candidate'|'pdf_authored_feature_status_candidate'|'pdf_explicit_catalog_model_column_candidate'|'pdf_typed_technical_sheet_candidate'|'pdf_explicit_three_axis_dimension_candidate'|'pdf_explicit_unresolved_model_condition_candidate'|'pdf_typed_sheet_interval_candidate'|'pdf_explicit_conditional_component_use_candidate'|'pdf_author_explicit_operating_program_candidate'|'pdf_authored_multi_axis_programme_table_candidate'|'pdf_author_scoped_technical_english_candidate'|'pdf_authored_cooking_guide_tuple_candidate'|'pdf_author_explicit_manual_control_candidate';
 componentModel?:string;componentType?:'document_declared_subcomponent';
 variantModel?:string;variantType?:'document_declared_product_variant';
 /** Full header label in an original product-range column; never a verified SKU. */
 catalogModel?:string;catalogType?:'document_declared_catalog_product';
 /** True multidimensional sizes, not a scalar or product weight. */
 vector?:{axes:readonly string[];values:readonly number[];unit:string};
 measurementBasis?:string;
 /** Document-authored selection conditioned on optional accessory presence;
     no commercial SKU inclusion inferred. */
 configurationDependency?:{triggerAccessory:string;triggerState:'present'|'absent';requirement:'use_dimension_when_condition_met'};
 /** Machine-control programme setting, explicitly not a recipe or test. */
 programSetting?:{program:string;setting:'cooking_duration';defaultValue:number;unit:'hours';context:'operating_instruction_not_test'};
 /** The author's programme grid, preserving food, default, range and temperature as one scoped tuple. */
 programTableSetting?:{program:string;foodType:string|null;defaultDurationMinutes:number;
  adjustableDurationMinutes:{lower:number;upper:number};defaultTemperatureCelsius:number;
  context:'manufacturer_programme_table_not_test'};
 /** Manufacturer-recommended food preparation tuple; NOT observed cooking outcome. */
 cookingGuideSetting?:{food:string;drawer:1|2;foodLoad:{value:number;unit:'g'|'kg'};
  durationMinutes:{lower:number;upper:number};recommendedTemperatureCelsius:number;
  context:'manufacturer_cooking_guide_not_test'};
 /** Explicit appliance controls; NOT evidence of temperature accuracy. */
 manualControlSetting?:{program:'manual';parameter:'thermostat'|'timer';lower:number;upper:number;
  unit:'°C'|'minutes';context:'manufacturer_machine_control_not_test'};
 /** Source-authored interval, NOT a scalar point estimate. */
 range?:{lower:number;upper:number;unit:string};
 scopeComponent?:string|null;condition?:string|null;
 optionStatus?:'not_established'|'standard'|'optional'|'conditional_unresolved';
 availabilityKind?:'accessory'|'feature';
 sourceRole:'publisher_document_claim_unverified';testedPerformance:false;
 methodReviewed:false;exactVariantVerified:false;rankingAuthorized:false;
}
/** Phase240: a numeric position WITHOUT a verified pictogram/column label.
 * Review-only, never an attributed product specification or scientific result. */
export interface VisualTableSlot240 {
 page:number;box:[number,number,number,number];kind:'unassigned_programme_duration'|'unassigned_illustrated_food_time';
 durationSeconds:{lower:number;upper:number};association:'unresolved_icon_or_column_heading';
 sourceRole:'manufacturer_layout_candidate_not_test';rankingAuthorized:false;
}
export interface ParsedDocument228 {
 schema:'pee228.document-claims.v1';format:Format228;documentSha256:string|null;
 declaredModel:string|null;claimCount:number;claims:DocClaim228[];reasonCodes:string[];
 rawTextStored:false;rawDocumentStored:false;scientificEvidenceAdmitted:false;rankingAuthorized:false;
 discrepancies?:DocumentDiscrepancies238;visualTableSlots?:VisualTableSlot240[];
}
export interface DocumentReceipt228 {
 url:string;sourceId:string;format:Format228;status:'parsed_unverified'|'blocked'|'needs_review';
 documentSha256:string|null;claims:readonly DocClaim228[];reasonCodes:string[];
 rawTextStored:false;rawDocumentStored:false;rankingAuthorized:false;
 discrepancies?:DocumentDiscrepancies238;visualTableSlots?:VisualTableSlot240[];
}
export interface DocumentObservation228 {
 schema:'pee228.document-observation.v1';mode:'live'|'synthetic_fixture';
 attemptedUrls:readonly string[];receipts:readonly DocumentReceipt228[];
 scientificEvidenceAdmitted:false;rankingAuthorized:false;noDocumentBodiesStored:true;
}
export const documentFormat228=(url:string):Format228|null=>{
 try{const p=new URL(url).pathname.toLowerCase();return p.endsWith('.pdf')?'pdf':p.endsWith('.docx')?'docx':null;}catch{return null;}
};
/** Local Python 3 standard library + optional Poppler pdftotext for PDF text.
 * Isolated interpreter, no shell, no temporary original document, no network calls.
 */
export async function parseDocumentBytes228(original:Uint8Array,format:Format228):Promise<ParsedDocument228>{
 if(!(original instanceof Uint8Array)||!original.length||original.length>(format==='pdf'?40_000_000:6_000_000))throw Error('phase228_invalid_binary_size');
 if(!['pdf','docx'].includes(format))throw Error('phase228_invalid_format');
 const script=fileURLToPath(new URL('../../document_intake/phase228_extract.py',import.meta.url));
 const child=spawn('python3',['-I',script,'--format',format],{stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH??'/usr/bin:/bin',LANG:'C.UTF-8'}});
 const chunks:Buffer[]=[];let count=0;let error='';const timeout=setTimeout(()=>child.kill('SIGKILL'),15000);
 child.stdout.on('data',(b:Buffer)=>{count+=b.length;if(count>120_000)child.kill('SIGKILL');else chunks.push(b);});
 child.stderr.on('data',(b:Buffer)=>{error+=(b.toString('utf8')).slice(0,500);});
 child.stdin.on('error',()=>{});child.stdin.end(Buffer.from(original));
 const exit:number|null=await new Promise<number|null>((res,rej)=>{child.on('error',rej);child.on('close',res);}).finally(()=>clearTimeout(timeout));
 if(exit!==0||count>120_000)throw Error('phase228_document_reader_failed:'+error.slice(0,100));
 const data:ParsedDocument228=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(data.schema!=='pee228.document-claims.v1'||data.format!==format||data.documentSha256!==sha(original)||
  data.rankingAuthorized!==false||data.scientificEvidenceAdmitted!==false||data.rawDocumentStored!==false||data.rawTextStored!==false||
  !Array.isArray(data.claims)||data.claims.length>90||data.claimCount!==data.claims.length)throw Error('phase228_invalid_parser_receipt');
 // Phase240: reject output that tries to present pictogram-only numeric slots
 // as anything except unresolved, position-bound visual inspection candidates.
 if(data.visualTableSlots!==undefined&&(
   !Array.isArray(data.visualTableSlots)||data.visualTableSlots.length>32||format!=='pdf'||
   data.visualTableSlots.some(c=>
     !c||Object.keys(c).sort().join(',')!=='association,box,durationSeconds,kind,page,rankingAuthorized,sourceRole'||
     !Number.isInteger(c.page)||c.page<1||c.page>24||
     !Array.isArray(c.box)||c.box.length!==4||
     c.box.some(x=>!Number.isFinite(x)||x<0||x>2000)||
     !(c.box[0]<c.box[2]&&c.box[1]<c.box[3])||
     !['unassigned_programme_duration','unassigned_illustrated_food_time'].includes(c.kind)||
     !Number.isInteger(c.durationSeconds?.lower)||!Number.isInteger(c.durationSeconds?.upper)||
     c.durationSeconds.lower<=0||c.durationSeconds.upper<c.durationSeconds.lower||
     c.durationSeconds.upper>10800||
     c.association!=='unresolved_icon_or_column_heading'||
     c.sourceRole!=='manufacturer_layout_candidate_not_test'||c.rankingAuthorized!==false)))
    throw Error('phase240_invalid_visual_slot');
 // Phase232: a declared variant is never an exact verified parent model.
 // Validate the scope boundary at the Python->TypeScript process boundary.
 if(data.claims.some(c=>c.variantModel!==undefined&&(
   !/^[A-Z]{1,6}[0-9]{2,5}(?:-[A-Z0-9]{1,8})?$/.test(c.variantModel)||
   c.variantType!=='document_declared_product_variant'||c.model!==null||
   c.modelAssignment!=='unresolved'||c.exactVariantVerified!==false||
   c.rankingAuthorized!==false||c.testedPerformance!==false||
   c.sourceRole!=='publisher_document_claim_unverified'
 )))throw Error('phase232_invalid_variant_scope');
 // Phase233: typed intervals cannot leak a lower endpoint as a scalar value.
 if(data.claims.some(c=>c.range!==undefined&&(
   c.value!==null||!Number.isFinite(c.range.lower)||!Number.isFinite(c.range.upper)||
   c.range.lower<0||c.range.upper<=c.range.lower||c.range.upper>10000000||
   c.range.unit!==c.unit||c.model!==null||c.modelAssignment!=='unresolved'||
   c.optionStatus!=='not_established'||
   !( (c.extractionMethod==='pdf_author_scoped_technical_english_candidate'&&
      ['input voltage','input frequency'].includes(c.label)&&
      (c.label==='input voltage'?c.unit==='v':c.unit==='hz')&&
      c.condition===null&&c.scopeComponent===null)||
      c.extractionMethod==='pdf_explicit_scoped_interval_candidate'||
     (c.extractionMethod==='pdf_typed_sheet_interval_candidate'&&
      (c.label==='voltage'&&c.unit==='v'||c.label==='total rated load'&&c.unit==='kw')&&
      c.scopeComponent===null&&c.condition===null)||
     (c.extractionMethod==='pdf_author_explicit_operating_program_candidate'&&
      c.label==='cooking program adjustable duration'&&c.unit==='hours'&&
      c.condition==='user-adjustable'&&c.programSetting?.context==='operating_instruction_not_test'&&
      c.programSetting?.setting==='cooking_duration'&&c.programSetting?.unit==='hours'&&
      /^[a-z][a-z -]{2,28}$/.test(c.programSetting.program)&&
      c.scopeComponent===c.programSetting.program+' program'&&
      Number.isInteger(c.range.lower)&&Number.isInteger(c.range.upper)&&
      Number.isInteger(c.programSetting.defaultValue)&&c.range.lower>0&&
      c.range.upper<=48&&c.programSetting.defaultValue>=c.range.lower&&
      c.programSetting.defaultValue<=c.range.upper))||
   (c.extractionMethod!=='pdf_author_explicit_operating_program_candidate'&&
    c.extractionMethod!=='pdf_author_scoped_technical_english_candidate'&&
     ((c.scopeComponent!==null&&c.scopeComponent!==undefined&&
        !['frontal c-arm','lateral l-arc'].includes(c.scopeComponent))||
      (c.condition!==null&&c.condition!==undefined&&
        !['low voltage','high voltage'].includes(c.condition))))||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||
   c.testedPerformance!==false||c.sourceRole!=='publisher_document_claim_unverified'
 )))throw Error('phase233_invalid_interval_scope');
 // Phase234-235: categorical manufacturer availability never certifies a SKU.
 if(data.claims.some(c=>(c.availabilityKind!==undefined||['standard','optional','conditional_unresolved'].includes(c.optionStatus??''))&&(
   !['accessory','feature'].includes(c.availabilityKind??'')||
   !['standard','optional','conditional_unresolved'].includes(c.optionStatus??'')||
   c.unit!=='availability'||c.value!==null||c.range!==undefined||c.vector!==undefined||
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.variantModel!==undefined||c.componentModel!==undefined||c.catalogModel!==undefined||
   (c.optionStatus==='conditional_unresolved'&&(
     c.availabilityKind!=='accessory'||c.condition!=='on certain models only'||
     c.scopeComponent!==null||c.extractionMethod!=='pdf_explicit_unresolved_model_condition_candidate'))||
   (c.optionStatus!=='conditional_unresolved'&&c.availabilityKind==='accessory'&&(
     c.scopeComponent!=='patient table'||c.extractionMethod!=='pdf_authored_accessory_list_candidate'))||
   (c.availabilityKind==='feature'&&(
     c.optionStatus==='conditional_unresolved'||c.scopeComponent!==null||
     c.extractionMethod!=='pdf_authored_feature_status_candidate'))||
   c.exactVariantVerified!==false||c.testedPerformance!==false||
   c.methodReviewed!==false||c.rankingAuthorized!==false||
   c.sourceRole!=='publisher_document_claim_unverified'
 )))throw Error('phase235_invalid_availability_scope');
 // Phase236: a paired author-selected component must remain a local
 // configuration rule, NEVER verification of a bundled optional accessory.
 if(data.claims.some(c=>(c.configurationDependency!==undefined||
   c.extractionMethod==='pdf_explicit_conditional_component_use_candidate')&&(
   c.extractionMethod!=='pdf_explicit_conditional_component_use_candidate'||
   c.configurationDependency?.requirement!=='use_dimension_when_condition_met'||
   !/^[a-z][a-z -]{2,35}$/.test(c.configurationDependency.triggerAccessory)||
   !['present','absent'].includes(c.configurationDependency.triggerState)||
   c.condition!==c.configurationDependency.triggerAccessory+' '+c.configurationDependency.triggerState||
   !/^[a-z]{2,22} (tube|hose|cable)$/.test(c.scopeComponent??'')||
   c.label!==c.scopeComponent+' length'||c.unit!=='cm'||
   !Number.isFinite(c.value)||c.value!<=0||c.value!>=1000||
   c.range!==undefined||c.vector!==undefined||c.programSetting!==undefined||
   c.optionStatus!=='not_established'||c.availabilityKind!==undefined||
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.variantModel!==undefined||c.componentModel!==undefined||c.catalogModel!==undefined||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||
   c.testedPerformance!==false||c.sourceRole!=='publisher_document_claim_unverified'
 )))throw Error('phase236_invalid_conditional_configuration');
 // Phase236: operating-program ranges never become product performance.
 if(data.claims.some(c=>(c.programSetting!==undefined||
   c.extractionMethod==='pdf_author_explicit_operating_program_candidate')&&(
   c.extractionMethod!=='pdf_author_explicit_operating_program_candidate'||
   c.programSetting?.context!=='operating_instruction_not_test'||
   c.configurationDependency!==undefined||c.availabilityKind!==undefined||
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.variantModel!==undefined||c.componentModel!==undefined||c.catalogModel!==undefined||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||c.testedPerformance!==false||
   c.sourceRole!=='publisher_document_claim_unverified'
 )))throw Error('phase236_invalid_operating_instruction');
 // Phase237: multi-axis programme tuples must remain a single operating-
 // instruction statement. No scalar, verified SKU, recipe outcome or ranking.
 if(data.claims.some(c=>(c.programTableSetting!==undefined||
  c.extractionMethod==='pdf_authored_multi_axis_programme_table_candidate')&&(
   c.extractionMethod!=='pdf_authored_multi_axis_programme_table_candidate'||
   c.programTableSetting?.context!=='manufacturer_programme_table_not_test'||
   !/^[a-z][a-z /-]{2,24}$/.test(c.programTableSetting.program)||
   (c.programTableSetting.foodType!==null&&
    !['veg','fish','poultry','meat'].includes(c.programTableSetting.foodType))||
   c.scopeComponent!==c.programTableSetting.program+' program'||
   c.condition!==(c.programTableSetting.foodType===null?'program default':
    'food type: '+c.programTableSetting.foodType)||
   c.label!=='cooking programme control settings'||c.unit!=='operating_settings'||
   c.value!==null||c.range!==undefined||c.vector!==undefined||
   c.optionStatus!=='not_established'||c.availabilityKind!==undefined||
   c.configurationDependency!==undefined||c.programSetting!==undefined||
   !Number.isInteger(c.programTableSetting.defaultDurationMinutes)||
   !Number.isInteger(c.programTableSetting.adjustableDurationMinutes?.lower)||
   !Number.isInteger(c.programTableSetting.adjustableDurationMinutes?.upper)||
   c.programTableSetting.adjustableDurationMinutes.lower<=0||
   c.programTableSetting.adjustableDurationMinutes.upper>1440||
   c.programTableSetting.adjustableDurationMinutes.upper<=c.programTableSetting.adjustableDurationMinutes.lower||
   c.programTableSetting.defaultDurationMinutes<c.programTableSetting.adjustableDurationMinutes.lower||
   c.programTableSetting.defaultDurationMinutes>c.programTableSetting.adjustableDurationMinutes.upper||
   !Number.isInteger(c.programTableSetting.defaultTemperatureCelsius)||
   c.programTableSetting.defaultTemperatureCelsius<1||c.programTableSetting.defaultTemperatureCelsius>250||
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.variantModel!==undefined||c.componentModel!==undefined||c.catalogModel!==undefined||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||c.testedPerformance!==false||
   c.methodReviewed!==false||c.sourceRole!=='publisher_document_claim_unverified'
  )))throw Error('phase237_invalid_programme_table_scope');
 // Phase239: a cooking guide is an unverified instruction associated with
 // an explicitly named food and drawer, never a result or a product dimension.
 if(data.claims.some(c=>(c.cookingGuideSetting!==undefined||
  c.extractionMethod==='pdf_authored_cooking_guide_tuple_candidate')&&(
   c.extractionMethod!=='pdf_authored_cooking_guide_tuple_candidate'||
   c.cookingGuideSetting?.context!=='manufacturer_cooking_guide_not_test'||
   !/^[a-z][a-z /-]{2,48}$/.test(c.cookingGuideSetting?.food??'')||
   ![1,2].includes(c.cookingGuideSetting?.drawer??0)||
   c.scopeComponent!=='drawer '+c.cookingGuideSetting?.drawer||
   c.condition!=='food: '+c.cookingGuideSetting?.food||
   c.cookingGuideSetting?.foodLoad?.unit!=='g'&&c.cookingGuideSetting?.foodLoad?.unit!=='kg'||
   !Number.isFinite(c.cookingGuideSetting?.foodLoad?.value)||
   c.cookingGuideSetting!.foodLoad.value<=0||c.cookingGuideSetting!.foodLoad.value>1500||
   !Number.isInteger(c.cookingGuideSetting?.durationMinutes?.lower)||
   !Number.isInteger(c.cookingGuideSetting?.durationMinutes?.upper)||
   c.cookingGuideSetting!.durationMinutes.lower<=0||
   c.cookingGuideSetting!.durationMinutes.upper<c.cookingGuideSetting!.durationMinutes.lower||
   c.cookingGuideSetting!.durationMinutes.upper>180||
   !Number.isInteger(c.cookingGuideSetting?.recommendedTemperatureCelsius)||
   c.cookingGuideSetting!.recommendedTemperatureCelsius<35||
   c.cookingGuideSetting!.recommendedTemperatureCelsius>240||
   c.label!=='cooking guide recommendation'||c.unit!=='operating_recommendation'||
   c.value!==null||c.range!==undefined||c.vector!==undefined||
   c.optionStatus!=='not_established'||c.availabilityKind!==undefined||
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.variantModel!==undefined||c.catalogModel!==undefined||c.componentModel!==undefined||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||c.testedPerformance!==false||
   c.methodReviewed!==false||c.sourceRole!=='publisher_document_claim_unverified'
  )))throw Error('phase239_invalid_cooking_guide_scope');
 if(data.claims.some(c=>(c.manualControlSetting!==undefined||
  c.extractionMethod==='pdf_author_explicit_manual_control_candidate')&&(
   c.extractionMethod!=='pdf_author_explicit_manual_control_candidate'||
   c.manualControlSetting?.context!=='manufacturer_machine_control_not_test'||
   c.manualControlSetting?.program!=='manual'||
   !['thermostat','timer'].includes(c.manualControlSetting?.parameter??'')||
   c.manualControlSetting?.unit!==(c.manualControlSetting?.parameter==='thermostat'?'°C':'minutes')||
   c.label!=='manual programme '+c.manualControlSetting?.parameter+' adjustment'||
   c.unit!=='operating_control'||c.scopeComponent!=='manual program'||
   c.condition!=='user adjustable'||c.optionStatus!=='not_established'||
   !Number.isInteger(c.manualControlSetting?.lower)||!Number.isInteger(c.manualControlSetting?.upper)||
   c.manualControlSetting!.lower<0||c.manualControlSetting!.upper<=c.manualControlSetting!.lower||
   c.manualControlSetting!.upper>(c.manualControlSetting?.parameter==='thermostat'?250:240)||
   c.value!==null||c.range!==undefined||c.vector!==undefined||
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.variantModel!==undefined||c.catalogModel!==undefined||c.componentModel!==undefined||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||c.testedPerformance!==false||
   c.methodReviewed!==false||c.sourceRole!=='publisher_document_claim_unverified'
  )))throw Error('phase239_invalid_manual_control_scope');
 // Phase235: product catalogue headers are provisional *whole-product*
 // references (unlike componentModel), isolated from verified retail SKUs.
 if(data.claims.some(c=>c.catalogModel!==undefined&&(
   !/^[A-Z]{2,4}\s+[0-9]{3,5}(?:\s+[A-Za-z][A-Za-z0-9*\-]{0,18})?$/.test(c.catalogModel)||
   c.catalogType!=='document_declared_catalog_product'||
   !['rated capacity','net weight','spin speed'].includes(c.label)||
   !['kg','rpm'].includes(c.unit)||!Number.isFinite(c.value)||c.value!<=0||
   c.model!==null||c.modelAssignment!=='unresolved'||c.variantModel!==undefined||
   c.componentModel!==undefined||c.range!==undefined||c.vector!==undefined||
   c.extractionMethod!=='pdf_explicit_catalog_model_column_candidate'||
   c.exactVariantVerified!==false||c.rankingAuthorized!==false||c.testedPerformance!==false||
   c.sourceRole!=='publisher_document_claim_unverified'
 )))throw Error('phase235_invalid_catalog_model_scope');
 if(data.claims.some(c=>c.vector!==undefined&&(
   !(c.extractionMethod==='pdf_explicit_three_axis_dimension_candidate'||
     c.extractionMethod==='pdf_author_scoped_technical_english_candidate')||
   !['dimensions (h x w x d)','dimensions (h x w x l)'].includes(c.label)||c.unit!=='mm'||c.value!==null||
   c.model!==null||c.modelAssignment!=='unresolved'||
   JSON.stringify(c.vector.axes)!==(c.label==='dimensions (h x w x l)'?'["height","width","length"]':'["height","width","depth"]')||
   c.vector.unit!=='mm'||c.vector.values.length!==3||
   c.vector.values.some(x=>!Number.isInteger(x)||x<1||x>30000)||
   c.catalogModel!==undefined||c.variantModel!==undefined||c.componentModel!==undefined||
   c.rankingAuthorized!==false||c.testedPerformance!==false
 )))throw Error('phase235_invalid_dimension_vector');
 // Phase238: English authored technical sheet claims retain exact condition
 // and entity axis. This source type is never verified, a measurement or SKU.
 if(data.claims.some(c=>c.extractionMethod==='pdf_author_scoped_technical_english_candidate'&&(
   c.model!==null||c.modelAssignment!=='unresolved'||
   c.sourceRole!=='publisher_document_claim_unverified'||
   c.testedPerformance!==false||c.rankingAuthorized!==false||c.exactVariantVerified!==false||
   c.optionStatus!=='not_established'||c.methodReviewed!==false||
   c.variantModel!==undefined||c.catalogModel!==undefined||c.componentModel!==undefined||
   !(
    (c.range!==undefined&&c.value===null&&c.vector===undefined&&
      ((c.label==='input voltage'&&c.unit==='v')||(c.label==='input frequency'&&c.unit==='hz'))&&
      c.condition===null&&c.scopeComponent===null)||
    (c.vector!==undefined&&c.value===null&&c.range===undefined&&
      c.label==='dimensions (h x w x l)'&&c.unit==='mm'&&
      c.condition===null&&c.scopeComponent===null)||
    (c.range===undefined&&c.vector===undefined&&Number.isFinite(c.value)&&c.value!>0&&
      ((c.label==='nominal power'&&c.unit==='w'&&c.condition===null&&c.scopeComponent===null)||
       (c.label==='weight'&&c.unit==='kg'&&c.condition===null&&c.scopeComponent===null)||
       (c.label==='water tank capacity'&&c.unit==='l'&&c.scopeComponent==='water tank'&&
        ['with filter','without filter'].includes(c.condition??''))||
       (c.label==='power consumption'&&c.unit==='w'&&c.scopeComponent===null&&
        ['networked standby','low power'].includes(c.condition??''))))
   )
 )))throw Error('phase238_invalid_scoped_english_technical_claim');
 if(data.claims.some(c=>c.measurementBasis!==undefined&&(
   !['per cycle','per 100 operating cycles; wash cycle'].includes(c.measurementBasis)||
   c.extractionMethod!=='pdf_typed_technical_sheet_candidate'||
   !Number.isFinite(c.value)||c.value!<0||c.modelAssignment!=='unresolved'||
   c.catalogModel!==undefined||c.rankingAuthorized!==false||c.testedPerformance!==false
 )))throw Error('phase235_invalid_measurement_basis');
 return {...data,discrepancies:buildDocumentDiscrepancies238(data.documentSha256,data.claims)};
}
export async function observeDiscoveredDocuments228(input:{run:Run220;registry:Registry220;observedAt:string;
 maxDocuments?:number;mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;
 sourceRestrictions?:Readonly<Record<string,'not_reviewed'|'no_known_restriction'|'explicitly_prohibited'|'login_required'>>;
}):Promise<DocumentObservation228>{
 const mode=input.mode??'live';
 if((mode==='live'&&input.fixtureTransport)||(mode==='synthetic_fixture'&&!input.fixtureTransport))throw Error('phase228_test_transport_boundary');
 if(input.run.schema!=='pee220.run.1'||input.run.mode!==mode||input.registry.schema!=='pee220.registry.1'||
  !Number.isFinite(Date.parse(input.observedAt))||input.run.rankingAuthorized!==false||input.run.independentEvidenceVerified!==false)throw Error('phase228_invalid_upstream');
 const limit=input.maxDocuments??4;
 if(!Number.isInteger(limit)||limit<1||limit>12)throw Error('phase228_bad_budget');
 const transport=input.fixtureTransport??restrictedHttpsTransport;
 const attemptedUrls:string[]=[],receipts:DocumentReceipt228[]=[],seen=new Set<string>();
 for(const lead of input.run.candidates){
  if(receipts.length>=limit)break;
  const format=documentFormat228(lead.url);if(!format)continue;
  const source=input.registry.sources.find(s=>s.watch.id===lead.sourceId);
  const blocked=(reason:string):DocumentReceipt228=>({url:lead.url,sourceId:lead.sourceId,format,status:'blocked',
   documentSha256:null,claims:[],reasonCodes:[reason],rawTextStored:false,rawDocumentStored:false,rankingAuthorized:false});
  if(!source||lead.verification!=='unverified_url_only'||!safeMetadataUrl75(lead.url,source.watch.host)||
    !new URL(lead.url).pathname.startsWith(source.pathPrefix))continue;
  if(seen.has(lead.url))continue;seen.add(lead.url);
  const prohibition=input.registry.policies.some(p=>p.host===source.watch.host&&
    (p.basis==='refused'||p.websiteTerms==='reviewed_prohibited'||p.robots==='disallowed'));
  const restriction=input.sourceRestrictions?.[source.watch.id];
  if(prohibition){receipts.push(blocked('registry_explicit_host_prohibition'));continue;}
  if(restriction==='explicitly_prohibited'||restriction==='login_required'){
   receipts.push(blocked(restriction));continue;
  }
  const robotsUrl='https://'+source.watch.host+'/robots.txt';
  try{
   attemptedUrls.push(robotsUrl);const robots=await transport.get(robotsUrl,RESEARCH_AGENT,512000);
   if(publicRobotsDecision223(robots,lead.url)!=='allow'){
    receipts.push(blocked('robots_not_allowed_or_unverified'));continue;
   }
   attemptedUrls.push(lead.url);
   const res=await transport.get(lead.url,RESEARCH_AGENT,format==='pdf'?40_000_000:6_000_000);
   const expectedType=format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
   if(res.status!==200||res.finalUrl!==lead.url||!new RegExp('^'+expectedType.replace('.','\\.')+'(?:\\s*;|\\s*$)','i').test(res.contentType)||
      !(res.rawBytes instanceof Uint8Array)||res.rawBytes.byteLength>(format==='pdf'?40_000_000:6_000_000)){
    receipts.push(blocked('document_http_mime_or_raw_bytes_unverified'));continue;
   }
   const parsed=await parseDocumentBytes228(res.rawBytes,format);
   receipts.push({url:lead.url,sourceId:lead.sourceId,format,
     status:parsed.claimCount>0?'parsed_unverified':'needs_review',
     documentSha256:parsed.documentSha256,claims:parsed.claims,reasonCodes:parsed.reasonCodes,
     discrepancies:parsed.discrepancies,visualTableSlots:parsed.visualTableSlots,
     rawTextStored:false,rawDocumentStored:false,rankingAuthorized:false});
  }catch{receipts.push(blocked('document_transport_or_parser_failure'));}
 }
 return {schema:'pee228.document-observation.v1',mode,attemptedUrls,receipts,
  scientificEvidenceAdmitted:false,rankingAuthorized:false,noDocumentBodiesStored:true};
}
/** Reuse exactly the same candidate format for general-search results, with
 * explicit source-scoped registry entries. No search result is evidence. */
export async function inspectSearchDocuments228(input:{search:SearchRun223;registry:Registry220;
 observedAt:string;maxDocuments?:number;mode?:'live'|'synthetic_fixture';fixtureTransport?:SourceTransport;}):Promise<DocumentObservation228>{
 const mode=input.mode??'live';if(input.search.mode!==mode)throw Error('phase228_mode_mismatch');
 const sources=new Map<string,string>();
 for(const lead of input.search.candidates){const host=new URL(lead.url).hostname;
  if(!safeMetadataUrl75(lead.url,host)||lead.sourceId!=='search_'+sha(host).slice(0,16))throw Error('phase228_invalid_search_lead');
  sources.set(lead.sourceId,host);
 }
 const joined:Registry220={...input.registry,sources:[...input.registry.sources,...[...sources].map(([id,host])=>({
  watch:{id,host,categoryId:'search_leads',channel:'specialist_editorial' as const,
   mechanism:'approved_index_delta' as const,tier:'exploration' as const,rightsClearedForMetadata:false,
   nextCheckAt:input.observedAt,lastCheckAt:null,quietChecks:0,errors:0},sitemapPath:'/sitemap.xml',pathPrefix:'/'}))]};
 const run:Run220={schema:'pee220.run.1',mode,requestSha256:sha(input.search.intentKey??''),
  intent:{status:'needs_category',categoryId:null,slotValues:{},clarification:null,key:null,confirmedByUser:false},
  localIntake:{suggestionCount:0,unresolvedIssues:0},decision:'candidate_discovery_attempted',
  plannedSourceIds:[],sourceOutcomes:[],networkRequests:input.search.networkRequests,
  candidates:input.search.candidates,limitations:[],rankingAuthorized:false,independentEvidenceVerified:false,
  checkpoint:{schema:'pee220.checkpoint.1',observations:[],watchSources:[],evidenceReceipts:[],rankingAuthorized:false}};
 return observeDiscoveredDocuments228({run,registry:joined,observedAt:input.observedAt,maxDocuments:input.maxDocuments,
  mode,fixtureTransport:input.fixtureTransport});
}
