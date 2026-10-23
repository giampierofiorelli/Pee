/** S87e — reconstruction of observation-contract slots from the original document context and general knowledge (SHADOW).
 *
 * The stored tables leave slots unknown (contract v0.3 census). This module fills them only as INFERRED, each with the
 * technique, the rule and the context field that supplied it, or leaves them undetermined. Three techniques, compared in
 * the pre-registered S87e experiment:
 *  A: the value and its own label, typed with the shared quantity knowledge (QK) and the S87b structural classifier;
 *  B: A plus document roles (row and column headers, table header row, caption), following the document-level evidence
 *     rules studied in S87c (same element, header bridge);
 *  C: B with every slot decided by the agreement of independent signals; disagreement abstains (majority vote with
 *     abstention, the weak-supervision baseline).
 * No product, publisher or category vocabulary: units, kinds, scales and standards come from the QK pack; the remaining
 * cue words are generic English (per, at, in ... mode, number of) and document structure. */
import {parseUnit,typeQuantity,hasPhrase,type QuantityKnowledge} from './quantity_knowledge.js';
import {classifyCondition87,measurandBasis87} from './observation_model.js';
import {SETTING1G} from './table_interpreter1g.js';
import {observationRole86c} from './phase225_transient_test_probe.js';

export type Technique='A'|'B'|'C';
export interface DeclarationContext {label:string;rawValue:string;valueJson:Record<string,unknown>|null;unit?:string|null;rowHeader?:string|null;colHeader?:string|null;
 tableHeader?:string|null;tableCaption?:string|null;section?:string|null;headings?:string[];window?:string|null;pageTitle?:string|null;structured?:boolean}
export interface Reconstructed<T> {value:T|null;state:'inferred'|'undetermined';rule:string|null;from:string|null}
export interface DeclarationReconstruction {
 technique:Technique;form:'quantity'|'categorical';
 quantityKind:Reconstructed<string>;basis:Reconstructed<string>;constraints:{dimension:string;value:string;from:string}[];
 objectOfInterest:Reconstructed<string>;procedure:Reconstructed<string>;categoricalScale:Reconstructed<'nominal'|'ordinal'|'boolean'>;
}
const und=<T>():Reconstructed<T>=>({value:null,state:'undetermined',rule:null,from:null});
const inf=<T>(value:T,rule:string,from:string):Reconstructed<T>=>({value,state:'inferred',rule,from});
const NUMERIC=new Set(['quantity','price','number','range','dimensions','options']);
// coarse kinds (the reference's vocabulary) from QK kinds
const COARSE:Record<string,string>={sound_pressure_level:'sound_level',sound_power_level:'sound_level',luminance:'luminance',illuminance:'luminance',volumetric_flow_rate:'flow_rate',
 ratio:'ratio_or_percentage',amount_fraction:'ratio_or_percentage',relative_humidity:'ratio_or_percentage',duration:'duration',energy:'energy',energy_per_event:'energy',
 periodic_energy_consumption:'energy',power:'power',volume:'volume',volume_per_event:'volume',periodic_volume:'volume',length:'length',area:'area',mass:'mass',
 temperature:'temperature',voltage:'voltage',electric_current:'electric_current',frequency:'frequency',pressure:'pressure',rotational_speed:'speed',electric_charge:'other',
 colour_difference:'other',air_change_rate:'other',mass_concentration:'other',signal_to_noise_ratio:'other',electrical_resistance:'other',volume_per_energy:'other'};
const coarse=(ks:string[])=>{const c=[...new Set(ks.map(k=>COARSE[k]??'other'))];return c.length===1?c[0]!:null;};
const STANDARD=/\b(?:ISO|IEC|EN|BS|DIN|ANSI|AHAM|ASTM|IEEE|UL|CSA|JIS)(?:\s*\/\s*[A-Z]+)?[\s-]*[A-Z]{0,3}[\s-]?\d{2,5}(?:[-.:]\d+)*\b/;
// a unit stated next to a label: "Weight (kg)", "Capacity in litres", "[mm]"
const unitInText=(qk:QuantityKnowledge,t:string|null|undefined):string|null=>{if(!t)return null;
 for(const m of t.matchAll(/[([]\s*([^()[\]]{1,12}?)\s*[)\]]|\bin\s+([a-zA-Zµ°³²/]{1,10})\b/g)){const u=(m[1]??m[2]??'').trim();if(u&&parseUnit(qk,u))return u;}return null;};
const kindOfUnit=(qk:QuantityKnowledge,unit:string,words:string)=>{const p=parseUnit(qk,unit);if(!p)return null;const t=typeQuantity(qk,{surface:`1 ${unit}`,value:1,unit:p},{labels:[words]});
 return t.kind.id?[t.kind.id]:t.kind.candidates;};
// qualifiers (it1): the modifiers of a label or a value — parentheses that are not a unit, prepositional phrases
// (at, on, into, with, without, w/o) and "<word> mode" — are its conditions; the structure decides, not the words
const qualifiers=(qk:QuantityKnowledge,label:string):string[]=>{const out:string[]=[];
 for(const m of label.matchAll(/\(([^()]{1,40})\)/g)){const x=m[1]!.trim();if(!parseUnit(qk,x)&&!/^[\dxX×\s]+$/.test(x)&&!/^[A-Za-z]{1,3}x[A-Za-z]{1,3}(?:x[A-Za-z]{1,3})?$/.test(x))out.push(x.replace(/\bw\/o\b/i,'without'));}
 for(const m of label.matchAll(/\b(?:at|@|on|into|with|without|w\/o)\s+([^,;()]{1,30})/gi))out.push(m[0]!.replace(/\bw\/o\b/i,'without').trim());
 for(const m of label.matchAll(/\b([A-Za-z][\w-]{1,20})\s+mode\b/gi))out.push(m[0]!.trim());
 return [...new Set(out)];};
// "<object> <property word>" (it1): the words before a quantity-kind term name the part the value is about ("battery
// capacity", "steam boiler capacity"), unless they are themselves a unit, a kind term, a setting or mode, a condition or a
// generic word for the whole product; packaging words (gross, packed, package, box, shipping) name the package
const GENERIC_WHOLE=/^(?:unit|device|product|item|appliance|machine|model|overall|max(?:imum)?|min(?:imum)?|rated|total|net|typical|nominal|average|peak|approx\.?|standard)$/;
const objectOf=(qk:QuantityKnowledge,label:string):string|null=>{
 if(/\b(?:gross|packed|packaging|package|shipping|boxed|in the box)\b/i.test(label))return 'package';
 const kindWords=qk.pack.kinds.flatMap(k=>[...(k.terms??[]),...(k.discriminators??[])]).map(w=>w.toLowerCase());const words=kindWords.filter(w=>w.length>3);
 const l=label.replace(/\([^)]*\)/g,' ').replace(/[:*]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
 for(const w of words.sort((a,b)=>b.length-a.length)){const i=l.indexOf(' '+w);if(i>0&&new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(l)){
  const head=l.slice(0,i).trim().split(' ').filter(t=>!parseUnit(qk,t)&&!kindWords.includes(t)&&!SETTING1G.test(t)&&!/^(?:mode|setting|consumption|level|output|input|on|off)$/.test(t)&&!GENERIC_WHOLE.test(t)).join(' ');
  if(head&&head.split(' ').length<=3&&!/\bmode\b/.test(l.slice(0,i)))return head;return null;}}
 return null;};
function signalsKind(qk:QuantityKnowledge,c:DeclarationContext,t:Technique):{kind:string|null;rule:string;from:string}[]{
 const v=c.valueJson??{};const vk=String(v.kind??'');const out:{kind:string|null;rule:string;from:string}[]=[];
 if(vk==='price'){out.push({kind:'price',rule:'value is a price (currency)',from:'value'});return out;}
 const unit=typeof v.unit==='string'?v.unit:c.unit??null;
 if(unit){const ks=kindOfUnit(qk,unit,c.label);if(ks?.length)out.push({kind:coarse(ks),rule:`QK unit ${unit}`,from:'value'});}
 if(!unit&&/\bnumber of\b|^(?:no\.?|count|qty) of\b/i.test(c.label))out.push({kind:'count',rule:'label counts items ("number of")',from:'label'});
 // it1: a number followed by a plural noun that the unit knowledge does not know is a count ("60 rounds")
 else if(!unit){const m=/^\s*~?\s*(?:approx\.?\s*)?\d+(?:[.,]\d+)?\s+([a-z]{3,}s)\b/i.exec(c.rawValue??'');if(m&&!parseUnit(qk,m[1]!))out.push({kind:'count',rule:`a number of ${m[1]} (not a unit)`,from:'value'});}
 if(t!=='A'&&!unit){for(const [f,txt] of [['label',c.label],['colHeader',c.colHeader],['rowHeader',c.rowHeader],['tableHeader',c.tableHeader]] as const){const u=unitInText(qk,txt);
  if(u){const ks=kindOfUnit(qk,u,c.label);if(ks?.length){out.push({kind:coarse(ks),rule:`QK unit ${u} stated in the ${f}`,from:f});break;}}}}
 if(t==='C'){// the label's kind words (QK kind terms) as an independent signal
  const hits=qk.pack.kinds.filter(k=>[...(k.discriminators??[]),...(k.terms??[])].some(w=>w.length>3&&hasPhrase(c.label,w)));if(hits.length)out.push({kind:coarse(hits.map(h=>h.id)),rule:'QK kind terms in the label',from:'label'});}
 return out;
}
/** Options. `rejectedObjectRule` re-enables the object-of-interest rule that S87e REJECTED on unseen hosts (18 right, 30 wrong of
 * 48); it exists only to reproduce the committed first run and is never on by default. */
export interface ReconstructionOptions {rejectedObjectRule?:boolean}
export function reconstructDeclaration(qk:QuantityKnowledge,c:DeclarationContext,t:Technique,opts:ReconstructionOptions={}):DeclarationReconstruction{
 const v=c.valueJson??{};const vk=String(v.kind??'');const form=NUMERIC.has(vk)?'quantity':'categorical';
 const r:DeclarationReconstruction={technique:t,form,quantityKind:und(),basis:und(),constraints:[],objectOfInterest:und(),procedure:und(),categoricalScale:und()};
 const texts:[string,string|null|undefined][]=t==='A'?[['label',c.label]]:[['label',c.label],['colHeader',c.colHeader],['rowHeader',c.rowHeader],['tableHeader',c.tableHeader],['tableCaption',c.tableCaption]];
 // quantity kind
 if(form==='quantity'){const sig=signalsKind(qk,c,t).filter(s=>s.kind);
  if(t==='C'){const kinds=[...new Set(sig.map(s=>s.kind))];if(kinds.length===1)r.quantityKind=inf(kinds[0]!,sig.map(s=>s.rule).join(' + '),sig[0]!.from);}
  else if(sig[0])r.quantityKind=inf(sig[0].kind!,sig[0].rule,sig[0].from);}
 // basis
 const unit=typeof v.unit==='string'?v.unit:'';
 const bases=texts.map(([f,x])=>x?{f,b:measurandBasis87(x,f==='label'?unit:'')}:null).filter((x):x is {f:string;b:ReturnType<typeof measurandBasis87>}=>!!x&&x.b.basis!=='none');
 // it1: a duration a run lasts (run time, battery life, "minutes of cleaning") is per use: an extensive quantity of a run
 const qkKind=r.quantityKind.value;
 if(!bases.length&&form==='quantity'&&(qkKind==='duration'||/\bmin(?:ute)?s?\b|\bhours?\b/i.test(c.rawValue??''))&&/\b(?:run ?time|runtime|battery life|per charge|of (?:\w+ing)|cycle time|programme duration|program duration)\b/i.test(`${c.label} ${c.rawValue??''}`))
  bases.push({f:'label',b:{basis:'per_task_or_cycle',cue:'duration of one run'}});
 if(form==='quantity'){const uniq=[...new Set(bases.map(x=>x.b.basis))];
  if(bases.length&&(t!=='C'||uniq.length===1)){const x=bases[0]!;const per=x.b.basis==='per_time_period'?(/h(?:our|r)?\b/.test(x.b.cue??'')?'per_hour':'per_year'):x.b.basis==='per_task_or_cycle'?'per_cycle_or_use':x.b.basis==='per_portion_or_unit'?'per_unit_or_portion':x.b.basis;
   r.basis=inf(per,`basis cue "${x.b.cue}"`,x.f);}}
 // constraints: qualifiers of the label (A), plus header and caption qualifiers (B, C), typed by structure (S87b)
 const qs:[string,string][]=[...qualifiers(qk,c.label).map(q=>['label',q] as [string,string]),...(c.rawValue?qualifiers(qk,c.rawValue).filter(q=>!/^\d/.test(q)).map(q=>['value',q] as [string,string]):[])];
 if(t!=='A')for(const [f,x] of texts.slice(1))if(x)for(const q of qualifiers(qk,x))qs.push([f,q]);
 for(const [f,q] of qs){const k=classifyCondition87(qk,q,null);if(k.class==='unclassified'||k.class==='identity'||k.class==='comparison_or_basis')continue;
  if(t==='C'&&k.class==='quantity'&&!k.kind)continue;
  r.constraints.push({dimension:k.class==='quantity'?`quantity:${k.kind}`:k.class,value:q,from:f});}
 // object of interest
 // object of interest: REJECTED on unseen hosts (S87e); left undetermined unless the reproduction option is set
 if(opts.rejectedObjectRule){const obj=objectOf(qk,c.label);if(obj)r.objectOfInterest=inf(obj,'REJECTED rule: words before a QK kind term in the label','label');}
 // named procedure: a standard designation in the label (A) or headers/caption (B, C)
 for(const [f,x] of texts){const m=x?STANDARD.exec(x):null;if(m){r.procedure=inf(m[0],'standard designation pattern',f);break;}}
 if(r.procedure.state==='undetermined')for(const m of qk.pack.methods??[])if(m.terms.some(w=>w.length>4&&texts.some(([,x])=>x&&hasPhrase(x,w)))){r.procedure=inf(m.id,'QK method terms','label');break;}
 // categorical scale
 if(form==='categorical'){const val=String((v as {text?:unknown}).text??c.rawValue??'').trim();
  if(vk==='boolean'||/^(?:yes|no|true|false|✓|✗|✔|✘|n\/a)$/i.test(val))r.categoricalScale=inf('boolean','yes/no value','value');
  else{const sc=(qk.pack.scales??[]).find(s=>s.terms.some(w=>hasPhrase(c.label,w))&&s.values.some(x=>new RegExp(`^${x.replace(/[+]/g,'\\+')}\\+*$`,'i').test(val)));
   if(sc)r.categoricalScale=inf('ordinal',`QK scale ${sc.id}`,'label');
   else if(t==='C'&&/^[A-G]\+{0,3}$/.test(val)&&/\b(?:class|rating|grade)\b/i.test(c.label))r.categoricalScale=inf('ordinal','a graded class value','value');
   else r.categoricalScale=inf('nominal','non-graded text value','value');}}
 return r;
}

// ------------------------------------------------------------------------------------------- reported test values (S87e)
export interface TestValueContext {value:number;unit:string;block:string;offset:number;
 /** it1: when the value sits in a table cell, the row and column headers that carry its meaning (document role filling) */
 rowHeader?:string|null;colHeader?:string|null}
export interface TestValueReconstruction {role:Reconstructed<'measured_by_publisher'|'declared_spec'|'test_condition'|'other_quantity'>;quantityKind:Reconstructed<string>;
 basis:Reconstructed<string>;property:Reconstructed<string>;constraints:{dimension:string;value:string}[]}
const STOP=new Set(['the','a','an','of','and','or','to','in','on','at','for','with','was','were','is','are','be','been','it','its','this','that','which','just','about','around','only','also','than','then','took','used','using','took','recorded','measured','came','in at','under','over','up','my','our','we','i','had','has','have','after','before','so','but','around','roughly','approximately','approx']);
/** Reconstruct the slots of a value a reader stored as a test measurement, from its own block of the page. */
export function reconstructTestValue(qk:QuantityKnowledge,c:TestValueContext,t:Technique='C'):TestValueReconstruction{
 const b=c.block;const at=Math.max(0,Math.min(c.offset,b.length));
 // the sentence holding the value
 const s0=Math.max(b.lastIndexOf('. ',at-1)+1,0);const e0=(()=>{const i=b.indexOf('. ',at);return i<0?b.length:i+1;})();const sent=b.slice(s0,e0);const start=at-s0;
 const numLen=(/^[\d.,]+\s*[^\s,.;)]*/.exec(b.slice(at))?.[0].length)??String(c.value).length;
 const ks=kindOfUnit(qk,c.unit,sent)??[];let kind=coarse(ks);
 if(t==='C'){const hits=qk.pack.kinds.filter(k=>[...(k.discriminators??[])].some(w=>w.length>3&&hasPhrase(sent,w)));const lk=hits.length?coarse(hits.map(h=>h.id)):null;if(lk&&kind&&lk!==kind&&ks.length>1)kind=null;}
 const role86=observationRole86c(sent,start,start+numLen,kind??'unknown');
 const ROLE:Record<string,TestValueReconstruction['role']['value']>={measured_result:'measured_by_publisher',declared_spec:'declared_spec',certified_or_quoted:'declared_spec',programme_preset:'declared_spec',test_condition:'test_condition',derived:'other_quantity'};
 const role=ROLE[role86.role]??null;
 // it1: a value alone in a table cell takes its words from the row and column headers (the header bridge)
 const hdr=[c.rowHeader,c.colHeader].filter((x):x is string=>!!x&&x.trim()!==b.trim()).join(' ; ');
 const words4=sent.replace(/[\d.,]+/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(w=>/[a-z]{3,}/i.test(w)&&!parseUnit(qk,w)).length<2&&hdr?`${hdr} ${sent}`:sent;
 let bs=measurandBasis87(words4,c.unit);
 if(bs.basis==='none'&&kind==='duration'&&/\b(?:cycle|programme|program|wash|cook|run|to (?:\w+))\b/i.test(words4))bs={basis:'per_task_or_cycle',cue:'duration of one run'};
 if(bs.basis==='none'&&kind==='energy'&&/\b(?:cycle|programme|program|wash|clean|cook|run|eco|standard|intensive|quick)\b/i.test(words4))bs={basis:'per_task_or_cycle',cue:'energy of one run'};
 const basis=bs.basis==='none'?null:bs.basis==='per_task_or_cycle'?'per_cycle_or_use':bs.basis==='per_time_period'?'per_year':bs.basis;
 // the property: content words just before the value in its clause, else the words of the metric the knowledge names
 const head=sent.slice(0,start).split(/[,;:–—(]|\b(?:and|but|while|whereas)\b/).at(-1)??'';
 const words=head.toLowerCase().replace(/[^a-z\s-]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)).slice(-4);
 const tail=sent.slice(start+numLen).toLowerCase().replace(/[^a-z\s-]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)&&!parseUnit(qk,w)).slice(0,3);
 const hw=hdr?hdr.toLowerCase().replace(/[^a-z\s-]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)).slice(0,5):[];
 const prop=words.length?words.join(' '):hw.length&&words4!==sent?hw.join(' '):tail.length?tail.join(' '):null;
 const cons:{dimension:string;value:string}[]=[];for(const q of qualifiers(qk,sent)){const k=classifyCondition87(qk,q,kind);if(!['unclassified','identity','comparison_or_basis'].includes(k.class))cons.push({dimension:k.class==='quantity'?`quantity:${k.kind}`:k.class,value:q});}
 return {role:role?inf(role,'phase225 observationRole86c: '+role86.reason,'sentence'):und(),quantityKind:kind?inf(kind,`QK unit ${c.unit}`,'value'):und(),
  basis:basis?inf(basis,`basis cue "${bs.cue}"`,'sentence'):und(),property:prop?inf(prop,'content words next to the value in its clause','sentence'):und(),constraints:cons};
}
