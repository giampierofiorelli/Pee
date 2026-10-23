// E6: run the reading entry points on every HTML fixture of FIXTURES1F and print canonical-JSON digests. Pee-authored.
// Usage: node pee-tools/equivalence.mjs <engine root with dist/> [out.json]
// Compare two outputs (engine-ts and a Crawler 7d091ef build) for identical digests.
// Normalisation (added after the first run, results/e6-firstrun.json): a key named `milliseconds` is a measured
// elapsed time and varies from run to run, so its value is replaced by '$time'. Nothing else is normalised.
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2] ?? '.');
const imp = f => import(pathToFileURL(path.join(root, 'dist', f)).href);
const {FIXTURES1F} = await imp('tests/table_acquisition1f_fixtures.js');
const {extractSpecifications245} = await imp('src/phase245_spec_extraction.js');
const {acquireTables1F} = await imp('src/table_acquisition1f.js');
const {documentModel1G} = await imp('src/table_interpreter1g.js');
const {readDocumentSemantics1D2} = await imp('src/document_semantics.js');
const {readDocumentEvidence} = await imp('src/document_evidence.js');
const {readProductFacts} = await imp('src/product_facts.js');
const {loadQuantityKnowledge} = await imp('src/quantity_knowledge.js');
const {qualitativeObservations269} = await imp('src/phase269_qualitative_observations.js');
const {comparativeResults270} = await imp('src/phase270_comparative_results.js');
const {documentMentions272} = await imp('src/phase265_test_measurements.js');
const canon = v => {
  if (v instanceof Map) return {$map: [...v.entries()].map(([k, x]) => [canon(k), canon(x)])};
  if (v instanceof Set) return {$set: [...v].map(canon)};
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, k === 'milliseconds' && typeof v[k] === 'number' ? '$time' : canon(v[k])]));
  if (typeof v === 'function') return '$function';
  if (v === undefined) return '$undefined';
  if (typeof v === 'number' && !Number.isFinite(v)) return '$' + String(v);
  return v;
};
const digest = f => { let out; try { out = {ok: canon(f())}; } catch (e) { out = {error: String(e?.message ?? e)}; }
  const s = JSON.stringify(out); return {sha256: createHash('sha256').update(s).digest('hex'), bytes: s.length, error: out.error ?? null}; };
const qk = loadQuantityKnowledge();
const URL0 = 'https://fixture.invalid/page';
const rows = [];
for (const name of Object.keys(FIXTURES1F).sort()) {
  const html = FIXTURES1F[name];
  const e = {
    extractSpecifications245: () => extractSpecifications245(html, URL0),
    acquireTables1F: () => acquireTables1F(html),
    documentModel1G: () => documentModel1G(html),
    readDocumentSemantics1D2: () => readDocumentSemantics1D2(html, URL0),
    readDocumentEvidence_readProductFacts: () => { const d = readDocumentEvidence(html, qk); return {d, f: readProductFacts(qk, d)}; },
    qualitativeObservations269: () => qualitativeObservations269(html),
    comparativeResults270: () => comparativeResults270(html),
    documentMentions272: () => documentMentions272(html),
  };
  for (const [entry, f] of Object.entries(e)) rows.push({fixture: name, entry, ...digest(f)});
}
const result = {fixtures: Object.keys(FIXTURES1F).length, rows: rows.length, errors: rows.filter(r => r.error).length, rows_detail: rows};
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({fixtures: result.fixtures, rows: result.rows, errors: result.errors}));
