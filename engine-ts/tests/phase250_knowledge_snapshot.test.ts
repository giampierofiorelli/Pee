import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
// Phase250: the knowledge snapshot may be written only into the private data repository, never into the public code
// repository or a repository with any other origin.
const SCRIPT=resolve(dirname(fileURLToPath(import.meta.url)),'..','..','scripts','knowledge-snapshot.mjs');
const ENGINE=resolve(dirname(SCRIPT),'..');
const base=mkdtempSync(join(tmpdir(),'pee250-snap-'));
const live=join(base,'live');mkdirSync(live);writeFileSync(join(live,'pee246.sqlite'),'not used: the target check runs first');
const repo=(name:string,origin:string|null)=>{const d=join(base,name);mkdirSync(d);execFileSync('git',['init','-q',d]);
 if(origin)execFileSync('git',['-C',d,'remote','add','origin',origin]);return join(d,'snapshot');};
const sync=(snap:string)=>{const r=spawnSync(process.execPath,['--no-warnings',SCRIPT,'sync'],{encoding:'utf8',
 env:{...process.env,PEE_SNAPSHOT_DIR:snap,PEE_KNOWLEDGE_DIR:live,PEE_SNAPSHOT_TEST_REMOTE:''}});return {code:r.status,out:r.stdout};};

test('refuses a snapshot directory inside the public code repository',()=>{
 const r=sync(join(ENGINE,'knowledge-snapshot'));
 assert.equal(r.code,2);assert.match(r.out,/unsafe_snapshot_target/);assert.match(r.out,/inside_public_code_repository|origin_not_private/);
});
test('refuses a repository whose origin is not the private pee-knowledge repository',()=>{
 for(const origin of ['https://github.com/giampierofiorelli/Crawler','https://github.com/someone/pee-knowledge-public',null]){
  const r=sync(repo('r'+Math.random().toString(36).slice(2),origin));
  assert.equal(r.code,2,String(origin));assert.match(r.out,/unsafe_snapshot_target/);
 }
});
test('accepts the private repository origin (and stops only later, at the clone or store)',()=>{
 const r=sync(repo('ok',"https://github.com/giampierofiorelli/pee-knowledge"));
 assert.doesNotMatch(r.out,/unsafe_snapshot_target/);
});

// S80 integrity: a stale live store (an earlier restore kept by a container) must never replace a newer snapshot, and
// 'load' must replace a live store that is behind instead of skipping it.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
function store(file:string,schema:number,kinds:string[]){
 const db=new DatabaseSync(file);
 db.exec(`CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL,
  previous_sha256 TEXT NOT NULL, event_sha256 TEXT NOT NULL); PRAGMA user_version=${schema};`);
 kinds.forEach((k,i)=>db.prepare('INSERT INTO events(at,kind,payload_json,previous_sha256,event_sha256) VALUES (?,?,?,?,?)')
  .run('2026-10-19T00:00:00Z',k,JSON.stringify({k}),'p','e'+i));
 db.close();
}
const sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
/** A private-repo-shaped snapshot directory with a local bare origin, plus a live directory. */
function scene(liveSchema:number,liveKinds:string[],snapSchema:number,snapKinds:string[]){
 const d=mkdtempSync(join(base,'lin-'));const bare=join(d,'origin.git');execFileSync('git',['init','-q','--bare',bare]);
 const repoDir=join(d,'pee-knowledge');execFileSync('git',['init','-q','-b','main',repoDir]);
 execFileSync('git',['-C',repoDir,'remote','add','origin',bare]);
 const snap=join(repoDir,'snapshot');mkdirSync(snap);store(join(snap,'pee246.sqlite'),snapSchema,snapKinds);
 writeFileSync(join(snap,'pee246.sqlite.manifest.json'),JSON.stringify({sha256:sha(join(snap,'pee246.sqlite')),counts:{events:snapKinds.length}}));
 for(const a of [['add','-A'],['-c','user.name=t','-c','user.email=t@t','commit','-q','-m','s'],['push','-q','origin','main']])execFileSync('git',['-C',repoDir,...a],{stdio:'ignore'});
 const liveDir=join(d,'live');mkdirSync(liveDir);store(join(liveDir,'pee246.sqlite'),liveSchema,liveKinds);
 const run=(cmd:string)=>{const r=spawnSync(process.execPath,['--no-warnings',SCRIPT,cmd],{encoding:'utf8',
  env:{...process.env,PEE_SNAPSHOT_DIR:snap,PEE_KNOWLEDGE_DIR:liveDir,PEE_SNAPSHOT_TEST_REMOTE:bare}});return {code:r.status,out:r.stdout+r.stderr};};
 return {snap,liveDir,run,snapSha:()=>sha(join(snap,'pee246.sqlite')),liveSha:()=>sha(join(liveDir,'pee246.sqlite'))};
}
test('S80 load: a live store BEHIND the snapshot is replaced (old file kept), not skipped',()=>{
 const s=scene(3,['a','b'],10,['a','b','c','d']);const before=s.snapSha();
 const r=s.run('load');
 assert.match(r.out,/"loaded":true/);assert.match(r.out,/live_store_behind_snapshot/);
 assert.equal(s.liveSha(),before);
 assert.ok(readdirSync(s.liveDir).some(f=>f.startsWith('pee246.sqlite.replaced-')));
});
test('S80 load: a live store AHEAD of the snapshot (unsaved work) is kept',()=>{
 const s=scene(10,['a','b','c'],10,['a','b']);const live=s.liveSha();
 const r=s.run('load');
 assert.match(r.out,/live_store_has_unsaved_changes/);assert.equal(s.liveSha(),live);
});
test('S80 load: a DIVERGED live store is kept and reported, never silently replaced',()=>{
 for(const [ls,lk,ss,sk] of [[10,['a','x'],10,['a','b']],[3,['a','b','c'],10,['a','b']]] as const){
  const s=scene(ls,[...lk],ss,[...sk]);const live=s.liveSha();
  const r=s.run('load');
  assert.match(r.out,/live_store_diverged_from_snapshot/);assert.equal(s.liveSha(),live);
 }
});
test('S80 load: an identical live store is left alone',()=>{
 const s=scene(10,['a','b'],10,['a','b']);
 assert.match(s.run('load').out,/live_store_same_as_snapshot/);
});
test('S80 sync: a stale (behind) live store never overwrites the newer snapshot',()=>{
 const s=scene(3,['a','b'],10,['a','b','c','d']);const before=s.snapSha();
 const r=s.run('sync');
 assert.equal(r.code,2);assert.match(r.out,/live_store_behind_snapshot/);assert.equal(s.snapSha(),before);
});
test('S80 sync: a diverged live store (incl. an older schema claiming more events) is not saved',()=>{
 for(const [ls,lk] of [[10,['a','x','y']],[3,['a','b','c']]] as const){
  const s=scene(ls,[...lk],10,['a','b']);const before=s.snapSha();
  const r=s.run('sync');
  assert.equal(r.code,2);assert.match(r.out,/live_store_diverged_from_snapshot/);assert.equal(s.snapSha(),before);
 }
});
test('S80 lineage ignores backup_written events (saving does not make a store diverge)',()=>{
 const s=scene(10,['a','backup_written','b','backup_written'],10,['a','b']);
 const r=s.run('load');
 assert.doesNotMatch(r.out,/diverged/);assert.ok(existsSync(join(s.liveDir,'pee246.sqlite')));
});
