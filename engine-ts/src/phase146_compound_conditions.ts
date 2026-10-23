/** Phase146: narrowly scoped compound specifications and protocol-condition surfaces.
 * A typed representation of what text SAYS, not a verified product fact.
 * Independent original code; no extra inference runtime or upstream vendor code.
 */
import {createHash} from 'node:crypto';
import {readDimensionalContext145, type NumericCandidate145, type UnitGraph145} from './phase145_unit_context_bridge.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const span=(text:string,start:number,end:number):EvidenceSpan144=>{
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>text.length||start>=end)throw Error('invalid_phase146_span');
 const literal=text.slice(start,end);return {start,end,literal,sha256:sha(literal)};
};
export type CompoundKind146='digital_audio_format_surface'|'speaker_sensitivity_surface';
export type ComponentKind146='bit_depth'|'sample_rate'|'sound_level_ratio'|'power_reference'|'distance_reference';
export interface CompoundComponent146 {kind:ComponentKind146; evidence:EvidenceSpan144;value:number;unit:string;canonicalValue:number;canonicalUnit:string;}
export interface Compound146 {id:string;kind:CompoundKind146;evidence:EvidenceSpan144;components:CompoundComponent146[];
 interpretation:'format_or_compatibility_unspecified'|'sensitivity_specification_not_measured_output';
 role:'compound_specification_candidate';related145MeasurementIds:string[];subjectVerified:false;
 protocolVerified:false;sourceAuthenticated:false;scientificReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface DisplayCondition146 {mode:'HDR'|'SDR'|'undetermined';metric:'peak'|'sustained'|'undetermined';
 windowPercent:number|null;modeEvidence:EvidenceSpan144|null;windowEvidence:EvidenceSpan144|null;
 metricEvidence:EvidenceSpan144|null;ambiguous:boolean;reasons:string[];
 measurement146Id:string;originalMeasurement145Id:string;subjectVerified:false;protocolVerified:false;
 canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface TemperaturePair146 {id:string;setpoint145Id:string;reading145Id:string;
 setpoint:EvidenceSpan144;reading:EvidenceSpan144;linkType:'same_sentence_candidate'|'repeated_explicit_subject_candidate';
 evidence:EvidenceSpan144[];interpretation:'setpoint_and_reading_not_accuracy_proof';
 samePhysicalDeviceProven:false;sensorCalibrationVerified:false;measurementProtocolVerified:false;
 canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface CompositeContextGraph146 {phase:146;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline145:UnitGraph145;compounds:Compound146[];displayConditions:DisplayCondition146[];temperaturePairs:TemperaturePair146[];
 coverageTruncated:boolean;truncationReasons:string[];candidateOnly:true;independentGoldAnnotations:0;accuracy:null;
 sourceAuthenticated:false;rankingAuthorized:false;canonicalWriteAuthorized:false;}
const reAudio=/(\d{1,2})\s*[- ]\s*bit\s*\/\s*(\d{1,3}(?:\.\d+)?)\s*(kHz|Hz)\b/gi;
const reSensitivity=/(\d{1,3}(?:\.\d+)?)\s*dB\s*\/\s*(?:1\s*)?W\s*\/\s*(?:1\s*)?m\b/g;
const component=(text:string,start:number,end:number,kind:ComponentKind146,value:number,unit:string,canonicalValue:number,canonicalUnit:string):CompoundComponent146=>
 ({kind,evidence:span(text,start,end),value,unit,canonicalValue,canonicalUnit});
const localSentence=(text:string,m:NumericCandidate145)=>text.slice(m.sentenceEvidence.start,m.sentenceEvidence.end);
const uniqueEvidence=(pieces:EvidenceSpan144[])=>pieces.filter((p,i)=>pieces.findIndex(q=>q.start===p.start&&q.end===p.end)===i);
function collectCompounds(text:string,legacy:UnitGraph145):Compound146[]{
 const result:Compound146[]=[];
 for(const m of text.matchAll(reAudio)){
  const start=m.index!, end=start+m[0].length;
  const bit=Number(m[1]),rate=Number(m[2]);if(bit<1||bit>64||rate<=0||!Number.isFinite(rate))continue;
  const bitMatch=/(\d{1,2})\s*[- ]\s*bit/i.exec(m[0])!;
  const second=/\/\s*(\d{1,3}(?:\.\d+)?)\s*(kHz|Hz)/i.exec(m[0])!;
  const bStart=start+bitMatch.index!;
  const rStart=start+second.index!+second[0].indexOf(second[1]);
  const rateEvidenceStart=rStart;
  const rateText=/^\d{1,3}(?:\.\d+)?\s*(?:kHz|Hz)\b/i.exec(text.slice(rateEvidenceStart,end));
  if(!rateText)continue;
  const components=[
    component(text,bStart,bStart+bitMatch[0].length,'bit_depth',bit,'bit',bit,'bit'),
    component(text,rateEvidenceStart,rateEvidenceStart+rateText[0].length,'sample_rate',rate,m[3],
      rate*(m[3].toLowerCase()==='khz'?1000:1),'Hz')
  ];
  result.push({id:`compound146_${start}_${end}`,kind:'digital_audio_format_surface',evidence:span(text,start,end),components,
   interpretation:'format_or_compatibility_unspecified',role:'compound_specification_candidate',
   related145MeasurementIds:legacy.measurements.filter(x=>x.quantity.start>=start&&x.quantity.end<=end).map(x=>x.id),
   subjectVerified:false,protocolVerified:false,sourceAuthenticated:false,scientificReviewRequired:true,
   canonicalWriteAuthorized:false,rankingAuthorized:false});
 }
 for(const m of text.matchAll(reSensitivity)){
  const start=m.index!,end=start+m[0].length,level=Number(m[1]);if(!Number.isFinite(level))continue;
  const levelStart=start+m[0].indexOf(m[1]);
  const w=/\/\s*(?:1\s*)?W\b/.exec(m[0])!;
  const meter=/\/\s*(?:1\s*)?m\b/.exec(m[0].slice(w.index!+w[0].length))!;
  const wStart=start+w.index!+w[0].indexOf(w[0].includes('1')?'1':'W');
  const mStart=start+w.index!+w[0].length+meter.index!+meter[0].indexOf(meter[0].includes('1')?'1':'m');
  result.push({id:`compound146_${start}_${end}`,kind:'speaker_sensitivity_surface',evidence:span(text,start,end),
   components:[component(text,levelStart,levelStart+m[1].length+text.slice(levelStart+m[1].length,end).indexOf('dB')+2,'sound_level_ratio',level,'dB',level,'dB'),
    component(text,wStart,start+w.index!+w[0].length,'power_reference',1,'W',1,'W'),
    component(text,mStart,end,'distance_reference',1,'m',1,'m')],
   interpretation:'sensitivity_specification_not_measured_output',role:'compound_specification_candidate',
   related145MeasurementIds:legacy.measurements.filter(x=>x.quantity.start>=start&&x.quantity.end<=end).map(x=>x.id),
   subjectVerified:false,protocolVerified:false,sourceAuthenticated:false,scientificReviewRequired:true,
   canonicalWriteAuthorized:false,rankingAuthorized:false});
 }
 return result.sort((a,b)=>a.evidence.start-b.evidence.start||a.evidence.end-b.evidence.end);
}
function display(text:string,m:NumericCandidate145):DisplayCondition146|null{
 if(m.dimension!=='luminance')return null;
 const sentence=localSentence(text,m),offset=m.sentenceEvidence.start;
 // Surrounding sentence only; opposite/conflicting window cues trigger abstention.
 const modes=[...sentence.matchAll(/\b(?:HDR|SDR)\b/gi)];
 const windows=[...sentence.matchAll(/\b(?:2|10|25|50|100)\s*%\s*(?:white\s+)?(?:test\s+)?window\b|\bwindow\s*(?:of\s*)?(?:2|10|25|50|100)\s*%/gi)];
 const phases=[...sentence.matchAll(/\b(?:peak|sustained)\b/gi)];
 const modeSet=new Set(modes.map(x=>x[0].toUpperCase()));
 const winSet=new Set(windows.map(x=>Number(x[0].match(/\b(?:2|10|25|50|100)\b/)?.[0])));
 // '2% and 10% window' names two test windows, even though only the latter
 // occurs immediately before 'window'. Never silently choose the latter.
 const coordinated=[...sentence.matchAll(/\b(2|10|25|50|100)\s*%\s*(?:and|or|,)\s*(2|10|25|50|100)\s*%\s*window\b/gi)];
 for(const c of coordinated){winSet.add(Number(c[1]));winSet.add(Number(c[2]));}
 const phaseSet=new Set(phases.map(x=>x[0].toLowerCase()));
 const ambiguity=modeSet.size>1||winSet.size>1||phaseSet.size>1;
 const firstMode=modes[0],firstWindow=windows[0],firstPhase=phases[0];
 const ev=(x:RegExpMatchArray|undefined)=>x?span(text,offset+x.index!,offset+x.index!+x[0].length):null;
 return {measurement146Id:`condition146_${m.id}`,originalMeasurement145Id:m.id,
  mode:modeSet.size===1?(firstMode![0].toUpperCase() as 'HDR'|'SDR'):'undetermined',
  metric:phaseSet.size===1?(firstPhase![0].toLowerCase() as 'peak'|'sustained'):'undetermined',
  windowPercent:winSet.size===1? [...winSet][0]:null,
  modeEvidence:modeSet.size===1?ev(firstMode):null,windowEvidence:winSet.size===1?ev(firstWindow):null,
  metricEvidence:phaseSet.size===1?ev(firstPhase):null,ambiguous:ambiguity,
  reasons:ambiguity?['conflicting_conditions_not_resolved']:
   winSet.size===0?['window_test_condition_not_found']:['same_sentence_surface_not_authenticated_protocol'],
  subjectVerified:false,protocolVerified:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
}
function tempFunction(m:NumericCandidate145):'set'|'actual'|'unknown'{
 const prefix=m.sentenceEvidence.literal.slice(0,m.quantity.start-m.sentenceEvidence.start);
 const tail=prefix.slice(-90);
 if(/\b(?:set\s+to|setpoint(?:\s+of)?|target(?:\s+temperature)?(?:\s+of)?|dial(?:led)?\s+to|thermostat\s+(?:at|set\s+to))\s*$/i.test(tail))return 'set';
 if(/\b(?:measured|recorded|reached|registered|probe\s+read|actually\s+hit|actual\s+temperature(?:\s+was)?)\s*(?:at|of|to)?\s*$/i.test(tail))return 'actual';
 return 'unknown';
}
function repeatedExplicitSubject(a:NumericCandidate145,b:NumericCandidate145,text:string):EvidenceSpan144|null{
 if(!a.subjectSurface)return null;
 const norm=(t:string)=>t.replace(/^the\s+/i,'').trim().toLowerCase();
 if(b.subjectSurface&&norm(a.subjectSurface.literal)===norm(b.subjectSurface.literal)&&norm(a.subjectSurface.literal).length>=6)return b.subjectSurface;
 if(b.sentenceId!==a.sentenceId)return null;
 // Phase145 intentionally abstains on some same-sentence conjunctions.
 // Accept a repeated literal subject only when it immediately governs the
 // second reading verb; never substitute a pronoun or a nearby other model.
 const pre=text.slice(a.quantity.end,b.quantity.start);
 const quoted=a.subjectSurface.literal.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const endPattern=new RegExp('('+quoted+')\\s+(?:measured|reached|recorded|registered|hit|held|actually\\s+hit)\\s*(?:at|to|of)?\\s*$','i');
 const match=endPattern.exec(pre);
 if(!match)return null;
 const at=a.quantity.end+match.index+match[0].indexOf(match[1]);
 return span(text,at,at+match[1].length);
}
function temperaturePairs(text:string,ms:NumericCandidate145[]):TemperaturePair146[]{
 const out:TemperaturePair146[]=[];
 const temp=ms.filter(x=>x.dimension==='temperature');
 for(let i=0;i<temp.length;i++)for(let j=i+1;j<temp.length&&j<=i+5;j++){
  const a=temp[i],b=temp[j],roleA=tempFunction(a),roleB=tempFunction(b);
  if(!((roleA==='set'&&roleB==='actual')||(roleA==='actual'&&roleB==='set')))continue;
  const adjacent=b.sentenceId===a.sentenceId+1;
  if(b.sentenceId!==a.sentenceId&&!adjacent)continue;
  // Avoid transferring properties across products and across paragraphs.
  const between=text.slice(a.sentenceEvidence.end,b.sentenceEvidence.start);
  if(/\n\s*\n/.test(between))continue;
  const bSubject=repeatedExplicitSubject(a,b,text);if(!bSubject)continue;
  const setting=roleA==='set'?a:b,actual=roleA==='actual'?a:b;
  out.push({id:`temperature146_${setting.id}_${actual.id}`,setpoint145Id:setting.id,reading145Id:actual.id,
   setpoint:setting.quantity,reading:actual.quantity,
   linkType:adjacent?'repeated_explicit_subject_candidate':'same_sentence_candidate',
   evidence:uniqueEvidence([a.subjectSurface!,bSubject,setting.quantity,actual.quantity]),
   interpretation:'setpoint_and_reading_not_accuracy_proof',samePhysicalDeviceProven:false,
   sensorCalibrationVerified:false,measurementProtocolVerified:false,canonicalWriteAuthorized:false,rankingAuthorized:false});
 }
 return out;
}
export function readCompoundConditions146(input:ReaderInput139,maxCompounds=80):CompositeContextGraph146{
 if(!Number.isSafeInteger(maxCompounds)||maxCompounds<1||maxCompounds>200)throw Error('invalid_phase146_budget');
 const baseline=readDimensionalContext145(input);
 const text=input.document.text,all=collectCompounds(text,baseline);
 const truncated=all.length>maxCompounds;
 const compounds=all.slice(0,maxCompounds);
 const displayConditions=baseline.measurements.map(m=>display(text,m)).filter((x):x is DisplayCondition146=>x!==null);
 const temperature=temperaturePairs(text,baseline.measurements);
 return {phase:146,sourceId:baseline.sourceId,originalDocumentId:baseline.originalDocumentId,documentSha256:baseline.documentSha256,
  baseline145:baseline,compounds,displayConditions,temperaturePairs:temperature,
  coverageTruncated:baseline.coverageTruncated||truncated,
  truncationReasons:[...baseline.truncationReasons,...(truncated?['compound_candidate_limit']:[])],
  candidateOnly:true,independentGoldAnnotations:0,accuracy:null,sourceAuthenticated:false,
  rankingAuthorized:false,canonicalWriteAuthorized:false};
}
