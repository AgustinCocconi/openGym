import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const source=dirname(fileURLToPath(import.meta.url));
let root, repo, bin, commit, server, port;
const origin='https://fixture.example.invalid';
async function run(command,args,extra={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:repo,env:{...process.env,PATH:bin+':'+process.env.PATH,
      FIXTURE_REPO:repo,FIXTURE_LOG:join(root,'docker.log'),FIXTURE_COMMIT:commit||'',
      PRODUCTION_URL:origin,BACKUP_DIR:join(root,'backups'),SKIP_LOCAL_GATE:'1',
      CONFIRMED_CI_COMMIT:commit||'',SMOKE_ATTEMPTS:'1',...extra}});
    let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
    child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
}
async function ok(command,args,extra){const r=await run(command,args,extra);assert.equal(r.code,0,r.stdout+r.stderr);return r;}
const deploy=extra=>run('sh',['ops/deploy-production.sh',commit],extra);
test.before(async()=>{
  root=await mkdtemp(join(tmpdir(),'opengym-deploy-'));repo=join(root,'repo');bin=join(root,'bin');
  await mkdir(join(repo,'ops'),{recursive:true});await mkdir(bin);
  for(const name of ['production-common.sh','deploy-production.sh','backup-production.sh','smoke-production.sh']) await cp(join(source,name),join(repo,'ops',name));
  await writeFile(join(bin,'docker'),`#!/bin/sh
printf '%s tag=%s target=%s\\n' "$*" "$OPENGYM_IMAGE_TAG" "$API_TARGET" >> "$FIXTURE_LOG"
case "$1" in
  info|pull) exit 0 ;;
  image) case "$*" in
    *org.opencontainers.image.revision*) printf '%s\\n' "$FIXTURE_COMMIT" ;;
    *RepoDigests*) printf 'ghcr.io/fixture@sha256:fixture\\n' ;;
    *) exit 0 ;; esac ;;
  inspect) printf 'sha256:previous-image\\n' ;;
  run) tar -C "$FIXTURE_REPO" -czf - data ;;
  compose) case "$*" in
    *'version --short') printf '%s\\n' "\${FIXTURE_COMPOSE_VERSION:-2.39.4}" ;;
    *'version'|*'config --quiet'|*'stop --timeout 30 api'|*'start api') exit 0 ;;
    *'ps --status running --services') printf 'api\\nweb\\n' ;;
    *'ps -q '*) printf 'previous-container\\n' ;;
    *'printenv RP_ID') printf 'fixture.example.invalid\\n' ;;
    *'printenv ORIGIN') printf '${origin}\\n' ;;
    *'up -d --no-build') [ "\${FIXTURE_FAIL_UP:-0}" != 1 ] || [ "$OPENGYM_IMAGE_TAG" != "$FIXTURE_COMMIT" ] ;;
    *) exit 1 ;; esac ;;
  *) exit 1 ;;
esac
`);
  await chmod(join(bin,'docker'),0o700);
  await ok('git',['init','-q','-b','personal']);
  await writeFile(join(repo,'.gitignore'),'.env\ndata/\n.production-state/\n');
  await writeFile(join(repo,'docker-compose.yml'),'services: {}\n');
  await ok('git',['add','ops','.gitignore','docker-compose.yml']);
  await ok('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','deploy fixture']);
  commit=(await ok('git',['rev-parse','HEAD'])).stdout.trim();
  await ok('git',['init','--bare','-q',join(root,'origin.git')]);
  await ok('git',['remote','add','origin',join(root,'origin.git')]);await ok('git',['push','-q','origin','personal']);
  await mkdir(join(repo,'data'));await writeFile(join(repo,'data/db.json'),'{"fixture":"preserved"}');
  server=createServer((req,res)=>res.end(req.url==='/api/health'?'{"ok":true}':req.url==='/api/config'?'{"invite_only":true,"allow_guest":false}':'<div id="root"></div>'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
  await writeFile(join(repo,'.env'),`RP_ID=fixture.example.invalid\nORIGIN=${origin}\nWEB_PORT=${port}\nADMIN_UIDS=owner\nINVITE_ONLY=1\nALLOW_GUEST=0\n`);
});
test.after(async()=>{if(server)await new Promise(r=>server.close(r));if(root){assert.ok(root.startsWith(join(tmpdir(),'opengym-deploy-')));await rm(root,{recursive:true,force:true});}});
test('default and coach deploy the exact SHA with a consistent backup and pending acceptance',async()=>{
  for(const target of ['default','coach']){
    const r=await deploy({API_TARGET:target});assert.equal(r.code,0,r.stdout+r.stderr);
    const state=await readFile(join(repo,'.production-state/current.env'),'utf8');
    assert.ok(state.includes('commit='+commit));assert.ok(state.includes('api_target='+target));
    assert.match(state,/acceptance_status=pending-external/);
    const calls=await readFile(join(root,'docker.log'),'utf8');
    assert.ok(calls.includes('opengym-api:'+commit+'-'+target));
    assert.match(r.stdout,/BACKUP_SHA256=[0-9a-f]{64}/);
    assert.equal(await readFile(join(repo,'data/db.json'),'utf8'),'{"fixture":"preserved"}');
    await new Promise(r=>setTimeout(r,1100));
  }
});
test('unknown targets and old Compose fail before any image pull or API stop',async()=>{
  for(const extra of [{API_TARGET:'other'},{API_TARGET:'coach',FIXTURE_COMPOSE_VERSION:'2.20.2'}]){
    await writeFile(join(root,'docker.log'),'');assert.notEqual((await deploy(extra)).code,0);
    assert.doesNotMatch(await readFile(join(root,'docker.log'),'utf8'),/pull |stop --timeout/);
  }
});
test('failed coach replacement restores the previous image without restoring data',async()=>{
  await writeFile(join(root,'docker.log'),'');const r=await deploy({API_TARGET:'coach',FIXTURE_FAIL_UP:'1'});
  assert.notEqual(r.code,0);assert.match(r.stdout,/restaurando las imagenes previas/);
  assert.match(await readFile(join(root,'docker.log'),'utf8'),/up -d --no-build tag=rollback-.*target=coach/);
  assert.equal(await readFile(join(repo,'data/db.json'),'utf8'),'{"fixture":"preserved"}');
});