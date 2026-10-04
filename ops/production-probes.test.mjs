import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer as httpServer } from 'node:http';
import { createServer as httpsServer } from 'node:https';
import { createHash } from 'node:crypto';

const source = dirname(fileURLToPath(import.meta.url));
let root, repo, bin, commit, publicUrl, originUrl, cookie, receipt, plainServer, tlsServer;
let mode = 'healthy', country = 'AR', locked = true;
const requests = [];
const fixtureCookie = 'FIXTURE-NOT-A-REAL-CREDENTIAL';

async function run(command, args, extra = {}, cwd = repo) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd, env: { ...process.env, PATH: bin + ':' + process.env.PATH,
        CURL_CA_BUNDLE: join(root, 'cert.pem'),
        PRODUCTION_URL: publicUrl, SMOKE_ATTEMPTS: '1', SMOKE_INTERVAL_SECONDS: '1',
        SMOKE_ACCESS_COOKIE_FILE: '', SMOKE_RECEIPT_FILE: '', SMOKE_ORIGIN_URL: '',
        CHECK_CONTAINER_CONFIG: '0', FIXTURE_REVISION: commit,
        FIXTURE_PUBLIC_ORIGIN: publicUrl, ...extra },
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}
async function ok(command, args, extra, cwd) {
  const result = await run(command, args, extra, cwd);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  return result;
}
function script(name, extra = {}, args = []) {
  return run('sh', [join(repo, 'ops', name), ...args], extra);
}
function handler(request, response) {
  requests.push({ path: request.url, cookie: request.headers.cookie });
  if (mode === 'redirect') {
    response.writeHead(302, { Location: '/login' });
    response.end('<div id="root">login is not the app</div>');
  } else if (mode === 'blocked') {
    response.writeHead(403);
    response.end('WAF fixture denial');
  } else if (request.url === '/api/health') {
    response.end('{"ok":true}');
  } else if (request.url === '/api/config') {
    response.end(JSON.stringify({ invite_only: locked, allow_guest: !locked }));
  } else if (request.url === '/cdn-cgi/trace') {
    response.end('loc=' + country + '\n');
  } else {
    response.end('<div id="root">fixture</div>');
  }
}
async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}
async function state() {
  await writeFile(join(repo, '.production-state', 'current.env'),
    'commit=' + commit + '\nacceptance_status=pending-external\n');
}
async function publicReceipt(extra = {}) {
  mode = 'healthy'; country = 'AR'; locked = true;
  await rm(receipt, { force: true });
  return script('smoke-production.sh', { SMOKE_ACCESS_COOKIE_FILE: cookie,
    SMOKE_RECEIPT_FILE: receipt, SMOKE_COMMIT: commit, ...extra });
}
const waf = () => ({ CONFIRMED_WAF_COMMIT: commit,
  CONFIRMED_WAF_RAY: '0123456789abcdef', CONFIRMED_WAF_COUNTRY: 'BR' });

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'opengym-probes-'));
  repo = join(root, 'repo'); bin = join(root, 'bin');
  await mkdir(join(repo, 'ops'), { recursive: true });
  await mkdir(bin);
  for (const name of ['production-common.sh', 'smoke-production.sh', 'accept-production.sh',
    'encrypt-backup.sh', 'verify-backup-restore.sh']) {
    await cp(join(source, name), join(repo, 'ops', name));
  }
  await writeFile(join(bin, 'docker'), [
    '#!/bin/sh',
    'case "$1" in',
    'compose)',
    '  case "$*" in',
    '    *" ps -q "*) printf "fixture-container\\n" ;;',
    '    *" printenv RP_ID") printf "127.0.0.1\\n" ;;',
    '    *" printenv ORIGIN") printf "%s\\n" "$FIXTURE_PUBLIC_ORIGIN" ;;',
    '    *) exit 1 ;;',
    '  esac ;;',
    'inspect) printf "%s\\n" "$FIXTURE_REVISION" ;;',
    '*) exit 1 ;;',
    'esac', '',
  ].join('\n'));
  await chmod(join(bin, 'docker'), 0o700);
  await ok('git', ['init', '-q', '-b', 'personal']);
  await writeFile(join(repo, '.gitignore'), '.env\n.production-state/\n');
  await ok('git', ['add', 'ops', '.gitignore']);
  await ok('git', ['-c', 'user.name=OCI fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '-qm', 'isolated probes fixture']);
  commit = (await ok('git', ['rev-parse', 'HEAD'])).stdout.trim();
  await ok('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', join(root, 'key.pem'), '-out', join(root, 'cert.pem'), '-days', '1',
    '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1']);
  plainServer = httpServer(handler);
  tlsServer = httpsServer({ key: await readFile(join(root, 'key.pem')),
    cert: await readFile(join(root, 'cert.pem')) }, handler);
  originUrl = 'http://127.0.0.1:' + await listen(plainServer);
  publicUrl = 'https://127.0.0.1:' + await listen(tlsServer);
  await writeFile(join(repo, '.env'), 'RP_ID=127.0.0.1\nORIGIN=' + publicUrl +
    '\nWEB_PORT=' + plainServer.address().port + '\n');
  await mkdir(join(repo, '.production-state'));
  cookie = join(root, 'access.cookies'); receipt = join(root, 'https.receipt');
  await writeFile(cookie, '# Netscape HTTP Cookie File\n127.0.0.1\tFALSE\t/\tTRUE\t0\tCF_Authorization\t' +
    fixtureCookie + '\n', { mode: 0o600 });
});
after(async () => {
  for (const server of [plainServer, tlsServer]) {
    if (server) await new Promise(resolve => server.close(resolve));
  }
  if (root) {
    assert.ok(root.startsWith(join(tmpdir(), 'opengym-probes-')));
    await rm(root, { recursive: true, force: true });
  }
});

test('origin health uses loopback and preserves the HTTPS passkey origin', async () => {
  const result = await script('smoke-production.sh', {
    SMOKE_ORIGIN_URL: originUrl, CHECK_CONTAINER_CONFIG: '1',
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /falta aceptar HTTPS/);
});

test('origin rejects another address and refuses to transmit Access cookies', async () => {
  for (const url of ['http://0.0.0.0:8080', 'http://127.0.0.1:0',
    'http://example.invalid:8080', originUrl + '/extra']) {
    assert.notEqual((await script('smoke-production.sh', { SMOKE_ORIGIN_URL: url })).code, 0);
  }
  assert.notEqual((await script('smoke-production.sh', {
    SMOKE_ORIGIN_URL: originUrl, SMOKE_ACCESS_COOKIE_FILE: cookie,
  })).code, 0);
});

test('Access redirect is a failure even when its page has a React root', async () => {
  mode = 'redirect'; requests.length = 0;
  const result = await script('smoke-production.sh');
  mode = 'healthy';
  assert.notEqual(result.code, 0);
  assert.equal(requests.length, 1);
  assert.match(result.stderr, /HTTP 302/);
});

test('WAF denial blocks a public probe and cannot create a receipt', async () => {
  mode = 'blocked'; await rm(receipt, { force: true });
  const result = await script('smoke-production.sh', { SMOKE_ACCESS_COOKIE_FILE: cookie,
    SMOKE_RECEIPT_FILE: receipt, SMOKE_COMMIT: commit });
  mode = 'healthy';
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /HTTP 403/);
  await assert.rejects(readFile(receipt), { code: 'ENOENT' });
});

test('receipt requires Access, Argentina, closed registration and a full SHA', async () => {
  for (const extra of [{ SMOKE_ACCESS_COOKIE_FILE: '' }, { SMOKE_COMMIT: 'short' },
    { EXPECT_LOCKED: '0' }]) {
    assert.notEqual((await publicReceipt(extra)).code, 0);
  }
  country = 'BR';
  assert.notEqual((await script('smoke-production.sh', { SMOKE_ACCESS_COOKIE_FILE: cookie,
    SMOKE_RECEIPT_FILE: receipt, SMOKE_COMMIT: commit })).code, 0);
  country = 'AR'; locked = false;
  assert.notEqual((await script('smoke-production.sh')).code, 0);
  locked = true;
});

test('real HTTPS/curl sends a file cookie and writes a secret-free AR receipt', async () => {
  requests.length = 0;
  const result = await publicReceipt();
  assert.equal(result.code, 0, result.stderr);
  assert.ok(requests.every(request => request.cookie === 'CF_Authorization=' + fixtureCookie));
  const contents = await readFile(receipt, 'utf8');
  assert.match(contents, new RegExp('commit=' + commit));
  assert.match(contents, /country=AR\n/);
  assert.ok(!contents.includes(fixtureCookie));
  assert.ok(!result.stdout.includes(fixtureCookie));
});

test('acceptance rejects missing WAF, stale receipts and another actual image revision', async () => {
  await state(); await publicReceipt();
  assert.notEqual((await script('accept-production.sh', {}, [commit, receipt])).code, 0);
  const fresh = await readFile(receipt, 'utf8');
  for (const epoch of [1, Math.floor(Date.now() / 1000) + 3600]) {
    await writeFile(receipt, fresh.replace(/checked_epoch=\d+/, 'checked_epoch=' + epoch));
    assert.notEqual((await script('accept-production.sh', waf(), [commit, receipt])).code, 0);
  }
  await writeFile(receipt, fresh);
  assert.notEqual((await script('accept-production.sh', {
    ...waf(), FIXTURE_REVISION: 'f'.repeat(40),
  }, [commit, receipt])).code, 0);
  assert.match(await readFile(join(repo, '.production-state', 'current.env'), 'utf8'),
    /acceptance_status=pending-external/);
});

test('acceptance rechecks locked loopback health and records the confirmed WAF event', async () => {
  await state(); await publicReceipt();
  const result = await script('accept-production.sh', waf(), [commit, receipt]);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(await readFile(join(repo, '.production-state', 'current.env'), 'utf8'),
    /acceptance_status=accepted/);
  assert.match(await readFile(join(repo, '.production-state', 'acceptances.tsv'), 'utf8'),
    /BR\t0123456789abcdef/);
});

test('actual age encryption, destination checksum, decryption and isolated restoration', async () => {
  const dataRoot = join(root, 'synthetic'); await mkdir(join(dataRoot, 'data'), { recursive: true });
  const contents = '{"fixture":"OCI recovery","profiles":[]}';
  await writeFile(join(dataRoot, 'data', 'db.json'), contents);
  const base = 'opengym-data-20261004T010000Z-' + commit.slice(0, 12) + '.tar.gz';
  const archive = join(root, base);
  await ok('tar', ['-czf', archive, '-C', dataRoot, 'data']);
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(archive + '.sha256', digest + '  ' + base + '\n');
  const identity = join(root, 'fixture-identity.txt');
  await ok('age-keygen', ['-o', identity]);
  const recipient = (await ok('age-keygen', ['-y', identity])).stdout.trim();
  const destination = join(root, 'external-copy');
  const encrypted = await script('encrypt-backup.sh', {}, [archive, recipient, destination]);
  assert.equal(encrypted.code, 0, encrypted.stderr);
  await ok('sha256sum', ['-c', base + '.age.sha256'], {}, destination);
  const recovered = join(root, 'decrypted', base); await mkdir(dirname(recovered));
  await ok('age', ['--decrypt', '-i', identity, '-o', recovered, join(destination, base + '.age')]);
  assert.equal(createHash('sha256').update(await readFile(recovered)).digest('hex'), digest);
  await writeFile(recovered + '.sha256', digest + '  ' + base + '\n');
  const restored = join(root, 'restored');
  const result = await script('verify-backup-restore.sh', {}, [recovered, restored]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(await readFile(join(restored, 'data', 'db.json'), 'utf8'), contents);
  assert.notEqual((await script('verify-backup-restore.sh', {}, [recovered, restored])).code, 0);
  const damaged = await readFile(join(destination, base + '.age'));
  damaged[damaged.length - 1] ^= 1;
  const corrupt = join(root, 'corrupt.age'); await writeFile(corrupt, damaged);
  assert.notEqual((await run('age', ['-d', '-i', identity, '-o', join(root, 'invalid.tar.gz'), corrupt])).code, 0);
});

test('restore rejects checksum corruption, traversal and symlinks before extracting', async () => {
  for (const kind of ['traversal', 'symlink', 'checksum']) {
    const archive = join(root, 'unsafe-' + kind + '.tar.gz');
    const python = [
      'import io,sys,tarfile',
      'with tarfile.open(sys.argv[1], "w:gz") as t:',
      ' m=tarfile.TarInfo("data/../../escape" if sys.argv[2]=="traversal" else "data/link")',
      ' if sys.argv[2]=="symlink": m.type=tarfile.SYMTYPE; m.linkname="/etc/passwd"',
      ' else: m.size=1',
      ' t.addfile(m, io.BytesIO(b"x"))',
    ].join('\n');
    await ok('python3', ['-c', python, archive, kind]);
    const digest = kind === 'checksum' ? '0'.repeat(64) :
      createHash('sha256').update(await readFile(archive)).digest('hex');
    await writeFile(archive + '.sha256', digest + '  unsafe-' + kind + '.tar.gz\n');
    const result = await script('verify-backup-restore.sh', {}, [archive, join(root, 'unsafe-restore-' + kind)]);
    assert.notEqual(result.code, 0);
  }
});
