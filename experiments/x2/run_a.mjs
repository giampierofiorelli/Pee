// X2 arm A (copied from X1 unchanged in logic): Crawler's own path, unchanged, on a COPY of its store.
//
// Usage: node run_a.mjs <crawler dist dir> <store copy .sqlite> <questions.json> <answers.json>
// <crawler dist dir> is Crawler 7d091ef compiled OUTSIDE its working tree (npx tsc --outDir <dir>).
// The store copy must be outside any Git work tree (Crawler refuses otherwise) and is migrated by Crawler on open;
// it is a throw-away copy. Inputs and output are private.
//
// What it does, mirroring Crawler's request path (phase253_request_advice.ts, steps 2-4):
//  1. the requirement is rendered mechanically: "<property> <comparator words> <value> <unit>[ at <conditions>]";
//  2. extractConstraints253 reads it; constraints with a checkable criterion and status 'stated_in_request' are the
//     requirements Crawler applies (a 'candidate' would be asked, not applied);
//  3. the decision snapshot is built with Crawler's own actions (set_scope, state_in_request, hard priority);
//  4. eligibleCandidates253 + decideAdvice249 decide; the product's outcome maps meets_all->meets, fails->fails,
//     unknown->not_determinable. No criterion, or a product outside the eligible pool, is not_determinable.
// Comparisons: Crawler has no declaration-comparison function, so A abstains.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [, , dist, storePath, qPath, outPath] = process.argv;
if (!outPath) { console.error('usage: node run_a.mjs <crawler dist> <store copy> <questions> <answers>'); process.exit(2); }
const imp = (m) => import(pathToFileURL(join(dist, 'src', m)).href);
const {KnowledgeStore246} = await imp('phase246_knowledge_store.js');
const {extractConstraints253} = await imp('phase253_request_constraints.js');
const {SPEC_CRITERIA249, decideAdvice249} = await imp('phase249_decision.js');
const {eligibleCandidates253} = await imp('phase253_request_advice.js');
const {createDecision177, applyDecisionAction177} = await imp('phase177_decision_snapshot.js');

const sha = (s) => createHash('sha256').update(s).digest('hex');
const WORDS = {at_least: 'at least', at_most: 'at most', more_than: 'more than', less_than: 'less than'};
const store = new KnowledgeStore246(storePath);
const categoryOf = (pid) => {
  const row = store.db.prepare('SELECT category_hypotheses_json AS c FROM products WHERE product_id=?').get(pid);
  const c = JSON.parse(row?.c ?? '[]');
  return c.length === 1 ? c[0] : null;
};
const items = JSON.parse(readFileSync(qPath, 'utf8')).items;
const t0 = Date.now();
const answers = [];
for (const q of items) {
  if (q.type !== 'limit') { answers.push({id: q.id, verdict: 'not_determinable', reason: 'no_comparison_capability'}); continue; }
  const sentence = `${q.property} ${WORDS[q.comparator]} ${q.value} ${q.unit ?? ''}`.trim() + (q.conditions ? ` at ${q.conditions}` : '');
  try {
    const ex = extractConstraints253(sentence);
    const stated = ex.constraints.filter((c) => !!SPEC_CRITERIA249[c.criterion] && c.status === 'stated_in_request');
    if (!stated.length) {
      answers.push({id: q.id, verdict: 'not_determinable', reason: 'no_criterion', sentence,
        extracted: ex.constraints.map((c) => [c.criterion, c.status])});
      continue;
    }
    const category = categoryOf(q.product_id);
    let snap = createDecision177('x1_' + sha(q.id).slice(0, 16));
    snap = applyDecisionAction177(snap, {type: 'set_scope', source: 'user_request_statement', scope: {task: 'product_selection', category}}).snapshot;
    for (const c of stated) {
      snap = applyDecisionAction177(snap, {type: 'state_in_request', source: 'user_request_statement', key: c.criterion,
        label: c.span.length >= 3 ? c.span.slice(0, 300) : c.criterion,
        value: {kind: 'quantity', value: c.value, unit: c.unit.toLowerCase(), ...(c.closure === 'strict' ? {exclusive: true} : {})},
        priority: 'hard', referenceHash: sha(c.span)}).snapshot;
    }
    const pool = category ? eligibleCandidates253(store, category) : [];
    const mine = pool.filter((p) => p.candidate.productId === q.product_id);
    if (!mine.length || !mine[0].eligible) {
      answers.push({id: q.id, verdict: 'not_determinable', reason: mine.length ? 'ineligible' : 'not_a_candidate', criteria: stated.map((c) => c.criterion)});
      continue;
    }
    const advice = decideAdvice249({snapshot: snap, candidates: [mine[0].candidate]});
    const chk = advice.checks.find((c) => c.productId === q.product_id);
    const map = {meets_all: 'meets', fails: 'fails', unknown: 'not_determinable'};
    answers.push({id: q.id, verdict: chk ? map[chk.outcome] : 'not_determinable', reason: chk ? chk.checks.map((c) => c.code).join(',') : advice.decision,
      criteria: stated.map((c) => c.criterion), grounds: chk ? chk.checks.flatMap((c) => c.evidence.map((e) => e.declarationId)) : []});
  } catch (e) {
    answers.push({id: q.id, verdict: 'not_determinable', reason: `error: ${e.message}`});
  }
}
writeFileSync(outPath, JSON.stringify({arm: 'A', crawler: '7d091ef', seconds: (Date.now() - t0) / 1000, answers}, null, 1));
console.log(JSON.stringify({arm: 'A', n: answers.length, errors: answers.filter((a) => String(a.reason).startsWith('error')).length}));
