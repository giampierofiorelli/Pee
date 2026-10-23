/**
 * Phase252 — bounded, deterministic faithfulness checks on proposed review claims (Phase110 candidates).
 *
 * Three different questions are kept apart:
 *  - extraction: a model proposes atoms from a review segment (Phase110);
 *  - faithfulness (this module): is the proposed encoding consistent with the wording of its own evidence span?
 *    Seven lexical checks: dropped condition, polarity against wording (with negation), manufacturer claim promoted to
 *    a test, speculation or hearsay promoted to an observation, a previous product's claim attributed to this one,
 *    comparison direction against wording, and a span that names another variant;
 *  - truth: whether the claim is true of the product. Never decided here; that needs independent evidence.
 * The checks only reject; passing them is not semantic entailment. They are span-local and English-only.
 */
export type FaithfulnessCode252='condition_dropped'|'polarity_contradicts_wording'|'attribution_promoted_to_observation'|
 'speculation_promoted_to_observation'|'previous_product_attributed_to_this'|'comparison_direction_contradicts_wording'|'span_names_other_variant';
export interface CheckedAtom252 {variantId:string;kind:string;polarity:string;evidenceMode:string;epistemicStatus:string;
 conditionCodes:readonly string[];relation?:{direction:string;targetVariantId:string}|null}

const FIXED_POSITIVE=/\bno (?:complaints?|problems?|issues?)\b/g;
const POS=/\b(?:excellent|great|good|solid|easy|easily|quiet|quieter|fast|faster|evenly|even|effective|effectively|strong|reliable|lasted|comfortable|well|nice|perfect)\b/;
const NEG=/\b(?:takes ages|hopeless|loose|leak(?:s|ed|ing)?|broke|broken|rust(?:s|ed)?|poor|bad|awful|terrible|pain|noisy|loud|overheat(?:s|ed|ing)?|fail(?:s|ed)?|cracked|flimsy|disappointing|uncomfortable|difficult|hard to|annoying|slow)\b/;
const NEGATION=/\b(?:not|no|never|isn'?t|wasn'?t|doesn'?t|don'?t|didn'?t|hardly|nor)\b/;
const CONDITION=/\b(?:only (?:on|in|with|when|if|at)|unless|except(?: when| on| with| in)?|provided that|as long as|if(?! you ask)|with [\w-]+(?: [\w-]+)? (?:off|on|disabled|enabled)|in (?:\w+ ){0,2}mode|on (?:the )?(?:max|min|low|high|eco|turbo)\w* (?:setting|mode|power)|at (?:full|max|maximum|low|high) (?:power|volume|speed))\b/;
const ATTRIBUTION=/\b(?:advertis\w*|claims?|claimed|according to (?:the )?(?:maker|manufacturer|brand|spec\w*)|rated (?:at|for)|(?:maker|manufacturer|brand) (?:says|states|quotes|lists)|by the (?:maker|manufacturer)|on paper)\b/;
const HEDGE=/\b(?:might|may|could(?! not find)|seems?|seemed|appears?|apparently|looked like|i think|i guess|probably|possibly|reportedly|rumou?red|supposedly|(?:some |many |other )?(?:users|people|reviewers|owners|others) (?:say|said|report|reported|claim)|i expected (?:it|that)|i hoped (?:it|that)|expected it to)\b/;
const PREVIOUS=/\b(?:(?:my|our|his|her|their) (?:old|previous|last|former)|the (?:previous|former))\b/;
const COMPARATIVE_NEGATED=/\bnot (?:\w+er|more \w+|less \w+|better|worse) than\b/;
// A variant id read as a name ("variant_1_7_litre" -> "1 7 litre"): ids must be keys, so a leading "variant_" is dropped.
const names=(v:string)=>v.toLowerCase().replace(/^variant_/,'').replace(/[_.]+/g,' ').trim();
const plain=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/(\d)[.,](\d)/g,'$1 $2');

/** Lexical sign of the span: +1 favourable wording, -1 unfavourable, 0 none or both; a negation flips it. */
export function wordingSign252(span:string):number{
 let s=plain(span);let fixed=0;
 if(FIXED_POSITIVE.test(s)){fixed=1;s=s.replace(FIXED_POSITIVE,' ');}
 const p=POS.test(s),n=NEG.test(s);
 let sign=p&&!n?1:n&&!p?-1:0;
 if(sign&&NEGATION.test(s))sign=-sign;
 return sign||fixed;
}
/** The faithfulness problems of one proposed atom against its own evidence span (empty when none is found). */
export function checkFaithfulness252(span:string,atom:CheckedAtom252,variants:readonly string[]):FaithfulnessCode252[]{
 const s=plain(span);const out:FaithfulnessCode252[]=[];
 if(CONDITION.test(s)&&!atom.conditionCodes.length)out.push('condition_dropped');
 const sign=wordingSign252(span);
 if(atom.kind==='comparison'&&atom.relation){
  if(COMPARATIVE_NEGATED.test(s)&&['better','worse'].includes(atom.relation.direction))out.push('comparison_direction_contradicts_wording');
  else if((sign>0&&atom.relation.direction==='worse')||(sign<0&&atom.relation.direction==='better'))out.push('comparison_direction_contradicts_wording');
 }else if((sign>0&&atom.polarity==='unfavorable')||(sign<0&&atom.polarity==='favorable'))out.push('polarity_contradicts_wording');
 if(ATTRIBUTION.test(s)&&(atom.evidenceMode==='direct_test'||atom.epistemicStatus==='observed'))out.push('attribution_promoted_to_observation');
 if(HEDGE.test(s)&&atom.epistemicStatus==='observed')out.push('speculation_promoted_to_observation');
 const comparesWithOther=atom.kind==='comparison'&&!!atom.relation&&atom.relation.targetVariantId!==atom.variantId;
 if(PREVIOUS.test(s)&&atom.variantId===variants[0]&&!comparesWithOther)out.push('previous_product_attributed_to_this');
 const named=variants.filter(v=>v!==atom.variantId&&names(v).length>=3&&` ${s} `.includes(` ${names(v)} `));
 if(named.length&&!` ${s} `.includes(` ${names(atom.variantId)} `))out.push('span_names_other_variant');
 return out;
}
