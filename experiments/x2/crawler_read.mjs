// X2: Crawler's own structural reading of retained pages, offline, into a FRESH COPY of a store snapshot
// (PREREGISTRATION.md section 3). Crawler is not modified: its compiled build (outside its tree) is imported.
//
// Usage: node crawler_read.mjs <crawler dist dir> <store copy .sqlite> <private-eval dir> <summary.json>
// For every wave receipt (wave.json) with a raw/ folder under <private-eval dir>: each fetched page whose bytes match
// the receipt's SHA-256 is read with extractSpecifications245 + testDocumentSubject268 and ingested with
// ingestObservation246 (retention class policy, reservations from the recorded robots body, the page's category from
// its receipt), as Crawler's own integrity scripts do. No network access. Writes counts only to <summary.json>.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [, , dist, storePath, PE, outPath] = process.argv;
if (!outPath) { console.error('usage: node crawler_read.mjs <dist> <store copy> <private-eval> <summary.json>'); process.exit(2); }
const imp = (m) => import(pathToFileURL(join(dist, 'src', m)).href);
const {KnowledgeStore246, DEFAULT_STORAGE_POLICY246} = await imp('phase246_knowledge_store.js');
const {FACTUAL_CLASS_POLICY249, detectReservations249} = await imp('phase249_retention_policy.js');
const {extractSpecifications245, SPEC_EXTRACTOR_VERSION} = await imp('phase245_spec_extraction.js');
const {testDocumentSubject268} = await imp('phase265_test_measurements.js');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const CLASS = {...DEFAULT_STORAGE_POLICY246, policyVersion: 'pee249-class-policy', classPolicy: FACTUAL_CLASS_POLICY249};
const TYPE = {independent_test_or_review: 'independent_original_test', independent_test: 'independent_original_test'};
const store = new KnowledgeStore246(storePath, CLASS);

const waves = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'wave.json' && existsSync(join(d, 'raw'))) waves.push(d); } };
walk(PE);
const summary = {waves: waves.length, pages: 0, skipped: {}, revisions: []};
for (const W of waves.sort()) {
  const w = JSON.parse(readFileSync(join(W, 'wave.json'), 'utf8'));
  for (const p of w.pages ?? []) {
    if (p.outcome !== 'fetched') continue;
    const f = join(W, 'raw', p.tag + '.html');
    if (!existsSync(f)) { summary.skipped.missing = (summary.skipped.missing ?? 0) + 1; continue; }
    const b = readFileSync(f);
    if (sha(b) !== p.sha256) { summary.skipped.hash = (summary.skipped.hash ?? 0) + 1; continue; }
    const html = b.toString('utf8'); const url = p.finalUrl ?? p.url; const host = new URL(url).host;
    const st = TYPE[p.sourceType] ?? p.sourceType ?? 'unknown';
    const cat = p.category && p.category !== 'mixed' ? p.category : null;
    const robots = w.robots?.[host]?.status === 200 ? w.robots[host].body ?? null : null;
    const x = testDocumentSubject268(extractSpecifications245(html, url), st);
    const r = store.ingestObservation246({source: {sourceId: 'src_' + host.replace(/[^a-z0-9]+/gi, '_'), host, sourceType: st,
      sourceTypeBasis: 'operator_asserted'}, url, sha256: p.sha256, bytes: p.bytes ?? b.length, httpStatus: p.httpStatus ?? 200,
      fetchedAt: p.fetchedAt ?? '2026-10-20T00:00:00Z', runId: 'x2_' + W.split('/').slice(-2).join('_').replace(/\W/g, '_'),
      extractorVersion: SPEC_EXTRACTOR_VERSION, extraction: x, categoryHypotheses: cat ? [cat] : [],
      reservations: detectReservations249(robots, html)});
    summary.pages++;
    summary.revisions.push({revisionId: r.revisionId, category: cat, host, retained: r.declarationsRetained, seen: r.declarationsSeen,
      products: r.productIds.length});
  }
}
writeFileSync(outPath, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({waves: summary.waves, pages: summary.pages, skipped: summary.skipped,
  declarationsRetained: summary.revisions.reduce((a, r) => a + r.retained, 0)}));
