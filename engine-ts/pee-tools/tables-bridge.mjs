// R-1 bridge (Pee-authored): runs Crawler's table readers, unchanged and compiled in dist/, on one HTML document and
// prints their outputs as JSON. It calls only the original entry points and interprets nothing:
//  - acquireTables1F(html, {rendered: true})        1F: grid, cells, header flags, spans, links, context
//  - documentModel1G(html)                           1G: headings, blocks, section paths
//  - interpretDocumentTables1G(html, {text})         1G: axis roles, observations, context links, status
//  - interpretWithKnowledge1G(html, qk, {base, text}) 1G + Crawler's quantity knowledge: typed quantities
// Usage: node tables-bridge.mjs <page.html>   (or the HTML on stdin when no path is given)
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (m) => import(pathToFileURL(join(root, 'dist', 'src', m)).href);
const {acquireTables1F} = await imp('table_acquisition1f.js');
const {documentModel1G, interpretDocumentTables1G} = await imp('table_interpreter1g.js');
const {interpretWithKnowledge1G} = await imp('table_interpreter1g_knowledge.js');
const {loadQuantityKnowledge} = await imp('quantity_knowledge.js');

const html = readFileSync(process.argv[2] ?? 0, 'utf8');
const text = (s) => (s?.renderedText ?? s?.normalisedText ?? '').replace(/ /g, ' ');
const acq = acquireTables1F(html, {rendered: true});
const doc = documentModel1G(html);
const base = interpretDocumentTables1G(html, {text: 'rendered'});
const qk = loadQuantityKnowledge();
const typed = interpretWithKnowledge1G(html, qk, {base, text: 'rendered'});
const out = {
  schema: 'pee.r1.crawler-tables.v1', crawler: '7d091ef', interpreter: base.readingIdentity, knowledge: typed.readingIdentity,
  headings: doc.headings.map((h) => ({index: h.index, level: h.level, text: h.text})),
  tables: acq.tables.map((t) => ({
    index: t.index, locator: t.locator, status: t.status, reasons: t.reasons,
    headingPath: t.context.headingPath.map((h) => h.decodedText),
    cells: t.cells.map((c, i) => ({
      index: i, row: c.gridRow, col: c.gridCol, rowspan: c.rowspan ?? 1, colspan: c.colspan ?? 1, header: c.header,
      dropped: c.droppedBy ?? null, text: text(c), links: (c.links ?? []).map((l) => l.href)}))})),
  interpretation: base.tables.map((t) => ({
    table: t.table, status: t.status, reason: t.reason ?? null, tied: t.tied,
    selected: t.selected ? {hypothesis: t.selected.hypothesis, support: t.selected.support, violations: t.selected.violations} : null,
    context: t.context.filter((c) => c.applies).map((c) => ({block: c.block, kind: c.kind, scope: c.scope}))})),
  observations: typed.tables.flatMap((t) => t.observations.map((o) => ({
    table: t.table, tableStatus: t.status, id: o.id, cell: o.cell, sourceCells: o.sourceCells, surface: o.surface,
    kind: o.kind, value: o.value, low: o.low ?? null, high: o.high ?? null, unit: o.unit, unitSource: o.unitSource,
    dimension: o.dimension, product: o.product, productSource: o.productSource, property: o.property,
    conditions: o.conditions, conditionSources: o.conditionSources, records: o.records, evidence: o.evidence,
    unresolved: o.unresolved, quantity: o.quantity ? {kind: o.quantity.kind?.id ?? null, candidates: o.quantity.kind?.candidates ?? [],
      si: o.quantity.si ?? null, unit: o.quantity.unit?.expression ?? null} : null,
    unitSurface: o.unitSurface, recordRole: o.recordRole ?? null}))),
};
process.stdout.write(JSON.stringify(out));
