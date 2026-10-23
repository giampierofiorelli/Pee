/**
 * Declarative knowledge rules (KR, 2026-10-18): a small stratified Datalog with provenance.
 *
 * Why this exists. PEE's interpretation decisions (which statement of a document covers which value, which kind a value
 * is and why, when two values compare) were spread over imperative code, where the scope of each rule and the priority
 * between rules stayed implicit; several recent errors were exactly scope and priority errors. Here those decisions are
 * rules over typed facts, with a declared vocabulary (every predicate has an arity and a meaning), so that every module
 * reading the same knowledge reads it with the same meaning, and every conclusion can show the rules and facts it rests
 * on.
 *
 * Semantics. Function-free Horn rules with stratified negation as failure, evaluated bottom-up to the perfect model.
 * Negation is closed-world over the FACTS GIVEN (the record), never over the world: `not documented(O,C)` says the
 * record does not state C, not that C does not hold. Built-ins: = != < > on constants (numbers compare numerically).
 * Every rule must be safe (each variable of the head, of a negated literal or of a built-in occurs in a positive body
 * atom) and the program must be stratifiable; both are checked when the rules are loaded. Programs always terminate.
 *
 * Syntax. `head(X,c) :- p(X,Y), not q(Y), X != Y.`  Variables start with an upper-case letter or `_` (each `_` is a
 * fresh variable); constants are lower-case identifiers, numbers or "quoted strings". Zero-arity atoms are written
 * without parentheses.
 */

export type Const=string;
interface Term {v?:string;c?:Const}
interface Atom {pred:string;args:Term[]}
type Literal={kind:'pos';atom:Atom}|{kind:'neg';atom:Atom}|{kind:'cmp';op:'='|'!='|'<'|'>';l:Term;r:Term};
/** S102 (owner review of S100, 2026-10-20: "A rule introduced or approved during an earlier phase is not automatically
 * still valid"): the lifecycle of a rule. A rule without one is active. Superseded and retired rules are kept in the file
 * (their history and evidence) but never executed; under_review rules run and are reported. A rule marked `invariant`
 * (safety, provenance, evidence integrity) cannot be superseded or retired by a lifecycle entry: that needs an owner
 * decision and a change of the invariant itself. */
export type RuleState='active'|'under_review'|'superseded'|'retired'|'experimental'|'rejected';
/** S103 (owner authorisation 2026-10-20, rule admission): 'experimental' rules are admitted for evaluation only: they run
 * in shadow evaluations (evaluate(..., {shadow:true})) and their claims never decide; 'rejected' rules are kept with their
 * reason and evidence and never run. */
const EXECUTED:readonly RuleState[]=['active','under_review'];
export interface RuleLifecycle {state:RuleState;since:string;reason:string;
 /** the rule that replaces it (superseded only) */ supersededBy?:string;
 /** consumers affected by the change */ consumers?:string[];
 /** regression evidence: tests, evaluation files or reports */ evidence?:string[]}
/** S103: why a rule deserves to be used. A rule is admitted with a justified meaning, not only an executable form (owner:
 * "Rule consistency is not scientific correctness"). Classes:
 *  - logical: follows from the meaning of its terms, given its prerequisites (which must be listed);
 *  - convention: a defeasible reading convention (its exceptions must be listed);
 *  - policy: a choice PEE makes (precedence, vocabulary, caution) with its reason;
 *  - invariant: a general property that must always hold (semantic, reliability, evidence integrity, provenance,
 *    authorisation, safety), with a justification as a general property. A technical device adopted during development
 *    is not an invariant (owner follow-up on S102: RQ08). */
export type RuleClass='logical'|'convention'|'policy'|'invariant';
export type InvariantKind='semantic'|'reliability'|'evidence_integrity'|'provenance'|'authorisation'|'safety';
export interface RuleAdmission {
 meaning:string;scope:string;prerequisites:string[];exceptions:string[];
 /** cases where the rule must not apply, or where over-applying it would be wrong; each has an executable test */
 counterexamples:{case:string;expected:string;test:string}[];
 provenance:{origin:'owner_decision'|'research'|'existing_knowledge'|'document'|'failure_analysis'|'convention';ref:string};
 consumers:string[];
 classification:{class:RuleClass;invariantKind?:InvariantKind;justification:string};
 /** tests (file#name) that verify the rule positively and negatively */ evidence:string[];
 admitted:string;
 /** reclassifications and other changes of the admission itself; leaving the invariant class needs an owner decision */
 history?:{date:string;change:string;reason:string;ownerDecision?:string}[]}
export interface RuleDef {id:string;rule:string;statement:string;source:string;explain?:string;lifecycle?:RuleLifecycle;invariant?:boolean;admission?:RuleAdmission}
export interface PredicateDef {name:string;args:string[];meaning:string;role:'input'|'derived'|'constant';
 /** S103: argument positions that determine the others (at most one fact per key): domain semantics the analysis uses */
 key?:number[]}
export interface ProgramDef {id:string;statement:string;rules:RuleDef[];constants?:string[];
 /** S100: the program decides single-valued fields by defeasible claims (see DecisionDef). */
 decision?:DecisionDef;
 /** S103: admission policy. When required, every rule that runs (or runs in shadow) carries an admission record, except
  * the rules listed as admitted before the process existed (a list that may only shrink). */
 admission?:{required:boolean;legacyUnreviewed?:string[];legacyReason?:string};
 /** S103: derived predicates that must never hold together for the same arguments (integrity constraints, checked
  * statically when the program loads) */
 exclusive?:{preds:[string,string];why:string}[];
 /** S103: the values an input argument can take (gap analysis); values PEE deliberately does not interpret are listed
  * with the reason */
 domains?:{predicate:string;arg:number;values:string[];abstains?:Record<string,string>}[]}
/** S100 (owner review of S99, 2026-10-20: rule governance). A program that decides single-valued fields of an object (a
 * statement role, a nature, a provenance) does so through one CLAIM predicate claim(Object, Field, Value, Tier, Scope):
 * rules do not overwrite one another; each rule states what its evidence supports, with how much authority (Tier) and
 * about how much of the document (Scope). One precedence policy, written once here, decides (defeasible logic with a
 * superiority relation; a DMN priority hit policy with conflict detection):
 *  - tiers: constraint > explicit (evidence about this occurrence) > inherited (context: a heading, a caption, a section,
 *    the source) > default (a presumption);
 *  - a constraint is never defeated; two constraints that disagree are a conflict;
 *  - otherwise the highest tier with claims decides, and within it the NARROWEST scope with claims (the scopes are listed
 *    narrowest first); a statement about the occurrence outranks its context, a cell outranks its table heading;
 *  - claims that disagree at the deciding tier and scope are a CONFLICT: the field is undecided (abstention) and the
 *    conflict is reported, never settled by rule order;
 *  - a default never decides: it is reported as a presumption and the field stays undecided.
 * Governance at load time: every rule concluding a claim states a constant field, value and tier; fields and values are
 * declared; and two claim rules that conclude different values of a field at the same tier and scope must be declared
 * CONTESTED by name, with a reason, whenever the static analysis (S103, analyseProgram) finds that they can fire together
 * (a witness, verified by evaluation) or cannot establish that they cannot. A contest that names rules which can never
 * fire together is refused, so contests are never blanket declarations. */
export const TIERS=['constraint','explicit','inherited','default'] as const;export type Tier=typeof TIERS[number];
/** S103: a contest names the competing rules (every rule of one side against every rule of the other); `unverified` must
 * say why when the analysis could not decide whether some named pair can fire together. */
export interface ContestDef {id:string;field:string;tier:Tier;between:[string[],string[]];why:string;unverified?:string}
export interface DecisionDef {predicate:string;
 /** scope names, narrowest first */ scopes:string[];
 /** field -> admissible values */ fields:Record<string,string[]>;
 /** competing claim rules, resolved by abstention */
 contested:ContestDef[]}
export interface RuleSet {schema:string;version:string;statement:string;vocabulary:PredicateDef[];programs:ProgramDef[]}
interface Rule {id:string;head:Atom;body:Literal[];def:RuleDef}
export interface CompiledProgram {id:string;rules:Rule[];strata:Rule[][];constants:Atom[];vocab:Map<string,PredicateDef>;decision?:DecisionDef|null;
 /** S102: every rule of the program with its lifecycle state (superseded and retired rules are listed, not executed) */
 lifecycle:{rule:string;state:RuleState;invariant:boolean;lifecycle:RuleLifecycle|null}[];
 /** S103: experimental rules, evaluated only in shadow evaluations; their claims never decide */
 experimental:Rule[];shadowStrata:Rule[][];
 def:ProgramDef}

const fail=(m:string):never=>{throw new Error('knowledge_rules_invalid: '+m);};

// ---------------------------------------------------------------------------------------------------------------------
// Parsing
function tokenize(src:string):string[]{
 const out:string[]=[];const re=/\s*("(?:[^"\\]|\\.)*"|:-|!=|[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|[(),.=<>])/y;let i=0;
 while(i<src.length){if(/\s/.test(src[i])){i++;continue;}re.lastIndex=i;const m=re.exec(src);if(!m)fail(`unexpected character at ${i} in "${src}"`);out.push(m![1]);i=re.lastIndex;}
 return out;
}
let anon=0;
function parseRuleText(src:string):{head:Atom;body:Literal[]}{
 const t=tokenize(src);let i=0;const peek=()=>t[i],eat=(x?:string)=>{const y=t[i++];if(y===undefined)fail(`unexpected end in "${src}"`);if(x&&y!==x)fail(`expected ${x} in "${src}"`);return y;};
 const term=():Term=>{const x=eat();if(x.startsWith('"'))return {c:JSON.parse(x)};if(x==='_')return {v:'_'+(anon++)};if(/^[A-Z_]/.test(x))return {v:x};if(/^[a-z0-9-]/.test(x))return {c:x};return fail(`bad term ${x} in "${src}"`);};
 const atom=():Atom=>{const pred=eat();if(!/^[a-z][A-Za-z0-9_]*$/.test(pred))fail(`bad predicate ${pred} in "${src}"`);const args:Term[]=[];
  if(peek()==='('){eat('(');if(peek()!==')'){args.push(term());while(peek()===','){eat(',');args.push(term());}}eat(')');}return {pred,args};};
 const literal=():Literal=>{if(peek()==='not'){eat();return {kind:'neg',atom:atom()};}
  // a comparison starts with a term followed by an operator
  if(/^[A-Z_"0-9-]/.test(peek()!)&&['=','!=','<','>'].includes(t[i+1])){const l=term();const op=eat() as '='|'!='|'<'|'>';return {kind:'cmp',op,l,r:term()};}
  return {kind:'pos',atom:atom()};};
 const head=atom();const body:Literal[]=[];
 if(peek()===':-'){eat();body.push(literal());while(peek()===','){eat(',');body.push(literal());}}
 eat('.');if(i!==t.length)fail(`trailing tokens in "${src}"`);return {head,body};
}

// ---------------------------------------------------------------------------------------------------------------------
// Compilation: vocabulary, safety, stratification
const vars=(ts:Term[])=>ts.filter(x=>x.v).map(x=>x.v!);
/** `analysisOnly` (tooling): compile without enforcing contests and exclusions, so the analysis can show what to declare. */
export function compileRuleSet(rs:RuleSet,opts:{analysisOnly?:boolean}={}):Map<string,CompiledProgram>{
 if(!rs||!Array.isArray(rs.vocabulary)||!Array.isArray(rs.programs))fail('rule set shape');
 const vocab=new Map<string,PredicateDef>();for(const p of rs.vocabulary){if(vocab.has(p.name))fail('duplicate predicate '+p.name);if(!p.meaning)fail('predicate without meaning '+p.name);vocab.set(p.name,p);}
 const out=new Map<string,CompiledProgram>();
 for(const pd of rs.programs){
  const ids=new Set<string>();
  const check=(a:Atom,where:string)=>{const d=vocab.get(a.pred);if(!d)fail(`undeclared predicate ${a.pred} in ${where}`);if(d!.args.length!==a.args.length)fail(`${a.pred} has arity ${d!.args.length}, used with ${a.args.length} in ${where}`);};
  // S102: lifecycle checks; only active and under_review rules are compiled for execution
  {const all=new Set<string>();for(const d of pd.rules){if(all.has(d.id))fail('duplicate rule '+d.id);all.add(d.id);}}
  const life=new Map(pd.rules.map(d=>[d.id,d.lifecycle?.state??'active']));
  for(const d of pd.rules){const l=d.lifecycle;if(!l)continue;
   if(!['active','under_review','superseded','retired','experimental','rejected'].includes(l.state))fail(`rule ${d.id}: unknown lifecycle state ${l.state}`);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(l.since??'')||!l.reason)fail(`rule ${d.id}: a lifecycle entry needs a date and a reason`);
   const ends=l.state==='superseded'||l.state==='retired'||l.state==='rejected';
   if(ends&&!(l.evidence?.length))fail(`rule ${d.id}: ${l.state} without regression evidence`);
   if(ends&&d.invariant)fail(`rule ${d.id} is an invariant: it cannot be ${l.state} by a lifecycle entry (owner decision required)`);
   if(l.state==='superseded'){if(!l.supersededBy)fail(`rule ${d.id}: superseded without a successor`);
    // a successor may live in another program of the same rule set: 'program/RULE'
    const [sp,sr]=l.supersededBy!.includes('/')?l.supersededBy!.split('/'):[pd.id,l.supersededBy!];
    const other=rs.programs.find(x=>x.id===sp);const od=other?.rules.find(x=>x.id===sr);
    const st=sp===pd.id?life.get(sr):od?(od.lifecycle?.state??'active'):undefined;if(!st)fail(`rule ${d.id}: successor ${l.supersededBy} does not exist`);
    if(!EXECUTED.includes(st!))fail(`rule ${d.id}: successor ${l.supersededBy} is itself ${st}`);}}
  checkAdmission(pd);
  const lifecycle=pd.rules.map(d=>({rule:d.id,state:(d.lifecycle?.state??'active') as RuleState,invariant:!!d.invariant,lifecycle:d.lifecycle??null}));
  const compileRule=(def:RuleDef):Rule=>{if(ids.has(def.id))fail('duplicate rule '+def.id);ids.add(def.id);if(!def.statement)fail('rule without statement '+def.id);
   const {head,body}=parseRuleText(def.rule);check(head,def.id);for(const l of body)if(l.kind!=='cmp')check(l.atom,def.id);
   const hd=vocab.get(head.pred)!;if(hd.role!=='derived')fail(`rule ${def.id} derives ${head.pred}, which is not a derived predicate`);
   const bound=new Set(body.flatMap(l=>l.kind==='pos'?vars(l.atom.args):[]));
   // variables written `_` inside a negation are existential ("no fact with any value there")
   const need=[...vars(head.args),...body.flatMap(l=>l.kind==='neg'?vars(l.atom.args).filter(v=>!/^_\d+$/.test(v)):l.kind==='cmp'?vars([l.l,l.r]):[])];
   for(const v of need)if(!bound.has(v))fail(`rule ${def.id} is unsafe: ${v} is not bound by a positive literal`);
   return {id:def.id,head,body,def};};
  const stateOf=(d:RuleDef)=>d.lifecycle?.state??'active';
  const rules:Rule[]=pd.rules.filter(d=>EXECUTED.includes(stateOf(d))).map(compileRule);
  const experimental:Rule[]=pd.rules.filter(d=>stateOf(d)==='experimental').map(compileRule);
  const constants=(pd.constants??[]).map(c=>{const {head,body}=parseRuleText(c);if(body.length||vars(head.args).length)fail('constant with variables: '+c);check(head,pd.id);
   if(vocab.get(head.pred)!.role!=='constant')fail(`${head.pred} is not a constant predicate`);return head;});
  const strata=stratify(pd.id,rules),shadowStrata=stratify(pd.id,[...rules,...experimental]);
  const cp:CompiledProgram={id:pd.id,rules,strata,constants,vocab,decision:pd.decision??null,lifecycle,experimental,shadowStrata,def:pd};
  if(pd.decision)checkDecision(cp,!!opts.analysisOnly);
  if(pd.exclusive?.length&&!opts.analysisOnly)checkExclusive(cp);
  out.set(pd.id,cp);}
 return out;
}
// stratification: a predicate's stratum is at least that of every positive dependency and above every negative one
function stratify(id:string,rules:Rule[]):Rule[][]{
 const preds=new Set(rules.map(r=>r.head.pred));const st=new Map<string,number>();for(const p of preds)st.set(p,0);
 for(let pass=0,changed=true;changed;pass++){changed=false;if(pass>preds.size+1)fail(`program ${id} is not stratifiable (recursion through negation)`);
  for(const r of rules)for(const l of r.body){if(l.kind==='cmp'||!preds.has(l.atom.pred))continue;const need=(st.get(l.atom.pred)!)+(l.kind==='neg'?1:0);
   if(need>st.get(r.head.pred)!){st.set(r.head.pred,need);changed=true;}}}
 const n=Math.max(0,...st.values());const strata:Rule[][]=Array.from({length:n+1},()=>[]);for(const r of rules)strata[st.get(r.head.pred)!].push(r);
 return strata;
}
/** S103: the admission policy (see RuleAdmission). Checked when the rules load; what cannot be checked mechanically (that a
 * meaning is scientifically right) is left to the record's evidence and the owner, never assumed. */
function checkAdmission(pd:ProgramDef){
 const str=(x:unknown)=>typeof x==='string'&&x.trim().length>0;
 const runs=(d:RuleDef)=>{const s=d.lifecycle?.state??'active';return EXECUTED.includes(s)||s==='experimental';};
 const legacy=new Set(pd.admission?.legacyUnreviewed??[]);
 for(const id of legacy){const d=pd.rules.find(r=>r.id===id);if(!d)fail(`program ${pd.id}: legacy rule ${id} does not exist`);
  if(d!.admission)fail(`program ${pd.id}: rule ${id} has an admission record: remove it from legacyUnreviewed`);}
 if(legacy.size&&!str(pd.admission?.legacyReason))fail(`program ${pd.id}: legacyUnreviewed needs a reason`);
 for(const d of pd.rules){const a=d.admission;const where=`rule ${d.id}`;
  if(!a){if(d.invariant)fail(`${where} is marked invariant without an admission record (kind and justification)`);
   if(pd.admission?.required&&runs(d)&&!legacy.has(d.id))fail(`${where}: program ${pd.id} requires an admission record for every rule that runs`);
   if(d.lifecycle?.state==='experimental')fail(`${where}: an experimental rule needs an admission record`);
   continue;}
  for(const f of ['meaning','scope','admitted'] as const)if(!str(a[f]))fail(`${where}: admission.${f} missing`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(a.admitted))fail(`${where}: admission.admitted must be a date`);
  for(const f of ['prerequisites','exceptions','consumers','evidence'] as const)if(!Array.isArray(a[f])||!a[f].every(str))fail(`${where}: admission.${f} must be a list of statements`);
  if(!a.consumers.length)fail(`${where}: admission names no consumer`);
  if(!a.evidence.length)fail(`${where}: admission without test evidence`);
  if(!Array.isArray(a.counterexamples)||!a.counterexamples.length)fail(`${where}: admission names no counterexample (a case where the rule must not apply)`);
  for(const c of a.counterexamples)if(!str(c?.case)||!str(c?.expected)||!str(c?.test))fail(`${where}: a counterexample needs a case, the expected reading and a test`);
  if(!a.provenance||!['owner_decision','research','existing_knowledge','document','failure_analysis','convention'].includes(a.provenance.origin)||!str(a.provenance.ref))fail(`${where}: admission.provenance needs an origin and a reference`);
  const c=a.classification;if(!c||!['logical','convention','policy','invariant'].includes(c.class)||!str(c.justification))fail(`${where}: admission.classification needs a class and a justification`);
  if((c.class==='invariant')!==!!d.invariant)fail(`${where}: classification ${c.class} disagrees with invariant=${!!d.invariant}`);
  if(c.class==='invariant'){if(!['semantic','reliability','evidence_integrity','provenance','authorisation','safety'].includes(c.invariantKind??''))fail(`${where}: an invariant names its kind`);
   if(c.justification.trim().length<60)fail(`${where}: an invariant needs a justification as a general property, not a label`);}
  if(c.class==='logical'&&!a.prerequisites.length)fail(`${where}: a logical rule lists the prerequisites under which it holds`);
  if(c.class==='convention'&&!a.exceptions.length)fail(`${where}: a convention is defeasible: list its known exceptions`);
  for(const h of a.history??[]){if(!/^\d{4}-\d{2}-\d{2}$/.test(h.date)||!str(h.change)||!str(h.reason))fail(`${where}: an admission history entry needs a date, a change and a reason`);
   if(/\binvariant\b/i.test(h.change)&&/\bfrom\b/i.test(h.change)&&!str(h.ownerDecision))fail(`${where}: leaving the invariant class needs an owner decision (${h.change})`);}}
}

// ---------------------------------------------------------------------------------------------------------------------
// Evaluation with provenance
/** A negated premise that held: no fact matching `pattern` existed in the record (closed over the record, not the
 * world). `inputPredicate`: the absence is of a given fact; otherwise nothing in the record derives one. */
export interface Absence {pred:string;pattern:(Const|null)[];inputPredicate:boolean;factsOfPredicate:number}
export interface Fact {pred:string;args:Const[];rule:string|null;bindings:Record<string,Const>|null;premises:Fact[];absences?:Absence[]}
const key=(p:string,a:readonly Const[])=>p+'('+a.join('\u0001')+')';
const num=(x:Const)=>/^-?\d+(?:\.\d+)?$/.test(x)?Number(x):null;
const cmp=(op:string,a:Const,b:Const)=>{if(op==='=')return a===b;if(op==='!=')return a!==b;const x=num(a),y=num(b);if(x===null||y===null){const c=String(a).localeCompare(String(b),'en',{numeric:true});return op==='<'?c<0:c>0;}// audit S77: "s10" > "s9" (was code-unit order)
 return op==='<'?x<y:x>y;};
export class Model {
 private byPred=new Map<string,Map<string,Fact>>();
 /** S103: the input facts and whether experimental rules ran (shadow evaluation) */
 input:Input={};shadow=false;
 constructor(readonly program:CompiledProgram,readonly record:string='record'){}
 add(f:Fact):boolean{let m=this.byPred.get(f.pred);if(!m){m=new Map();this.byPred.set(f.pred,m);}const k=key(f.pred,f.args);if(m.has(k))return false;m.set(k,f);return true;}
 all(pred:string):Fact[]{return [...(this.byPred.get(pred)?.values()??[])];}
 /** Facts of a predicate whose arguments match a pattern (null = any). */
 match(pred:string,pattern:readonly (Const|null)[]):Fact[]{return this.all(pred).filter(f=>pattern.every((p,i)=>p===null||f.args[i]===p));}
 has(pred:string,args:readonly Const[]):boolean{return !!this.byPred.get(pred)?.has(key(pred,args));}
 /** The derivation of a fact: the rule, its statement and the premises, down to the input facts. */
 why(f:Fact,depth=0):string[]{const pad='  '.repeat(depth);const head=`${pad}${f.pred}(${f.args.join(', ')})`;
  if(!f.rule)return [head+'  [given]'];const r=[...this.program.rules,...this.program.experimental].find(x=>x.id===f.rule)!;
  const abs=(f.absences??[]).map(a=>`${pad}  not ${a.pred}(${a.pattern.map(x=>x??'*').join(', ')})  [absent from ${this.record}: ${a.inputPredicate?`no such fact among ${a.factsOfPredicate} given ${a.pred} facts`:`nothing in it derives one (${a.factsOfPredicate} ${a.pred} facts derived)`}]`);
  return [`${head}  [${f.rule}: ${r.def.statement}]`,...f.premises.flatMap(p=>this.why(p,depth+1)),...abs];}
 /** The rules a fact rests on (its own and its premises'), in derivation order. */
 rulesOf(f:Fact):string[]{return [...new Set([...(f.rule?[f.rule]:[]),...f.premises.flatMap(p=>this.rulesOf(p))])];}
}
type Input=Record<string,ReadonlyArray<ReadonlyArray<string|number>>>;
/** Evaluate a compiled program over input facts. Every input predicate must be declared as an input. With `shadow`, the
 * experimental rules run too (S103); their claims are reported by decide() and never decide. */
export function evaluate(p:CompiledProgram,input:Input,opts:{record?:string;shadow?:boolean}={}):Model{
 const m=new Model(p,opts.record);m.input=input;m.shadow=!!opts.shadow;
 const all=opts.shadow?[...p.rules,...p.experimental]:p.rules;
 // an input is an input predicate, or a predicate another program derives (kind_of is derived by `kind`, given to `compare`)
 for(const [pred,rows] of Object.entries(input)){const d=p.vocab.get(pred);if(!d||!(d.role==='input'||(d.role==='derived'&&!all.some(r=>r.head.pred===pred))))fail(`${pred} is not an input of program ${p.id}`);
  for(const r of rows){if(r.length!==d!.args.length)fail(`${pred} needs ${d!.args.length} arguments`);m.add({pred,args:r.map(String),rule:null,bindings:null,premises:[]});}}
 for(const c of p.constants)m.add({pred:c.pred,args:c.args.map(t=>t.c!),rule:null,bindings:null,premises:[]});
 for(const stratum of opts.shadow?p.shadowStrata:p.strata){
  for(let changed=true;changed;){changed=false;
   for(const r of stratum){
    const pos=r.body.filter((l):l is {kind:'pos';atom:Atom}=>l.kind==='pos');const rest=r.body.filter(l=>l.kind!=='pos');
    const solve=(i:number,b:Record<string,Const>,prem:Fact[]):void=>{
     if(i<pos.length){const a=pos[i].atom;const pat=a.args.map(t=>t.c??(b[t.v!]??null));
      for(const f of m.match(a.pred,pat)){const nb={...b};let ok=true;a.args.forEach((t,j)=>{if(t.v){if(nb[t.v]!==undefined&&nb[t.v]!==f.args[j])ok=false;nb[t.v]=f.args[j];}});if(ok)solve(i+1,nb,[...prem,f]);}
      return;}
     const val=(t:Term)=>t.c??b[t.v!];const absences:Absence[]=[];
     for(const l of rest){if(l.kind==='cmp'){if(!cmp(l.op,val(l.l),val(l.r)))return;}
      else if(l.kind==='neg'){const pat=l.atom.args.map(t=>t.c??b[t.v!]??null);if(m.match(l.atom.pred,pat).length)return;
       // record what was checked: a negated premise is evidence of absence from this record only
       absences.push({pred:l.atom.pred,pattern:pat,inputPredicate:!all.some(x=>x.head.pred===l.atom.pred),factsOfPredicate:m.all(l.atom.pred).length});}}
     if(m.add({pred:r.head.pred,args:r.head.args.map(val),rule:r.id,bindings:b,premises:prem,...(absences.length?{absences}:{})}))changed=true;};
    solve(0,{},[]);}}}
 return m;
}
/** Render a rule's explanation template: {X} is a binding; {@pred(a,X)} lists the last argument of matching facts. */
export function explain(m:Model,f:Fact):string{
 const r=[...m.program.rules,...m.program.experimental].find(x=>x.id===f.rule);const tpl=r?.def.explain??r?.def.statement??`${f.pred}(${f.args.join(', ')})`;const b=f.bindings??{};
 return tpl.replace(/\{@([a-z_]+)\(([^)]*)\)\}/g,(_,pred:string,args:string)=>{const pat=args.split(',').map(s=>s.trim()).map(s=>s==='*'?null:/^[A-Z]/.test(s)?b[s]??null:s);
   return m.match(pred,pat).map(x=>x.args.at(-1)).join('/')||'unknown';})
  .replace(/\{([A-Z][A-Za-z0-9_]*)\}/g,(_,v:string)=>String(b[v]??v));
}

// ---------------------------------------------------------------------------------------------------------------------
// S100: defeasible decisions (see DecisionDef)
/** What one claim rule can conclude, from its head: the rule registry entry of a decision program. */
export interface ClaimRule {rule:string;field:string;value:string;tier:Tier;scope:string|null;statement:string;source:string}
function claimHead(r:Rule):{field:string;value:string;tier:Tier;scope:string|null}{
 const [,f,v,t,sc]=r.head.args;
 if(!f.c||!v.c||!t.c)fail(`claim rule ${r.id} must state a constant field, value and tier`);
 return {field:f.c!,value:v.c!,tier:t.c! as Tier,scope:sc.c??null};}
function checkDecision(cp:CompiledProgram,analysisOnly=false){
 const id=cp.id,d=cp.decision!,vocab=cp.vocab;
 const pd=vocab.get(d.predicate);if(!pd||pd.role!=='derived'||pd.args.length!==5)fail(`decision predicate ${d.predicate} of ${id} must be a derived predicate of arity 5 (object, field, value, tier, scope)`);
 if(!d.scopes?.length)fail(`decision of ${id} declares no scopes`);
 const all=[...cp.rules,...cp.experimental];
 const claims=all.filter(r=>r.head.pred===d.predicate).map(r=>({r,...claimHead(r)}));
 for(const c of claims){if(!(TIERS as readonly string[]).includes(c.tier))fail(`claim rule ${c.r.id}: unknown tier ${c.tier}`);
  if(!d.fields[c.field])fail(`claim rule ${c.r.id}: undeclared field ${c.field}`);if(!d.fields[c.field].includes(c.value))fail(`claim rule ${c.r.id}: value ${c.value} not admissible for ${c.field}`);
  if(c.scope!==null&&!d.scopes.includes(c.scope))fail(`claim rule ${c.r.id}: undeclared scope ${c.scope}`);}
 // duplicate rules (same head and body) are always an error
 const sig=(r:Rule)=>JSON.stringify([r.head,r.body]);const seen=new Map<string,string>();
 for(const r of all){const k=sig(r);if(seen.has(k))fail(`rules ${seen.get(k)} and ${r.id} are duplicates`);seen.set(k,r.id);}
 if(analysisOnly)return;
 // S103: contests name rules; each named pair must be able to conflict, and every pair that can conflict must be named
 for(const g of d.contested??[]){const g0=g as ContestDef&{values?:unknown};
  if(g0.values!==undefined||!Array.isArray(g.between)||g.between.length!==2)fail(`contest ${g.id??'?'} of ${id}: a contest names the competing rules (between: [[...],[...]]); blanket contests by value and scope are no longer admitted (S103)`);
  if(!g.id||!g.why||g.why.trim().length<20)fail(`contest ${g.id??'?'} of ${id}: a contest needs an id and a reason`);}
 const conf=conflictingClaimPairs(cp);const declared=new Map<string,ContestDef>();
 for(const g of d.contested??[])for(const x of g.between[0])for(const y of g.between[1]){
  const cx=claims.find(c=>c.r.id===x),cy=claims.find(c=>c.r.id===y);
  if(!cx||!cy)fail(`contest ${g.id}: ${!cx?x:y} is not a claim rule that runs`);
  const pair=conf.find(p=>(p.a===x&&p.b===y)||(p.a===y&&p.b===x));
  if(!pair)fail(`contest ${g.id} names ${x} and ${y}, which can never conflict (different field, tier or scope, or the same value)`);
  if(cx!.field!==g.field||cx!.tier!==g.tier)fail(`contest ${g.id}: ${x} concludes ${cx!.field} at tier ${cx!.tier}, not ${g.field} at ${g.tier}`);
  const v=pairOverlap(cp,cx!.r,cy!.r);
  if(v.verdict==='disjoint')fail(`contest ${g.id} names ${x} and ${y}, which can never fire together (${v.why}): remove them from the contest`);
  if(v.verdict==='incomplete'&&!g.unverified)fail(`contest ${g.id}: the analysis cannot decide whether ${x} and ${y} fire together (${v.why}); say why the contest is kept (unverified)`);
  declared.set([x,y].sort().join('|'),g);}
 for(const p of conf){if(declared.has([p.a,p.b].sort().join('|')))continue;
  const ra=all.find(r=>r.id===p.a)!,rb=all.find(r=>r.id===p.b)!;
  if(cp.experimental.includes(ra)||cp.experimental.includes(rb))continue;// experimental claims never decide
  const v=pairOverlap(cp,ra,rb);if(v.verdict==='disjoint')continue;
  fail(`claim rules ${p.a} (${p.field}=${p.va}) and ${p.b} (${p.field}=${p.vb}) can contradict at tier ${p.tier}, scope ${p.scope}`+
   (v.verdict==='overlap'?` (witness: ${describeFacts(v.witness!)})`:` (analysis incomplete: ${v.why})`)+': name them in a contest with the reason, or change a rule');}
}
/** The registry of a decision program: every claim rule with what it can conclude. */
export function claimRules(p:CompiledProgram):ClaimRule[]{
 if(!p.decision)return [];
 return p.rules.filter(r=>r.head.pred===p.decision!.predicate).map(r=>({rule:r.id,...claimHead(r),statement:r.def.statement,source:r.def.source}));}
export interface Decision {object:string;field:string;value:string|null;tier:Tier|null;scope:string|null;
 /** the claims that decided (same value) */ by:string[];
 /** disagreement at the deciding level: the field is undecided */ conflict:{values:string[];rules:string[]}|null;
 /** a default that would apply, reported, never decided */ presumption:string|null;
 /** claims outranked by the deciding level */ defeated:{rule:string;value:string;tier:Tier;scope:string}[];
 /** S103: claims of experimental rules (shadow evaluation only); they never decide */ shadow?:{rule:string;value:string;tier:Tier;scope:string}[]}
/** Decide every (object, field) from the claim facts of a model (the precedence policy of DecisionDef). */
export function decide(m:Model):Decision[]{
 const d=m.program.decision;if(!d)fail(`program ${m.program.id} declares no decision`);
 // S103: experimental claims never decide: a shadow model decides as the operational program does and reports the claims
 // only experimental rules add
 if(m.shadow){const op=evaluate(m.program,m.input,{record:m.record});const ds=decide(op);
  const extra=m.all(d!.predicate).filter(f=>!op.has(f.pred,f.args));
  for(const f of extra){const [object,field]=f.args;let x=ds.find(y=>y.object===object&&y.field===field);
   if(!x){x={object,field,value:null,tier:null,scope:null,by:[],conflict:null,presumption:null,defeated:[]};ds.push(x);}
   (x.shadow??=[]).push({rule:f.rule??'given',value:f.args[2],tier:f.args[3] as Tier,scope:f.args[4]});}
  return ds;}
 const rank=(s:string)=>{const i=d!.scopes.indexOf(s);if(i<0)fail(`claim with undeclared scope ${s}`);return i;};
 const groups=new Map<string,Fact[]>();for(const f of m.all(d!.predicate)){const k=f.args[0]+'\u0001'+f.args[1];(groups.get(k)??groups.set(k,[]).get(k)!).push(f);}
 const out:Decision[]=[];
 for(const fs of groups.values()){const [object,field]=fs[0].args;const tierOf=(f:Fact)=>f.args[3] as Tier;
  const base:Decision={object,field,value:null,tier:null,scope:null,by:[],conflict:null,presumption:null,defeated:[]};
  const defaults=fs.filter(f=>tierOf(f)==='default');const dv=[...new Set(defaults.map(f=>f.args[2]))];base.presumption=dv.length===1?dv[0]:null;
  const level=(['constraint','explicit','inherited'] as Tier[]).find(t=>fs.some(f=>tierOf(f)===t));
  if(!level){base.defeated=[];out.push(base);continue;}
  const atTier=fs.filter(f=>tierOf(f)===level);
  const narrow=level==='constraint'?null:Math.min(...atTier.map(f=>rank(f.args[4])));
  const deciding=narrow===null?atTier:atTier.filter(f=>rank(f.args[4])===narrow);
  const values=[...new Set(deciding.map(f=>f.args[2]))];
  const defeated=fs.filter(f=>!deciding.includes(f)&&tierOf(f)!=='default').map(f=>({rule:f.rule??'given',value:f.args[2],tier:tierOf(f),scope:f.args[4]}));
  if(values.length===1)out.push({...base,value:values[0],tier:level,scope:narrow===null?deciding[0].args[4]:d!.scopes[narrow],by:[...new Set(deciding.map(f=>f.rule??'given'))],defeated});
  else out.push({...base,tier:level,scope:narrow===null?null:d!.scopes[narrow],conflict:{values:values.sort(),rules:[...new Set(deciding.map(f=>f.rule??'given'))]},defeated});}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// S103: static analysis of rules (owner authorisation 2026-10-20: "detect semantic overlap, conflicting conclusions,
// redundant or subsumed rules and meaningful gaps … State exactly which rule classes the analyser covers; never claim
// completeness outside that scope"). The method is the one of DMN decision-table analysis (Calvanese et al., BPM 2016:
// overlapping and missing rules) carried over to these Horn programs; no external engine.
/** What the analyser decides exactly, and what it only reports. */
export const ANALYSIS_COVERAGE=[
 'Two rules can fire together (overlap) when a set of input facts makes both conclusions hold. The analyser builds the',
 'smallest such set (the canonical database of the two bodies, with fresh constants and the keys of single-valued',
 'predicates applied), evaluates the program on it, and reports it as a witness. A witness always proves an overlap.',
 'COMPLETE class (absence of a witness proves the rules never fire together): the bodies, after unfolding the derived',
 'predicates they use, contain positive atoms, comparisons (= and != on any constants; < and > on numbers, solved over',
 'the rationals), and negations of predicates whose truth can only grow with the input (input predicates, or derived',
 'predicates defined without negation). PARTIAL class (absence of a witness is reported as INCOMPLETE, never as',
 '"no conflict"): recursive predicates, negation of a predicate that is itself defined with negation, order comparisons',
 'with non-numeric constants, constant predicates with several possible matches, more than 512 unfoldings.',
 'Independence assumption: input facts are independent except for the declared keys (PredicateDef.key). Exclusions the',
 'readers guarantee but the program does not declare are not used, so an overlap may be possible in the program but',
 'never produced by the readers; such a contest is kept, conservatively.',
 'Redundancy: a rule is redundant when, on its canonical database, the rest of the program derives the same conclusion;',
 'exact when that derivation uses only rules without negation, otherwise reported as possible.',
 'Gaps: a declared input value that no rule reads positively and that is not declared as a deliberate abstention.',
].join(' ');
class Incomplete extends Error{}
type Subst=Map<string,Term>;
const walk=(t:Term,s:Subst):Term=>{let x=t;for(let i=0;x.v!==undefined&&s.has(x.v)&&i<10000;i++)x=s.get(x.v)!;return x;};
function unifyT(a0:Term,b0:Term,s:Subst):boolean{const a=walk(a0,s),b=walk(b0,s);if(a.v!==undefined&&b.v!==undefined&&a.v===b.v)return true;
 if(a.v!==undefined){s.set(a.v,b);return true;}if(b.v!==undefined){s.set(b.v,a);return true;}return a.c===b.c;}
const sameT=(a0:Term,b0:Term,s:Subst)=>{const a=walk(a0,s),b=walk(b0,s);return a.v!==undefined?a.v===b.v:b.v===undefined&&a.c===b.c;};
let renames=0;
function renameRule(head:Atom,body:Literal[]):{head:Atom;body:Literal[]}{const n=++renames;const m=(t:Term):Term=>t.v!==undefined?{v:t.v+'#'+n}:t;
 const ma=(a:Atom):Atom=>({pred:a.pred,args:a.args.map(m)});
 return {head:ma(head),body:body.map(l=>l.kind==='cmp'?{...l,l:m(l.l),r:m(l.r)}:{kind:l.kind,atom:ma(l.atom)} as Literal)};}
const allRules=(cp:CompiledProgram)=>[...cp.rules,...cp.experimental];
const definers=(cp:CompiledProgram,pred:string)=>allRules(cp).filter(r=>r.head.pred===pred);
/** Replace each positive derived atom by the bodies of the rules that define it (head unification as equalities). */
function unfold(cp:CompiledProgram,body:Literal[],stack:string[]):Literal[][]{
 let alts:Literal[][]=[[]];
 for(const l of body){
  const ds=l.kind==='pos'?definers(cp,l.atom.pred):[];
  if(!ds.length){alts=alts.map(a=>[...a,l]);continue;}
  const atom=(l as {atom:Atom}).atom;
  if(stack.includes(atom.pred))throw new Incomplete(`recursive predicate ${atom.pred}`);
  const exp:Literal[][]=[];
  for(const r of ds){const rr=renameRule(r.head,r.body);const eqs:Literal[]=rr.head.args.map((t,i)=>({kind:'cmp',op:'=',l:atom.args[i],r:t}));
   for(const sub of unfold(cp,rr.body,[...stack,atom.pred]))exp.push([...eqs,...sub]);}
  const next:Literal[][]=[];for(const a of alts)for(const e of exp){next.push([...a,...e]);if(next.length>512)throw new Incomplete('more than 512 unfoldings');}
  alts=next;}
 return alts;
}
/** A predicate whose truth can only grow with the input (no negation anywhere in its definition). */
function monotone(cp:CompiledProgram,pred:string,seen=new Set<string>()):boolean{
 const ds=definers(cp,pred);if(!ds.length||seen.has(pred))return true;seen.add(pred);
 return ds.every(r=>r.body.every(l=>l.kind==='cmp'||(l.kind==='pos'&&monotone(cp,l.atom.pred,seen))));}
const fmtNum=(n:number)=>String(Number(n.toFixed(6)));
/** Numbers for the variables compared with < and >: strict order over the rationals, values distinct from each other and
 * from the constants unless forced. Null on success. */
function solveOrder(lt:[Term,Term][],s:Subst,val:Map<string,number>):{status:'unsat'|'incomplete';why:string}|null{
 const nodes=new Set<string>();const lo=new Map<string,number>(),hi=new Map<string,number>();const succ=new Map<string,Set<string>>();const used=new Set<number>();
 for(const [a0,b0] of lt){const a=walk(a0,s),b=walk(b0,s);
  if(a.c!==undefined&&b.c!==undefined){if(!cmp('<',a.c,b.c))return {status:'unsat',why:`${a.c} < ${b.c} is false`};continue;}
  if((a.c!==undefined&&num(a.c)===null)||(b.c!==undefined&&num(b.c)===null))return {status:'incomplete',why:'order comparison with a non-numeric constant'};
  if(a.c!==undefined)used.add(num(a.c)!);if(b.c!==undefined)used.add(num(b.c)!);
  if(a.v!==undefined)nodes.add(a.v);if(b.v!==undefined)nodes.add(b.v);
  if(a.v!==undefined&&b.v!==undefined){if(a.v===b.v)return {status:'unsat',why:'a value cannot be smaller than itself'};(succ.get(a.v)??succ.set(a.v,new Set()).get(a.v)!).add(b.v);}
  else if(a.v!==undefined)hi.set(a.v,Math.min(hi.get(a.v)??Infinity,num(b.c!)!));
  else lo.set(b.v!,Math.max(lo.get(b.v!)??-Infinity,num(a.c!)!));}
 const order:string[]=[];const state=new Map<string,number>();
 const visit=(v:string):boolean=>{const st=state.get(v);if(st===1)return false;if(st===2)return true;state.set(v,1);for(const w of succ.get(v)??[])if(!visit(w))return false;state.set(v,2);order.push(v);return true;};
 for(const v of nodes)if(!visit(v))return {status:'unsat',why:'a cycle of strict inequalities'};
 const H=new Map<string,number>();for(const v of order){let h=hi.get(v)??Infinity;for(const w of succ.get(v)??[])h=Math.min(h,H.get(w)!);H.set(v,h);}
 for(const v of [...order].reverse()){let l=lo.get(v)??-Infinity;for(const [u,ws] of succ)if(ws.has(v)&&val.has(u))l=Math.max(l,val.get(u)!);
  const h=H.get(v)!;if(!(l<h))return {status:'unsat',why:'the order constraints leave no value'};
  let x=NaN;for(let k=1;k<64;k++){const c=l===-Infinity&&h===Infinity?k-1:l===-Infinity?h-k:h===Infinity?l+k:l+(h-l)*k/64;if(!used.has(c)){x=c;break;}}
  if(Number.isNaN(x))return {status:'incomplete',why:'no free numeric value'};used.add(x);val.set(v,x);}
 return null;
}
type WitnessR={status:'sat';facts:[string,Const[]][];s:Subst;ground:(t:Term)=>Const|null}|{status:'unsat'|'incomplete';why:string};
/** The canonical database of a conjunction: the smallest set of input facts that satisfies its positive atoms. */
function witnessOf(cp:CompiledProgram,lits:Literal[]):WitnessR{
 const s:Subst=new Map();
 for(const l of lits)if(l.kind==='cmp'&&l.op==='='&&!unifyT(l.l,l.r,s))return {status:'unsat',why:`${walk(l.l,s).c} and ${walk(l.r,s).c} are different constants`};
 const pos=lits.filter((l):l is {kind:'pos';atom:Atom}=>l.kind==='pos');
 for(const l of pos){if(cp.vocab.get(l.atom.pred)?.role!=='constant')continue;
  const ms=cp.constants.filter(c=>c.pred===l.atom.pred&&c.args.every((a,i)=>unifyT(l.atom.args[i],a,new Map(s))));
  if(!ms.length)return {status:'unsat',why:`no ${l.atom.pred} constant matches`};
  if(ms.length>1&&l.atom.args.some(a=>walk(a,s).v!==undefined))return {status:'incomplete',why:`several ${l.atom.pred} constants could match`};
  ms[0].args.forEach((a,i)=>unifyT(l.atom.args[i],a,s));}
 for(let changed=true;changed;){changed=false;
  for(let i=0;i<pos.length;i++)for(let j=i+1;j<pos.length;j++){const A=pos[i].atom,B=pos[j].atom;if(A.pred!==B.pred)continue;const k=cp.vocab.get(A.pred)?.key;if(!k?.length)continue;
   if(!k.every(x=>sameT(A.args[x],B.args[x],s)))continue;
   for(let x=0;x<A.args.length;x++){if(sameT(A.args[x],B.args[x],s))continue;
    if(!unifyT(A.args[x],B.args[x],s))return {status:'unsat',why:`${A.pred} has one ${cp.vocab.get(A.pred)!.args[x]} per ${k.map(y=>cp.vocab.get(A.pred)!.args[y]).join(' and ')}`};changed=true;}}}
 const lt=lits.filter((l):l is {kind:'cmp';op:'<'|'>';l:Term;r:Term}=>l.kind==='cmp'&&(l.op==='<'||l.op==='>')).map(l=>(l.op==='<'?[l.l,l.r]:[l.r,l.l]) as [Term,Term]);
 const val=new Map<string,number>();{const r=solveOrder(lt,s,val);if(r)return r;}
 let n=0;const names=new Map<string,string>();
 // variables written `_` inside a negation stay unbound (any value): they ground to null
 const ground=(t:Term):Const|null=>{const x=walk(t,s);if(x.c!==undefined)return x.c;if(val.has(x.v!))return fmtNum(val.get(x.v!)!);
  if(/^_\d+#/.test(x.v!)&&!pos.some(l=>l.atom.args.some(a=>sameT(a,x,s))))return null;
  if(!names.has(x.v!))names.set(x.v!,'⟨w'+(++n)+'⟩');return names.get(x.v!)!;};
 for(const l of lits)if(l.kind==='cmp'&&l.op==='!='&&ground(l.l)===ground(l.r))return {status:'unsat',why:`${ground(l.l)} != ${ground(l.r)} cannot hold`};
 const facts:[string,Const[]][]=[];const seen=new Set<string>();
 for(const l of pos){if(cp.vocab.get(l.atom.pred)?.role==='constant')continue;const args=l.atom.args.map(t=>ground(t)!);const k=key(l.atom.pred,args);if(!seen.has(k)){seen.add(k);facts.push([l.atom.pred,args]);}}
 return {status:'sat',facts,s,ground};
}
const asInput=(facts:[string,Const[]][])=>{const o:Record<string,Const[][]>={};for(const [p,a] of facts)(o[p]??=[]).push(a);return o;};
export const describeFacts=(facts:[string,Const[]][])=>facts.map(([p,a])=>`${p}(${a.join(', ')})`).join('; ');
export interface Overlap {verdict:'overlap'|'disjoint'|'incomplete';why:string;witness?:[string,Const[]][]}
/** Can the two rules conclude together for the same object (head arguments `join`; default: the first)? */
function pairOverlap(cp:CompiledProgram,ra:Rule,rb:Rule,join:number[]=[0]):Overlap{
 const a=renameRule(ra.head,ra.body),b=renameRule(rb.head,rb.body);
 const eqs:Literal[]=join.map(i=>({kind:'cmp',op:'=',l:a.head.args[i],r:b.head.args[i]}));
 let A:Literal[][],B:Literal[][];try{A=unfold(cp,a.body,[]);B=unfold(cp,b.body,[]);}catch(e){if(e instanceof Incomplete)return {verdict:'incomplete',why:e.message};throw e;}
 const reasons:string[]=[];let incomplete:string|null=null;
 for(const x of A)for(const y of B){
  const w0=witnessOf(cp,[...eqs,...x,...y]);
  if(w0.status==='unsat'){reasons.push(w0.why);continue;}
  if(w0.status==='incomplete'){incomplete??=w0.why;continue;}
  const w=w0 as Extract<WitnessR,{status:'sat'}>;
  const m=evaluate(cp,asInput(w.facts),{shadow:true});
  const ha=a.head.args.map(t=>w.ground(t)!),hb=b.head.args.map(t=>w.ground(t)!);
  if(m.has(a.head.pred,ha)&&m.has(b.head.pred,hb))return {verdict:'overlap',why:'both conclusions hold on the witness',witness:w.facts};
  const negs=[...x,...y].filter((l):l is {kind:'neg';atom:Atom}=>l.kind==='neg');
  const blocking=negs.filter(l=>m.match(l.atom.pred,l.atom.args.map(t=>w.ground(t))).length).map(l=>`not ${l.atom.pred}(${l.atom.args.map(t=>w.ground(t)??'_').join(', ')})`);
  if(negs.every(l=>monotone(cp,l.atom.pred)))reasons.push(blocking.length?'one body forbids what the other needs: '+[...new Set(blocking)].join(', '):'a comparison fails on every assignment');
  else incomplete??=`no witness on the smallest database, but a negated predicate (${negs.filter(l=>!monotone(cp,l.atom.pred)).map(l=>l.atom.pred).join(', ')}) is defined with negation`;}
 if(incomplete)return {verdict:'incomplete',why:incomplete};
 return {verdict:'disjoint',why:[...new Set(reasons)].join('; ')};
}
interface ClaimPair {a:string;b:string;field:string;tier:Tier;scope:string;va:string;vb:string}
/** Claim rules that conclude different values of one field at one tier and a shared scope (defaults never decide). */
function conflictingClaimPairs(cp:CompiledProgram):ClaimPair[]{
 const d=cp.decision;if(!d)return [];
 const cs=allRules(cp).filter(r=>r.head.pred===d.predicate).map(r=>({r,...claimHead(r)}));const out:ClaimPair[]=[];
 for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const a=cs[i],b=cs[j];
  if(a.field!==b.field||a.tier!==b.tier||a.value===b.value||a.tier==='default')continue;
  if(a.scope!==null&&b.scope!==null&&a.scope!==b.scope)continue;
  out.push({a:a.r.id,b:b.r.id,field:a.field,tier:a.tier,scope:a.scope??b.scope??'any',va:a.value,vb:b.value});}
 return out;
}
function checkExclusive(cp:CompiledProgram){
 for(const e of cp.def.exclusive??[]){const [p,q]=e.preds;const dp=cp.vocab.get(p),dq=cp.vocab.get(q);
  if(!dp||!dq||dp.role!=='derived'||dq.role!=='derived'||dp.args.length!==dq.args.length||p===q)fail(`exclusive ${p}/${q} of ${cp.id}: two different derived predicates of one arity`);
  if(!e.why||e.why.length<20)fail(`exclusive ${p}/${q} of ${cp.id}: give the reason`);
  for(const ra of definers(cp,p))for(const rb of definers(cp,q)){const v=pairOverlap(cp,ra,rb,dp!.args.map((_,i)=>i));
   if(v.verdict==='overlap')fail(`${ra.id} (${p}) and ${rb.id} (${q}) can both hold for the same arguments, which ${cp.id} declares impossible (${e.why}); witness: ${describeFacts(v.witness!)}`);
   if(v.verdict==='incomplete'&&!(e as {unverified?:string}).unverified)fail(`${ra.id} (${p}) and ${rb.id} (${q}): the analysis cannot show they never hold together (${v.why}); keep the rule experimental or state why (unverified)`);}}
}
export interface RuleAnalysis {program:string;coverage:string;
 /** per rule: whether the analyser decides its overlaps exactly, and why not */
 rules:{rule:string;state:RuleState;complete:boolean;limits:string[]}[];
 conflicts:{a:string;b:string;field:string;tier:Tier;scope:string;values:[string,string];verdict:Overlap['verdict'];why:string;witness:string|null;contest:string|null}[];
 exclusive:{preds:[string,string];a:string;b:string;verdict:Overlap['verdict'];why:string}[];
 redundant:{rule:string;by:string[];exact:boolean;why:string}[];
 neverFires:{rule:string;why:string}[];
 gaps:{predicate:string;arg:number;value:string;state:'interpreted'|'uninterpreted'|'negative_only'|'abstains'|'unknown_in_rules';reason:string|null;fields?:string[]}[]}
/** The static analysis of one program: overlaps of competing claims (with witnesses), declared exclusions, redundant and
 * never-firing rules, and gaps in the interpretation of declared input values. */
export function analyseProgram(cp:CompiledProgram):RuleAnalysis{
 const rules=allRules(cp);
 const out:RuleAnalysis={program:cp.id,coverage:ANALYSIS_COVERAGE,rules:[],conflicts:[],exclusive:[],redundant:[],neverFires:[],gaps:[]};
 for(const r of rules){const limits:string[]=[];
  try{for(const alt of unfold(cp,r.body,[r.head.pred])){
    for(const l of alt){if(l.kind==='neg'&&!monotone(cp,l.atom.pred))limits.push(`negates ${l.atom.pred}, which is defined with negation`);
     if(l.kind==='cmp'&&(l.op==='<'||l.op==='>')&&[l.l,l.r].some(t=>t.c!==undefined&&num(t.c)===null))limits.push('orders a non-numeric constant');}}}
  catch(e){if(e instanceof Incomplete)limits.push(e.message);else throw e;}
  out.rules.push({rule:r.id,state:(r.def.lifecycle?.state??'active') as RuleState,complete:!limits.length,limits:[...new Set(limits)]});}
 const contestOf=(a:string,b:string)=>cp.decision?.contested.filter(g=>Array.isArray(g.between)).find(g=>(g.between[0].includes(a)&&g.between[1].includes(b))||(g.between[0].includes(b)&&g.between[1].includes(a)))?.id??null;
 for(const p of conflictingClaimPairs(cp)){const v=pairOverlap(cp,rules.find(r=>r.id===p.a)!,rules.find(r=>r.id===p.b)!);
  out.conflicts.push({a:p.a,b:p.b,field:p.field,tier:p.tier,scope:p.scope,values:[p.va,p.vb],verdict:v.verdict,why:v.why,witness:v.witness?describeFacts(v.witness):null,contest:contestOf(p.a,p.b)});}
 for(const e of cp.def.exclusive??[]){const [p,q]=e.preds;for(const ra of definers(cp,p))for(const rb of definers(cp,q)){const v=pairOverlap(cp,ra,rb,cp.vocab.get(p)!.args.map((_,i)=>i));out.exclusive.push({preds:[p,q],a:ra.id,b:rb.id,verdict:v.verdict,why:v.why});}}
 // redundancy and rules that never fire
 for(const r of rules){let alts:Literal[][];const rr=renameRule(r.head,r.body);try{alts=unfold(cp,rr.body,[r.head.pred]);}catch{continue;}
  const sat=alts.map(a=>witnessOf(cp,a));
  if(sat.every(w=>w.status==='unsat')){out.neverFires.push({rule:r.id,why:[...new Set(sat.map(w=>(w as {why:string}).why))].join('; ')});continue;}
  if(sat.some(w=>w.status==='incomplete'))continue;
  const rest:CompiledProgram={...cp,rules:cp.rules.filter(x=>x!==r),experimental:cp.experimental.filter(x=>x!==r)};
  rest.strata=stratify(cp.id,rest.rules);rest.shadowStrata=stratify(cp.id,[...rest.rules,...rest.experimental]);
  let all=true,exact=true;const by=new Set<string>();
  for(const w of sat){if(w.status!=='sat')continue;const head=rr.head.args.map(t=>w.ground(t)!);
   const m=evaluate(rest,asInput(w.facts),{shadow:true});const f=m.match(r.head.pred,head)[0];
   if(!f){all=false;break;}for(const id of m.rulesOf(f)){by.add(id);if(rules.find(x=>x.id===id)!.body.some(l=>l.kind==='neg'))exact=false;}}
  if(all&&by.size)out.redundant.push({rule:r.id,by:[...by],exact,why:exact?'the rest of the program derives the same conclusion wherever this rule fires':'the rest derives it on the smallest database; with negation, not proved for every case'});}
 // gaps over declared input domains
 for(const dm of cp.def.domains??[]){const posV=new Map<string,Set<string>>(),negV=new Set<string>();
  for(const r of rules)for(const l of r.body){if(l.kind==='cmp'||l.atom.pred!==dm.predicate)continue;const t=l.atom.args[dm.arg];if(t?.c===undefined)continue;
   if(l.kind==='pos'){const f=cp.decision&&r.head.pred===cp.decision.predicate?claimHead(r).field:r.head.pred;(posV.get(t.c)??posV.set(t.c,new Set()).get(t.c)!).add(f);}else negV.add(t.c);}
  const fields=cp.decision?Object.keys(cp.decision.fields):[];
  for(const v of dm.values){const ab=dm.abstains?.[v]??null;
   if(posV.has(v))out.gaps.push({predicate:dm.predicate,arg:dm.arg,value:v,state:'interpreted',reason:ab,fields:fields.length?fields.filter(f=>!posV.get(v)!.has(f)):undefined});
   else if(ab)out.gaps.push({predicate:dm.predicate,arg:dm.arg,value:v,state:'abstains',reason:ab});
   else out.gaps.push({predicate:dm.predicate,arg:dm.arg,value:v,state:negV.has(v)?'negative_only':'uninterpreted',reason:null});}
  for(const v of new Set([...posV.keys(),...negV]))if(!dm.values.includes(v))out.gaps.push({predicate:dm.predicate,arg:dm.arg,value:v,state:'unknown_in_rules',reason:'a rule reads a value the readers never produce'});}
 return out;
}
