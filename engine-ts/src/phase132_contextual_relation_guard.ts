/**
 * Phase 132: conservative scope/polarity SCREEN, inspired by contextual assertion
 * detection, not a statistical NLI model. Rejects unsupported candidate edges;
 * never infers a positive edge from a negative phrase or promotes a negative edge.
 * No runtime dependency and no claim of general negation understanding.
 */
export type Label132='measures'|'contributes_to'|'conditioned_on'|'not_evidence_of';
export interface Span132 {start:number;end:number}
export type Reason132='cross_clause_relation'|'negation_of_positive_relation'|'negative_relation_without_local_cue'|
  'ambiguous_double_negation'|'conditional_context_requires_review';
export interface ContextScreen132 {allowHypothesis:boolean;reasons:Reason132[];
  qualifiers:('uncertain'|'conditional')[];scope:string;policyVersion:'132.1';}
const LIMITERS=/\s*(?:;|\bbut\b|\bhowever\b|\bwhereas\b|\balthough\b|\bnevertheless\b|\byet\b)\s*/gi;
const NEGATIVE=/\b(?:no|not|never|neither|nor|cannot|can't|doesn't|does\s+not|did\s+not|is\s+not|are\s+not|fails?\s+to|lack(?:s|ing)?|insufficient|unproven|unverified|without|nothing|does\s+not\s+establish)\b/i;
const AMBIGUOUS=/\b(?:not\s+(?:only|unlikely|impossible|necessarily)|no\s+longer\s+unproven|cannot\s+rule\s+out)\b/i;
const UNCERTAIN=/\b(?:may|might|could|possible|possibly|suggests?|suspect|hypothesized|appears?\s+to|probably|likely)\b/i;
const CONDITIONAL=/\b(?:if|provided|assuming|subject\s+to|depending\s+on|unless)\b/i;
/** Both marked entities MUST be in same simple clause. Otherwise syntax matters,
 * so reject rather than over-trust lexical features from one sentence.
 * Spans are character offsets in the supplied sentence (no HTML markup). */
export function screenRelationContext132(args:{text:string;subject:Span132;object:Span132;label:Label132}):ContextScreen132 {
 const {text,subject,object,label}=args;
 if(typeof text!=='string'||text.length>1200||![subject,object].every(s=>Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=text.length))throw Error('invalid_context_span');
 let cutPoints=[0];for(const hit of text.matchAll(LIMITERS))cutPoints.push(hit.index!+hit[0].length);cutPoints.push(text.length);
 const section=(s:Span132)=>{for(let i=0;i<cutPoints.length-1;i++)if(s.start>=cutPoints[i]&&s.end<=cutPoints[i+1])return i;return -1;};
 const a=section(subject),b=section(object);
 if(a<0||a!==b)return {allowHypothesis:false,reasons:['cross_clause_relation'],qualifiers:[],scope:'',policyVersion:'132.1'};
 const scope=text.slice(cutPoints[a],cutPoints[a+1]).trim();const reasons:Reason132[]=[];
 const neg=NEGATIVE.test(scope), ambiguous=AMBIGUOUS.test(scope);
 if(ambiguous)reasons.push('ambiguous_double_negation');
 if(neg&&label!=='not_evidence_of')reasons.push('negation_of_positive_relation');
 if(!neg&&label==='not_evidence_of')reasons.push('negative_relation_without_local_cue');
 // A 'conditioned_on' label under an explicit counterfactual is not a measured condition.
 if(label==='conditioned_on'&&CONDITIONAL.test(scope))reasons.push('conditional_context_requires_review');
 const qualifiers:ContextScreen132['qualifiers']=[];
 if(UNCERTAIN.test(scope))qualifiers.push('uncertain');
 if(CONDITIONAL.test(scope))qualifiers.push('conditional');
 return {allowHypothesis:reasons.length===0,reasons,qualifiers,scope,policyVersion:'132.1'};
}
