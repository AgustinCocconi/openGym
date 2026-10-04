import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm, chmod, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const source = dirname(fileURLToPath(import.meta.url));
let root, repo, bin, commit, recipient, server, origin;
const production = 'https://fixture.example.invalid';

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repo, env: {
      ...process.env, PATH: bin + ':' + process.env.PATH, FIXTURE_REPO: repo,
      FIXTURE_LOG: join(root, 'docker.log'), FIXTURE_ORIGIN: production, FIXTURE_REVISION: commit || '',
      BACKUP_DIR: join(root, 'backups'), BACKUP_ENCRYPTED_DIR: join(root, 'encrypted'),
      BACKUP_RECIPIENT_FILE: join(root, 'recipient.txt'), BACKUP_RETENTION_COUNT: '2',
      PRODUCTION_URL: production, SMOKE_ORIGIN_URL: origin, SMOKE_ATTEMPTS: '1', ...env,
    } });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}
async function ok(command, args, env) {
  const result = await run(command, args, env);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  return result;
}
async function reset() {
  await writeFile(join(root, 'docker.log'), '');
  await writeFile(join(root, 'recipient.txt'), recipient + '\n');
  await writeFile(join(repo, '.production-state/current.env'),
    'commit=' + commit + '\nacceptance_status=accepted\n');
}
const backup = env => run('sh', [join(repo, 'ops/periodic-backup.sh')], env);

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'opengym-periodic-'));
  repo = join(root, 'repo'); bin = join(root, 'bin');
  await mkdir(join(repo, 'ops'), { recursive: true }); await mkdir(bin);
  for (const name of ['production-common.sh', 'smoke-production.sh', 'backup-production.sh',
    'periodic-backup.sh', 'encrypt-backup.sh', 'verify-backup-restore.sh']) {
    await cp(join(source, name), join(repo, 'ops', name));
  }
  await writeFile(join(bin, 'docker'), [
    '#!/bin/sh', 'printf "%s\\n" "$*" >> "$FIXTURE_LOG"', 'case "$1" in',
    'image) [ "${FIXTURE_HELPER_MISSING:-0}" != 1 ] || exit 1; printf "sha256:fixture\\n" ;;',
    'compose) case "$*" in',
    '  *" ps --status running --services") printf "api\\nweb\\n" ;;',
    '  *" ps -q api"|*" ps -q web") printf "fixture-container\\n" ;;',
    '  *" stop --timeout 30 api"|*" start api") exit 0 ;;',
    '  *" printenv RP_ID") printf "fixture.example.invalid\\n" ;;',
    '  *" printenv ORIGIN") printf "%s\\n" "$FIXTURE_ORIGIN" ;;',
    '  *) exit 1 ;;', 'esac ;;',
    'inspect) printf "%s\\n" "$FIXTURE_REVISION" ;;',
    'run) [ "${FIXTURE_TAR_FAIL:-0}" != 1 ] || exit 1; tar -C "$FIXTURE_REPO" -czf - data ;;',
    '*) exit 1 ;;', 'esac', '',
  ].join('\n'));
  await chmod(join(bin, 'docker'), 0o700);
  const realAge = (await ok('sh', ['-c', 'command -v age'])).stdout.trim();
  await writeFile(join(bin, 'age'), '#!/bin/sh\n' +
    '[ "${FIXTURE_ENCRYPT_FAIL:-0}" != 1 ] || [ "$1" != --encrypt ] || exit 1\n' +
    'exec "' + realAge + '" "$@"\n');
  await chmod(join(bin, 'age'), 0o700);
  await ok('git', ['init', '-q', '-b', 'personal']);
  await writeFile(join(repo, '.gitignore'), '.env\ndata/\n.production-state/\n');
  await ok('git', ['add', 'ops', '.gitignore']);
  await ok('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '-qm', 'periodic fixture']);
  commit = (await ok('git', ['rev-parse', 'HEAD'])).stdout.trim();
  await mkdir(join(repo, 'data')); await mkdir(join(repo, '.production-state'));
  await writeFile(join(repo, 'data/db.json'), '{"fixture":true,"users":[]}');
  await writeFile(join(repo, '.env'), 'RP_ID=fixture.example.invalid\nORIGIN=' + production + '\n');
  await ok('age-keygen', ['-o', join(root, 'identity.txt')]);
  recipient = (await ok('age-keygen', ['-y', join(root, 'identity.txt')])).stdout.trim();
  server = createServer((request, response) => {
    response.end(request.url === '/api/health' ? '{"ok":true}' :
      request.url === '/api/config' ? '{"invite_only":true,"allow_guest":false}' : '<div id="root"></div>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  await reset();
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (root) {
    assert.ok(root.startsWith(join(tmpdir(), 'opengym-periodic-')));
    await rm(root, { recursive: true, force: true });
  }
});

test('unaccepted deployment, invalid recipient and missing helper fail before stopping API', async () => {
  for (const reason of ['unaccepted', 'recipient', 'helper', 'commit', 'revision']) {
    await reset();
    if (reason === 'unaccepted') await writeFile(join(repo, '.production-state/current.env'),
      'commit=' + commit + '\nacceptance_status=pending-external\n');
    if (reason === 'commit') await writeFile(join(repo, '.production-state/current.env'),
      'commit=' + 'f'.repeat(40) + '\nacceptance_status=accepted\n');
    if (reason === 'recipient') await writeFile(join(root, 'recipient.txt'), 'age1invalid\n');
    assert.notEqual((await backup(reason === 'helper' ? { FIXTURE_HELPER_MISSING: '1' } :
      reason === 'revision' ? { FIXTURE_REVISION: 'f'.repeat(40) } : {})).code, 0);
    assert.doesNotMatch(await readFile(join(root, 'docker.log'), 'utf8'), /stop --timeout/);
  }
});

test('failure to archive restarts API and removes partial plaintext', async () => {
  await reset();
  assert.notEqual((await backup({ FIXTURE_TAR_FAIL: '1' })).code, 0);
  const calls = await readFile(join(root, 'docker.log'), 'utf8');
  assert.match(calls, /stop --timeout 30 api/); assert.match(calls, /start api/);
  assert.ok(!(await readdir(join(root, 'backups'))).some(name => name.endsWith('.partial')));
});

test('successful daily routine rotates, decrypts and restores the actual fixture', async () => {
  await reset();
  for (let day = 1; day <= 3; day++) {
    const base = 'opengym-data-2025010' + day + 'T080000Z-' + commit.slice(0, 12) + '.tar.gz';
    for (const suffix of ['', '.sha256', '.meta']) {
      await writeFile(join(root, 'backups', base + suffix), 'expired fixture');
      await writeFile(join(root, 'encrypted', base + '.age' + suffix), 'expired fixture');
    }
  }
  const result = await backup({});
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /falta transferir/);
  const files = await readdir(join(root, 'encrypted'));
  assert.equal(files.filter(name => name.endsWith('.age')).length, 2);
  assert.equal((await readdir(join(root, 'backups'))).filter(name => name.endsWith('.tar.gz')).length, 2);
  const encrypted = result.stdout.match(/ENCRYPTED_ARCHIVE=(.+)/)[1];
  const archive = result.stdout.match(/BACKUP_ARCHIVE=(.+)/)[1];
  const recovered = join(root, 'recovered.tar.gz');
  await ok('age', ['-d', '-i', join(root, 'identity.txt'), '-o', recovered, encrypted]);
  assert.deepEqual(await readFile(recovered), await readFile(archive));
  const digest = (await ok('sha256sum', [recovered])).stdout.split(' ')[0];
  await writeFile(recovered + '.sha256', digest + '  recovered.tar.gz\n');
  await ok('sh', [join(repo, 'ops/verify-backup-restore.sh'), recovered, join(root, 'restored')]);
  assert.equal(await readFile(join(root, 'restored/data/db.json'), 'utf8'), '{"fixture":true,"users":[]}');
  assert.match(await readFile(join(root, 'encrypted/last-backup.env'), 'utf8'), /external_copy=pending/);

});

test('encryption failure cannot advance the successful backup status', async () => {
  await reset();
  const previousStatus = 'previous successful fixture status';
  await writeFile(join(root, 'encrypted/last-backup.env'), previousStatus);
  // Usar timestamp distinto sin esperar: reemplazar solo date en el fixture.
  await writeFile(join(bin, 'date'), '#!/bin/sh\ncase "$*" in *%Y%m%d*) printf "20300101T080000Z\\n" ;; *) /bin/date "$@" ;; esac\n');
  await chmod(join(bin, 'date'), 0o700);
  assert.notEqual((await backup({ FIXTURE_ENCRYPT_FAIL: '1' })).code, 0);
  assert.equal(await readFile(join(root, 'encrypted/last-backup.env'), 'utf8'), previousStatus);
  assert.match(await readFile(join(root, 'docker.log'), 'utf8'), /start api/);
  await rm(join(bin, 'date'));
});

test('overlapping backups cannot stop API twice', async () => {
  await reset();
  const holder = spawn('flock', ['-x', join(root, 'encrypted/.periodic.lock'),
    'sh', '-c', 'printf ready; exec cat']);
  try {
    await new Promise((resolve, reject) => {
      holder.stdout.once('data', resolve); holder.once('error', reject);
    });
    const result = await backup({});
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /ya hay un backup/);
    assert.doesNotMatch(await readFile(join(root, 'docker.log'), 'utf8'), /stop --timeout/);
  } finally {
    const closed = new Promise(resolve => holder.once('close', resolve));
    holder.stdin.end();
    await closed;
  }
});
test('a manual backup lock blocks the timer before another API stop', async () => {
  await reset();
  const holder = spawn('flock', ['-x', join(root, 'backups/.backup.lock'),
    'sh', '-c', 'printf ready; exec cat']);
  try {
    await new Promise((resolve, reject) => {
      holder.stdout.once('data', resolve); holder.once('error', reject);
    });
    const result = await backup({});
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /backup consistente en curso/);
    assert.doesNotMatch(await readFile(join(root, 'docker.log'), 'utf8'), /stop --timeout/);
  } finally {
    const closed = new Promise(resolve => holder.once('close', resolve));
    holder.stdin.end();
    await closed;
  }
});
test('an operations-only commit keeps the accepted image SHA and records both revisions', async () => {
  await reset();
  await writeFile(join(repo, 'ops/fixture-note.md'), 'operational fixture change');
  await ok('git', ['add', 'ops/fixture-note.md']);
  await ok('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '-qm', 'operations-only fixture']);
  const head = (await ok('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const result = await backup({});
  assert.equal(result.code, 0, result.stdout + result.stderr);
  const archive = result.stdout.match(/BACKUP_ARCHIVE=(.+)/)[1];
  assert.match(archive, new RegExp(head.slice(0, 12) + '\\.tar\\.gz$'));
  assert.match(await readFile(archive + '.meta', 'utf8'), new RegExp('deployed_commit=' + commit));
  assert.match(await readFile(join(root, 'encrypted/last-backup.env'), 'utf8'),
    new RegExp('operations_commit=' + head));
});

test('rotation always retains the new archive even when existing names sort after it', async () => {
  await reset();
  for (let day = 1; day <= 3; day++) {
    const base = 'opengym-data-2099010' + day + 'T080000Z-' + commit.slice(0, 12) + '.tar.gz';
    for (const suffix of ['', '.sha256', '.meta']) {
      await writeFile(join(root, 'backups', base + suffix), 'older fixture with future name');
      await writeFile(join(root, 'encrypted', base + '.age' + suffix), 'older fixture with future name');
    }
  }
  const result = await backup({});
  assert.equal(result.code, 0, result.stdout + result.stderr);
  const archive = result.stdout.match(/BACKUP_ARCHIVE=(.+)/)[1];
  assert.ok((await readFile(archive)).length > 0);
  const encrypted = result.stdout.match(/ENCRYPTED_ARCHIVE=(.+)/)[1];
  assert.ok((await readFile(encrypted)).length > 0);
  assert.equal((await readdir(join(root, 'backups'))).filter(x => x.endsWith('.tar.gz')).length, 2);
  assert.equal((await readdir(join(root, 'encrypted'))).filter(x => x.endsWith('.age')).length, 2);
});

test('an application change cannot borrow an earlier accepted deployment', async () => {
  await reset();
  await writeFile(join(repo, 'application-change.js'), 'unaccepted application fixture change');
  await ok('git', ['add', 'application-change.js']);
  await ok('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '-qm', 'unaccepted application fixture']);
  const result = await backup({});
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /la aplicacion cambio/);
  assert.doesNotMatch(await readFile(join(root, 'docker.log'), 'utf8'), /stop --timeout/);
});