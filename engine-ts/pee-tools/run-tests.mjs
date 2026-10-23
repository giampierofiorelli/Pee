// E5: run each imported Crawler test file and record its pass and fail counts. Pee-authored.
// Usage: node pee-tools/run-tests.mjs [engine root, default: engine-ts] [out.json]
// The test list is the set of tests/*.test.ts files listed in engine-ts/PROVENANCE.json.
import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const here = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const root = path.resolve(process.argv[2] ?? here);
const m = JSON.parse(readFileSync(path.join(here, 'PROVENANCE.json'), 'utf8'));
const tests = m.files.map(f => f.path).filter(p => /^tests\/[^/]+\.test\.ts$/.test(p)).sort();
const rows = [];
for (const t of tests) {
  const js = 'dist/' + t.replace(/\.ts$/, '.js');
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', js], {cwd: root, encoding: 'utf8', timeout: 180_000, maxBuffer: 32e6});
  const out = (r.stdout || '') + (r.stderr || '');
  const n = k => Number((new RegExp(`^# ${k} (\\d+)`, 'm').exec(out) || [])[1] ?? NaN);
  rows.push({test: t, status: r.status, pass: n('pass'), fail: n('fail')});
}
const sum = k => rows.reduce((a, r) => a + (Number.isFinite(r[k]) ? r[k] : 0), 0);
const result = {root, files: rows.length, pass: sum('pass'), fail: sum('fail'), rows};
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({files: result.files, pass: result.pass, fail: result.fail, failing: rows.filter(r => r.fail || r.status).map(r => r.test)}));
