// Opt-in live probe: synthetic profiles only; never loads app state or instance config.
// Usage: node scripts/verify-coach-plan-quality.mjs --model <id> [--launcher <codex.js>] [--case <id>]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from '../api/coach/core/payload.js';
import { runPipeline } from '../api/coach/core/pipeline.js';
import codex, { argvFor } from '../api/coach/adapters/codex.js';
import { run } from '../api/coach/adapters/spawn.js';
import { LIB_BY_ID } from '../api/coach/core/library.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + name);
  return args[i + 1];
}
const model = option('--model'), launcher = option('--launcher'), onlyCase = option('--case');
if (!model) throw new Error('Choose a model explicitly with --model; this probe uses its authenticated account.');
const scenario = JSON.parse(fs.readFileSync(path.join(root, 'docs/adaptive-training/scenarios/coach-plan-quality.json'), 'utf8'));
const cases = scenario.modelCases.filter(c => !onlyCase || c.id === onlyCase);
if (!cases.length) throw new Error('Unknown synthetic case');
const started = new Date().toISOString();
const output = path.join(root, '.production-state/coach-plan-quality', started.replace(/[:.]/g, '-'));
const jobDir = path.join(output, 'job');
fs.mkdirSync(jobDir, { recursive: true });
const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
env.HOME = jobDir;
if (process.platform === 'win32') env.USERPROFILE = jobDir;
env.CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const runtime = launcher
  ? await run(process.execPath, [path.resolve(launcher), '--version'], { env, timeoutMs: 20000 })
  : await run(codex.cli, ['--version'], { env, timeoutMs: 20000 });
if (runtime.code !== 0) throw new Error('Codex runtime unavailable');
const sources = fs.readdirSync(path.join(root, 'api/coach/core')).filter(p => p.endsWith('.js') && !p.endsWith('.test.js')).sort().map(p => 'api/coach/core/' + p);
sources.push('api/coach/adapters/codex.js', 'api/coach/adapters/spawn.js', 'docs/adaptive-training/scenarios/coach-plan-quality.json', 'docs/adaptive-training/scenarios/coach-muscle-volume.json');
const sourceHash = createHash('sha256').update(sources.map(p => p + '\n' + fs.readFileSync(path.join(root, p))).join('\n')).digest('hex');
const records = [];
let unavailable = false;
for (const c of cases) for (const locale of ['es', 'es-AR']) {
  if (unavailable) break;
  const state = {
    lang: locale, unit: 'kg', routines: [], week: {}, workouts: [], customEx: [],
    coach: { profile: { ...scenario.given.coachProfile, preferredDays: [1, 4], ...c.profile } }
  };
  const before = JSON.stringify(state);
  const payload = build(state, { handle: 'synthetic-quality', kind: 'create' });
  let calls = 0;
  const adapter = {
    ...codex,
    invoke: async opts => {
      calls++;
      const reply = launcher
        ? await run(process.execPath, [path.resolve(launcher), ...argvFor(model)], { stdin: opts.prompt, cwd: jobDir, env, timeoutMs: 150000 })
        : await codex.invoke({ ...opts, jobDir, env });
      fs.writeFileSync(path.join(output, c.id + '-' + locale + '-' + calls + '.json'), JSON.stringify({ text: reply.text || reply.stdout, stderr: reply.stderr, code: reply.code, timedOut: reply.timedOut }, null, 2));
      return { ...reply, text: reply.text ?? reply.stdout.trim() };
    }
  };
  const t = Date.now();
  const result = await runPipeline({ adapter, cfg: {}, kind: 'create', payload, model, timeoutMs: 150000 });
  const bundle = result.result?.bundle;
  const ids = (bundle?.routines || []).flatMap(r => r.ex.map(e => e.id));
  const scheduledDays = Object.keys(bundle?.week || {}).map(Number).sort();
  const expectedDays = payload.coachProfile.preferredDays.slice().sort();
  const unchanged = before === JSON.stringify(state);
  const noUnexpectedLegs = !c.expectUpperOnly || ids.every(id => !['upper legs', 'lower legs'].includes(LIB_BY_ID.get(id)?.bp));
  const timeFits = !c.expectTimeFit || bundle?.quality.sessions.every(s => s.min == null || s.min <= payload.coachProfile.sessionMin);
  const scopeMatches = c.enforceCoverage === payload.planRequirements.enforceCoverage;
  const muscleReportPresent = bundle?.quality.muscleVolume?.version === 'coach-muscle-volume/v1';
  const passed = !!bundle && muscleReportPresent && result.ok && unchanged && noUnexpectedLegs && timeFits && scopeMatches && JSON.stringify(scheduledDays) === JSON.stringify(expectedDays);
  const record = {
    case: c.id, locale, passed, unchanged, noUnexpectedLegs, timeFits, scopeMatches, muscleReportPresent,
    provider: 'codex', model, runtime: runtime.stdout.trim(), platform: process.platform,
    sourceHash, protocolVersion: bundle?.quality.version || payload.planRequirements.version,
    calls, durationMs: Date.now() - t, result
  };
  records.push(record);
  fs.appendFileSync(path.join(output, 'results.jsonl'), JSON.stringify(record) + '\n');
  console.log(JSON.stringify({ case: c.id, locale, passed, calls, durationMs: record.durationMs, outcome: result.ok ? 'validated' : result.errorClass, weeklySets: bundle?.quality.weeklySets, issues: bundle?.quality.issues, muscleIssues: bundle?.quality.muscleVolume?.issues }));
  unavailable = !result.ok && ['auth', 'missing', 'provider', 'timeout'].includes(result.errorClass);
}
const summary = {
  started, finished: new Date().toISOString(), provider: 'codex', model,
  runtime: runtime.stdout.trim(), platform: process.platform, node: process.version, sourceHash,
  expected: cases.length * 2, completed: records.length,
  passed: records.filter(r => r.passed).length, failed: records.filter(r => !r.passed).length,
  calls: records.reduce((n, r) => n + r.calls, 0), output: path.relative(root, output),
  limits: 'Synthetic pipeline evaluation; does not certify production, other providers or physical devices.'
};
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
process.exitCode = summary.failed || summary.completed !== summary.expected ? 1 : 0;
