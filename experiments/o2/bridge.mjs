// O-2 bridge: run Crawler's prose reader (knowledge_translation.translateDocument, Crawler 7d091ef, imported unchanged
// in engine-ts/) on one Markdown document and write its statements as JSON. Pee-authored; it changes nothing it calls.
// Usage: node bridge.mjs <engine-ts root with dist/> <document.md> <source name> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [root, doc, source, out] = process.argv.slice(2);
if (!out) { console.error('usage: node bridge.mjs <engine-ts root> <document.md> <source> <out.json>'); process.exit(2); }
const imp = f => import(pathToFileURL(path.join(path.resolve(root), 'dist', 'src', f)).href);
const QK = await imp('quantity_knowledge.js');
const KT = await imp('knowledge_translation.js');
const md = readFileSync(doc, 'utf8');
const qk = QK.loadQuantityKnowledge();
// No taught concepts are passed: the speakers category is untaught in Crawler, and O-2 compares readers, not teaching.
const r = KT.translateDocument(qk, md, {source});
const sha = s => createHash('sha256').update(s).digest('hex');
const prov = JSON.parse(readFileSync(path.join(path.resolve(root), 'PROVENANCE.json'), 'utf8'));
const kt = prov.files.find(f => f.path === 'src/knowledge_translation.ts');
writeFileSync(out, JSON.stringify({
  schema: 'pee.o2.bridge.v1', reader: 'knowledge_translation.translateDocument', crawler_commit: prov.source.commit,
  reader_source_sha256: kt?.sha256 ?? null, document_sha256: sha(md), cues: r.cues, blocks: r.blocks, clauses: r.clauses,
  unrecognised: r.unrecognised, statements: r.statements,
}) + '\n');
console.log(JSON.stringify({statements: r.statements.length, refused_by_self_check: r.statements.filter(s => s.selfCheck.length).length,
  blocks: r.blocks, clauses: r.clauses, unrecognised: r.unrecognised}));
