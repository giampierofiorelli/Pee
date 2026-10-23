// E1 provenance and E2 closure for engine-ts (O-1). Pee-authored.
// Usage: node pee-tools/verify-provenance.mjs [crawler-git-dir]
// With a Crawler clone it also re-reads every file from the pinned commit.
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const m = JSON.parse(readFileSync(path.join(root, 'PROVENANCE.json'), 'utf8'));
const PEE = new Set(['README.md', 'PROVENANCE.json', 'package.json', 'package-lock.json', '.gitignore']);
const sha = b => createHash('sha256').update(b).digest('hex');
const errors = [];
const listed = new Set(m.files.map(f => f.path));
for (const f of m.files) {
  const p = path.join(root, f.path);
  if (!existsSync(p)) { errors.push('missing ' + f.path); continue; }
  if (sha(readFileSync(p)) !== f.sha256) errors.push('hash ' + f.path);
}
function walk(d) {
  for (const n of readdirSync(path.join(root, d))) {
    const rel = d ? d + '/' + n : n;
    if (!d && (n === 'node_modules' || n === 'dist' || n === 'pee-tools' || n === 'results')) continue;
    if (statSync(path.join(root, rel)).isDirectory()) walk(rel);
    else if (!listed.has(rel) && !(PEE.has(rel))) errors.push('unlisted ' + rel);
  }
}
walk('');
const crawler = process.argv[2];
if (crawler) {
  for (const f of m.files) {
    const b = execFileSync('git', ['-C', crawler, 'show', `${m.source.commit}:${m.source.root}${f.path}`], {maxBuffer: 64e6});
    if (sha(b) !== f.sha256) errors.push('source differs ' + f.path);
  }
}
// E2: relative imports and resource references resolve inside engine-ts.
const re = /(?:import|export)\s[^;]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
let imports = 0, resources = 0;
for (const f of m.files.filter(f => f.path.endsWith('.ts'))) {
  const t = readFileSync(path.join(root, f.path), 'utf8');
  for (const x of t.matchAll(re)) {
    imports++;
    const s = (x[1] || x[2]).replace(/\.js$/, '.ts');
    const target = path.normalize(path.join(path.dirname(f.path), s));
    if (!listed.has(target) && !listed.has(path.normalize(path.join(path.dirname(f.path), x[1] || x[2]))))
      errors.push(`import ${f.path} -> ${x[1] || x[2]}`);
  }
  for (const x of t.matchAll(/new URL\('\.\.\/\.\.\/(resources\/[^']+)'/g)) {
    resources++;
    const dir = x[1];
    const ok = dir.endsWith('/') ? m.files.some(g => g.path.startsWith(dir)) : listed.has(dir);
    if (!ok) errors.push(`resource ${f.path} -> ${dir}`);
  }
}
const out = {files: m.files.length, sourceChecked: !!crawler, imports, resources, errors};
console.log(JSON.stringify(out, null, 1));
process.exit(errors.length ? 1 : 0);
