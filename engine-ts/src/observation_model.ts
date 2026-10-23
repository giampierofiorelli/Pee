/** S87b — a category-free model of one scientific observation (SHADOW; not read by any operational module).
 *
 * Owner question (S87a review): what is the general model of a scientific observation that PEE must understand, keep and
 * reuse in every component? The S87b census showed that PEE's representations carry an observation's meaning only where
 * a category was taught, and that even the "general" condition axes work almost only on the category they were developed
 * on. This module states the observation in terms that do not depend on the category:
 *  - quantity: value, unit and quantity kind, from the shared quantity knowledge (QK);
 *  - measurand: the kind it measures, the metric when the knowledge names one, and its BASIS (per task or cycle, per time
 *    period, per portion or unit, per area or volume), which decides what it can be compared with;
 *  - conditions: each stated condition typed by its STRUCTURE (VIM: influence quantities and operating settings):
 *    another quantity (its kind is its axis), an operating setting, the measuring instrument, a named method, a state of
 *    the procedure, the comparison design or the basis of the number, the sample or challenge, or product identity;
 *  - comparability key: kind + metric + basis + the operating setting and quantity conditions, so two observations of an
 *    untaught category can still be judged alike or not alike.
 * Category teaching is not consulted here; it can refine the measurand to a taught measurement elsewhere. The cue words
 * are domain-general (metrology and appliance operation), never product, publisher or category vocabularies. The setting
 * cue reuses the 1G table interpreter's (SETTING1G) and adds the setting nouns it lacks (speed/mode/programme words). */
import {findQuantities,parseUnit,typeQuantity,type QuantityKnowledge} from './quantity_knowledge.js';
import {SETTING1G} from './table_interpreter1g.js';

export type ConditionClass87='quantity'|'operating_setting'|'instrument'|'method_or_protocol'|'procedure_state'|'comparison_or_basis'|'sample_or_challenge'|'identity'|'unclassified';
export type Basis87='none'|'per_task_or_cycle'|'per_time_period'|'per_portion_or_unit'|'per_area_or_volume';
export interface ObservationCondition87 {text:string;class:ConditionClass87;kind:string|null;value:string|null;cue:string|null}
export interface ObservationModel87 {
 quantity:{value:number|null;unit:string;kind:string|null;kindCandidates:string[];metric:string|null};
 measurand:{kind:string|null;metric:string|null;basis:Basis87;basisCue:string|null};
 conditions:ObservationCondition87[];
 comparabilityKey:string|null;
}
export const OBSERVATION_MODEL_VERSION87='pee87b.observation-model.v1';

// money is a general quantity the QK pack does not hold yet (candidate pack addition): ISO 4217 symbols and minor units
const MONEY=/(?:£|\$|€|\b(?:gbp|usd|eur)\b)\s?\d[\d,.]*|\d[\d,.]*\s?(?:p|c|pence|cents?|£|\$|€|gbp|usd|eur)\b(?:\s?\/\s?(?:kwh|yr|year|month))?/i;
const INSTRUMENT_HEAD=/\b(?:meter|metre|monitor|sensor|gauge|analy[sz]er|colou?rimeter|spectro\w*|probe|thermometer|hygrometer|logger|microphone|camera|stopwatch|timer)s?\b/i;
const METHOD=/\b(?:test|tests|testing|method|methodology|standard|protocol|procedure|edition|benchmark|iso|iec|en\s?\d+|ansi|aham|doe|astm|din)\b/i;
const SETTING_NOUN=/\b(?:speed|mode|setting|programme|program|cycle|level|preset|fan|top|highest|lowest)\b/i;
const PROCEDURE=/\b(?:pre-?heat\w*|from cold|cold start|warm(?:ed|ing)?[- ]up|empty|unloaded|shaken|stirred|turned|halfway|reduced|included|excluded|without|defrost\w*)\b/i;
const COMPARISON=/\b(?:same|both|vs\.?|versus|compared|comparison|relative|pairing|paired|derived|basis|assum\w*|not stated|estimate\w*|equivalent)\b/i;
// it1: words that state a RELATION between observations or the derivation of the number (the design, not its object)
const RELATION=/\b(?:same|both|vs\.?|versus|compared|pairing|paired|derived|basis|assum\w*|equivalent)\b/i;
// it1: a duration that names the end state or the task it lasts for is the duration of one task
const TASK_DURATION=/\b(?:to|until|till)\s+(?:\w+\s+){0,2}\w+|\b(?:clean\w*|clear\w*|cook\w*|dry\w*|complet\w*|reduc\w*|drop\w*|remov\w*|finish\w*|setup|set up|pre-?heat\w*|cycle|task|run)\b/i;
const NUMBER_WORDS:Record<string,string>={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12',half:'0.5'};
const SAMPLE=/\b(?:pm\s?\d+(?:\.\d)?|smoke|dust|pollen|incense|odou?r|voc|load|sample|portion|serving|content|pattern|window|clip|food|dish|laundry|towels?)\b/i;
const IDENTITY=/\b(?:variant|model|identity|version|generation|oem)\b/i;
const PER_TASK=/\b(?:cycles?|tasks?|cooks?|cooking|runs?|wash(?:es)?|loads?|uses?|meals?|sessions?|batch(?:es)?|programmes?|dry(?:ing)?)\b/i;
const PER_TIME=/\b(?:years?|yr|annum|annual(?:ly)?|months?|weeks?|days?|hours?|hr|h)\b/i;
const PER_PORTION=/\b(?:portions?|servings?|kg|items?|units?|pieces?|person|people)\b/i;
const PER_SPACE=/\b(?:m2|m3|m²|m³|sq\.?\s?(?:ft|m)|square|cubic|room)\b/i;

const norm=(t:string)=>String(t).replace(/^untaught:/,'').replace(/_/g,' ').trim();
// it1: spelled-out counts before a unit word are numbers ("two hours")
const numerals=(t:string)=>t.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half)(?=\s+(?:an?\s+)?[a-z]+\b)/gi,(w)=>NUMBER_WORDS[w.toLowerCase()]!);
const cue=(re:RegExp,t:string)=>re.exec(t)?.[0]??null;
const setting=(t:string)=>cue(SETTING1G,t)??cue(SETTING_NOUN,t);

/** The basis of a measurand: what one value is counted per. Read from "per X", "a year", "each cycle" and from the unit. */
export function measurandBasis87(words:string,unit:string):{basis:Basis87;cue:string|null}{
 const u=String(unit).toLowerCase();const t=String(words).toLowerCase();
 const xs=[/\/\s*([a-z²³0-9.]+)/.exec(u)?.[1]??null,/\b(?:per|each|every)\s+((?:[a-z]+\s+){0,2}[a-z²³0-9]+)/.exec(t)?.[1]??null,
  /\b(?:a|an)\s+(year|month|week|day|hour|cycle|wash|load|run|cook|portion|serving)\b/.exec(t)?.[1]??null,/\b(annual(?:ly)?|yearly|monthly|daily|hourly)\b/.exec(t)?.[1]??null];
 for(const x of xs){if(!x)continue;
  if(PER_TIME.test(x)||/annual|yearly|monthly|daily|hourly/.test(x))return {basis:'per_time_period',cue:x};
  if(PER_TASK.test(x))return {basis:'per_task_or_cycle',cue:x};
  if(PER_PORTION.test(x))return {basis:'per_portion_or_unit',cue:x};
  if(PER_SPACE.test(x))return {basis:'per_area_or_volume',cue:x};}
 return {basis:'none',cue:null};
}

/** Type one stated condition by its structure. `measuredKind` keeps the value's own kind out of the condition axes. */
export function classifyCondition87(qk:QuantityKnowledge,text:string,measuredKind:string|null):ObservationCondition87{
 const t=norm(text);const out=(c:ConditionClass87,k:string|null,v:string|null,q:string|null):ObservationCondition87=>({text:t,class:c,kind:k,value:v,cue:q});
 // the head decides: "sound level meter at 3 ft" is an instrument (with a distance), "test room 728 cu ft" a quantity
 const head=t.replace(/\s+(?:at|on|in|placed|positioned|from)\b.*$/i,'');
 const inst=cue(INSTRUMENT_HEAD,head);if(inst&&new RegExp(inst.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$','i').test(head))return out('instrument',null,null,inst);
 // it1: a relation between observations or the derivation of the number is the comparison design, whatever it mentions
 if(cue(RELATION,t))return out('comparison_or_basis',null,null,cue(RELATION,t));
 const money=cue(MONEY,t);if(money)return out('quantity','price_or_tariff',money,money);
 const qs=findQuantities(qk,numerals(t)).map(f=>{const tq=typeQuantity(qk,{surface:f.surface,value:f.value,unit:f.unit},{labels:[t]});
  return {surface:f.surface,kind:tq.kind.id??tq.kind.candidates[0]??null};}).filter((x):x is {surface:string;kind:string}=>!!x&&!!x.kind&&x.kind!==measuredKind);
 const set=setting(t);
 // a quantity that names the setting's own level ("sub-45 dBA speed") is a setting, not a separate influence quantity
 if(qs.length&&!(set&&/\b(?:speed|mode|setting|programme|program|level|preset)\b/i.test(t)))return out('quantity',qs[0]!.kind,qs[0]!.surface,qs[0]!.surface);
 if(inst)return out('instrument',null,null,inst);
 const meth=cue(METHOD,t);if(meth&&!set)return out('method_or_protocol',null,null,meth);
 if(set)return out('operating_setting',null,t,set);
 const proc=cue(PROCEDURE,t);if(proc)return out('procedure_state',null,t,proc);
 const cmp=cue(COMPARISON,t);if(cmp)return out('comparison_or_basis',null,null,cmp);
 const smp=cue(SAMPLE,t);if(smp)return out('sample_or_challenge',null,smp,smp);
 const id=cue(IDENTITY,t);if(id)return out('identity',null,null,id);
 if(qs.length)return out('quantity',qs[0]!.kind,qs[0]!.surface,qs[0]!.surface);
 return out('unclassified',null,null,null);
}

/** The observation model of one value with its own words and stated conditions. */
export function interpretObservation87(qk:QuantityKnowledge,o:{value:number|null;unit:string;words?:string|null;conditions?:readonly string[]}):ObservationModel87{
 const words=o.words??'';const unit=String(o.unit??'').trim();const conds=(o.conditions??[]).map(norm);
 const p=parseUnit(qk,unit);
 const money=!p&&(MONEY.test(`${o.value??''}${unit}`)||/^(?:p|c|gbp|usd|eur|£|\$|€)(?:\s*\/|$)/i.test(unit));
 const tq=p?typeQuantity(qk,{surface:`${o.value??''} ${unit}`,value:o.value,unit:p},{labels:[words],conditions:conds}):null;
 const kind=money?'price_or_cost':tq?.kind.id??null;
 let b=measurandBasis87(words,unit);
 if(b.basis==='none'&&kind==='duration'&&TASK_DURATION.test(words))b={basis:'per_task_or_cycle',cue:TASK_DURATION.exec(words)![0]};
 const conditions=conds.map(c=>classifyCondition87(qk,c,kind));
 const keyConds=conditions.filter(c=>c.class==='operating_setting'||c.class==='quantity')
  .map(c=>c.class==='quantity'?`${c.kind}=${(c.value??'').toLowerCase()}`:`setting=${(c.value??'').toLowerCase()}`).sort();
 const mk=kind??(tq?.kind.candidates.length?tq.kind.candidates.slice().sort().join('|'):null);
 return {quantity:{value:o.value,unit,kind,kindCandidates:tq?.kind.candidates??(money?['price_or_cost']:[]),metric:tq?.metric.id??null},
  measurand:{kind:mk,metric:tq?.metric.id??null,basis:b.basis,basisCue:b.cue},conditions,
  comparabilityKey:mk?[mk,tq?.metric.id??'-',b.basis,...keyConds].join('|'):null};
}
