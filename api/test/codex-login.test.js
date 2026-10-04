import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tempData } from './helpers.mjs';

const data = tempData();
const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-login-test-'));
process.env.COACH_CREDENTIAL_DIR = cache;
const cfg = await import('../coach/config.js');
const { coachRoutes } = await import('../coach/routes.js');
const fixture = { auth_mode: 'chatgpt', tokens: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' } };
const file = path.join(cache, 'auth.json');
const write = value => fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
function fresh() {
  fs.rmSync(file, { force: true });
  cfg.reset();
  cfg.save({ enabled: true, provider: 'codex', authMode: 'instance', auth: {}, models: {}, boundUid: {} });
}
const routes = coachRoutes({
  json: (res, status, body) => Object.assign(res, { status, body }),
  readBody: async req => req.body || {}, readSession: () => ({ id: 'owner' }), requireAdmin: () => true
});
async function call(route, body) { const res = {}; await routes[route]({ body }, res); return res; }
test.after(() => {
  fs.rmSync(cache, { recursive: true });
  fs.rmSync(data, { recursive: true });
});

test('a cache alone never enables the Coach; connecting requires a real ChatGPT cache', async () => {
  fresh();
  assert.equal(cfg.hasCodexLogin(), false);
  assert.equal((await call('POST /api/admin/coach/connect', { type: 'chatgpt-cli' })).status, 400);
  for (const value of [{}, { OPENAI_API_KEY: 'fixture-api' }, { ...fixture, tokens: {} }]) {
    write(value);
    assert.equal(cfg.hasCodexLogin(), false);
  }
  fs.writeFileSync(file, '{broken');
  assert.equal(cfg.hasCodexLogin(), false);
  write(fixture);
  assert.equal(cfg.hasCodexLogin(), true);
  assert.equal(cfg.isConnected(), false);
  assert.equal(cfg.credentialFor('owner').ok, false);
  assert.equal((await call('POST /api/admin/coach/connect', { provider: 'claude', type: 'chatgpt-cli' })).status, 400);
});

test('explicit connection keeps tokens outside data and binds the personal account', async () => {
  fresh(); write(fixture);
  assert.equal((await call('POST /api/admin/coach/connect', { type: 'chatgpt-cli', account: 'owner' })).status, 200);
  cfg.saveModel('codex', 'chosen-model');
  assert.equal(cfg.isConnected(), true);
  const cred = cfg.credentialFor('owner');
  assert.equal(cred.ok, true);
  assert.equal(cred.auth, null);
  assert.equal(cfg.boundUidFor(), null);
  cfg.bindInstanceCredential('owner');
  assert.equal(cfg.credentialFor('other').reason, 'shared-account');
  assert.equal(cfg.credentialFor('owner').ok, true);
  assert.equal(cfg.jobEnv('/tmp/job', cred).CODEX_HOME, cache);
  assert.equal(cfg.jobEnv('/tmp/job', cred).CODEX_API_KEY, undefined);
  const status = (await call('GET /api/admin/coach')).body;
  assert.equal(status.auth.state, 'connected');
  assert.equal(status.model, 'chosen-model');
  assert.equal(status.providers.find(p => p.id === 'codex').cacheLoginReady, true);
  for (const value of [JSON.stringify(status), fs.readFileSync(path.join(data, 'coach.json'), 'utf8'), JSON.stringify(cfg.jobEnv('/tmp/job', cred))]) {
    assert.ok(!value.includes('fixture-access') && !value.includes('fixture-refresh'));
  }
});

test('missing cache fails closed; disconnect does not reconnect automatically', async () => {
  fresh(); write(fixture);
  await call('POST /api/admin/coach/connect', { type: 'chatgpt-cli' });
  fs.rmSync(file);
  assert.equal(cfg.isConnected(), false);
  assert.equal(cfg.publicConfig(), null);
  assert.equal(cfg.credentialFor('owner').ok, false);
  write(fixture);
  assert.equal(cfg.isConnected(), true);
  await call('POST /api/admin/coach/disconnect', {});
  assert.equal(cfg.isConnected(), false);
  assert.equal(cfg.hasCodexLogin(), true);
  assert.equal(cfg.authFor(), null);
});

test('cache symlinks cannot impersonate a server login', { skip: process.platform === 'win32' }, () => {
  fresh();
  const target = path.join(cache, 'other.json');
  fs.writeFileSync(target, JSON.stringify(fixture));
  fs.symlinkSync(target, file);
  assert.equal(cfg.hasCodexLogin(), false);
});