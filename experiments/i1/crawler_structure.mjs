// I-1 structure adapter: Crawler's STRUCTURAL readers, unchanged and compiled outside its tree, run offline on one
// retained page. Only structure is exported (REPORT.md section 2, step 1):
//  - tables (table acquisition 1F, rendered text): every placed cell with its grid position, spans, header flag,
//    rendered text and the anchor texts of its links; the caption; the table's heading path;
//  - the document's heading tree, its text blocks with their section path, and its structured names (title, headings,
//    links, structured data) as written.
// Not exported: any interpretation (1G hypotheses, roles, evidence classes, conditions, observations, block kinds,
// dimensions, principal product). The output holds page text and is private.
//
// Usage: node crawler_structure.mjs <crawler dist> <page.html> <url> <operator source type> <out.json>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [, , dist, file, url, sourceType, out] = process.argv;
if (!out) { console.error('usage: node crawler_structure.mjs <dist> <page.html> <url> <source type> <out.json>'); process.exit(2); }
const imp = (m) => import(pathToFileURL(join(dist, 'src', m)).href);
const {acquireTables1F} = await imp('table_acquisition1f.js');
const {documentModel1G} = await imp('table_interpreter1g.js');
const bytes = readFileSync(file);
const html = bytes.toString('utf8');
const acq = acquireTables1F(html, {rendered: true});
const doc = documentModel1G(html);
const lang = (/<html[^>]*\blang=["']?([A-Za-z-]+)/i.exec(html) ?? [])[1] ?? null;
const text = (s) => (s?.renderedText ?? s?.normalisedText ?? '').replace(/ /g, ' ');
const result = {
  schema: 'pee.i1.document-structure.v1', crawler: '7d091ef', url, sha256: createHash('sha256').update(bytes).digest('hex'),
  lang, sourceTypeOperatorAsserted: sourceType,
  names: doc.names.map((n) => ({text: n.text, source: n.source})),
  headings: doc.headings.map((h) => ({index: h.index, level: h.level, text: h.text})),
  blocks: doc.blocks.filter((b) => b.tableIndex === null).map((b) => ({index: b.index, sectionPath: b.sectionPath, text: b.text})),
  tables: acq.tables.map((t) => ({
    index: t.index, locator: t.locator, caption: t.caption ? text(t.caption) : null,
    sectionPath: doc.tableBlock.has(t.index) ? doc.blocks[doc.tableBlock.get(t.index)].sectionPath : null,
    headingPath: t.context.headingPath.map((h) => h.decodedText),
    cells: t.cells.filter((c) => c.gridRow !== null && !c.droppedBy).map((c) => ({
      row: c.gridRow, col: c.gridCol, rowspan: c.rowspan ?? 1, colspan: c.colspan ?? 1, header: c.header, scope: c.scope,
      text: text(c), links: (c.links ?? []).map((l) => (c.decodedText ?? '').slice(l.start, l.end).trim()).filter(Boolean), locator: c.locator}))})),
};
writeFileSync(out, JSON.stringify(result));
console.log(JSON.stringify({url, tables: result.tables.length, cells: result.tables.reduce((a, t) => a + t.cells.length, 0),
  headings: result.headings.length, names: result.names.length}));
