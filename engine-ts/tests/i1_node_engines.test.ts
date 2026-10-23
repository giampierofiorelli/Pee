// First increment A7 (owner authorisation 2026-10-21): "correggi il requisito Node.js secondo le dipendenze
// effettivamente utilizzate". The binding dependency is node:sqlite (DatabaseSync), which Node 22.5-22.12 expose only
// behind --experimental-sqlite (no script passes it) and which runs unflagged from 22.13.0; the readOnly option the code
// uses dates from 22.12.0. The coordinated plan proposed >=22.5; that would admit versions on which the store cannot open.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const ROOT=new URL('../../',import.meta.url).pathname;
const PKG=JSON.parse(readFileSync(ROOT+'package.json','utf8'));
const MIN='22.13.0';
const ge=(v:string,m:string)=>{const a=v.replace(/^v/,'').split('.').map(Number),b=m.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};

test('A7: engines states the first Node version with unflagged node:sqlite', ()=>{
 assert.equal(PKG.engines?.node,'>='+MIN);
 assert.ok(ge(process.version,MIN),`this runtime (${process.version}) is below the declared minimum`);
});

test('A7: the bound is justified by real use, and no newer node:sqlite feature is used without raising it', ()=>{
 const files=['src','scripts'].flatMap(d=>readdirSync(ROOT+d).filter(f=>/\.(ts|mjs)$/.test(f)).map(f=>ROOT+d+'/'+f));
 const text=files.map(f=>readFileSync(f,'utf8')).join('\n');
 assert.ok(/from 'node:sqlite'/.test(text),'node:sqlite is used (the bound is needed)');
 // DatabaseSync options introduced after 22.13.0 (Node API docs): using one requires raising engines first
 for(const opt of ['timeout','readBigInts','returnArrays','allowBareNamedParameters','allowUnknownNamedParameters','allowExtension'])
  assert.ok(!new RegExp(`new DatabaseSync\\([^)]*\\b${opt}\\s*:`).test(text),`DatabaseSync option ${opt} needs a newer Node than ${MIN}: raise engines`);
 assert.ok(!/--experimental-sqlite/.test(text),'no script relies on the experimental flag');
});
