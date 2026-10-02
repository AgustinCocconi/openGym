import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { measureText, markdownSections, collectReport, checkReport, validateBudget, run } from './check-context.mjs';

const budget = {
  version: 1,
  scanPaths: ['.'], excludedPrefixes: ['legacy/'], referenceOnly: ['src/catalog.js'],
  instructionNames: ['AGENTS.md', 'CLAUDE.md'], codeRoots: ['src/'], codeExtensions: ['.js'],
  documentationRoots: ['docs/'], startup: ['AGENTS.md'], files: {}, sections: {},
  limits: { startupChars: 100, instructionChars: 100, documentChars: 200, sectionChars: 80, codeLines: 10, codeChars: 100 },
};

test('line endings produce the same portable budget; empty files have no lines', () => {
  assert.deepEqual(measureText('a\r\nb\r\n'), measureText('a\nb\n'));
  assert.equal(measureText('').lines, 0);
  assert.equal(measureText('a\nb').lines, 2);
});

test('fenced headings do not hide section growth; repeated headings have independent budgets', () => {
  const sections = markdownSections('# Doc\n## A\nx\n```md\n## fake\n```\n~~~~\n## hidden\n~~~\n~~~~\n## A\ny');
  assert.deepEqual(sections.map(section => section.key), ['(intro) [1]', 'A [1]', 'A [2]']);
  assert.ok(sections[1].chars > 40);
});

test('existing outliers are ratcheted while new huge single-line code is rejected', () => {
  const report = { startupChars: 10, startup: [], files: [
    { path: 'src/old.js', kind: 'code', chars: 150, lines: 12 },
    { path: 'src/new.js', kind: 'code', chars: 101, lines: 1 },
  ] };
  const configured = { ...budget, files: { 'src/old.js': { chars: 150, lines: 12 } } };
  assert.deepEqual(checkReport(report, configured), ['src/new.js (caracteres): 101 > 100']);
  report.files[0].lines++;
  assert.ok(checkReport(report, configured).some(error => error.includes('old.js (lineas)')));
});

test('missing startup files and growth in a single long-document section fail', () => {
  const report = { startupChars: 101, startup: [{ path: 'AGENTS.md', missing: true }], files: [
    { path: 'docs/long.md', kind: 'documentation', chars: 500, sections: [{ key: 'Next [1]', chars: 81 }] },
  ] };
  const errors = checkReport(report, { ...budget, files: { 'docs/long.md': { chars: 500 } } });
  assert.equal(errors.length, 3);
  assert.ok(errors.some(error => error.includes('#Next [1]')));
});

test('a missing numeric limit cannot silently disable the gate', () => {
  assert.throws(() => validateBudget({ ...budget, limits: { ...budget.limits, codeChars: undefined } }), /codeChars/);
  assert.throws(() => validateBudget({ ...budget, sections: { 'docs/a.md#A [1]': '100' } }), /Presupuesto invalido/);
});

test('Git inventory includes untracked source but skips ignored files, excluded roots and reference content', () => {
  const root = mkdtempSync(join(tmpdir(), 'opengym-context-'));
  try {
    execFileSync('git', ['init', '--quiet', root]);
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'legacy'));
    writeFileSync(join(root, '.gitignore'), 'src/ignored.js\n');
    writeFileSync(join(root, 'AGENTS.md'), '# Rules\n');
    writeFileSync(join(root, 'src/new.js'), 'export const a = 1;\n');
    writeFileSync(join(root, 'src/ignored.js'), 'x'.repeat(1000));
    writeFileSync(join(root, 'src/catalog.js'), 'x'.repeat(1000));
    writeFileSync(join(root, 'src/catalog.js-helper.js'), 'export const b = 2;\n');
    writeFileSync(join(root, 'legacy/old.js'), 'x'.repeat(1000));
    const report = collectReport(root, budget);
    assert.deepEqual(report.files.map(file => file.path), ['AGENTS.md', 'src/catalog.js-helper.js', 'src/new.js']);
    assert.equal(report.reference[0].bytes, 1000);
    assert.deepEqual(checkReport(report, budget), []);
    assert.throws(() => run(root, ['--update']), /Opciones/);
    mkdirSync(join(root, 'scripts'));
    const config = JSON.stringify(budget);
    writeFileSync(join(root, 'scripts/context-budget.json'), config);
    copyFileSync(new URL('./check-context.mjs', import.meta.url), join(root, 'scripts/check-context.mjs'));
    writeFileSync(join(root, 'src/new.js'), 'x'.repeat(101));
    const result = spawnSync(process.execPath, [join(root, 'scripts/check-context.mjs')], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /src\/new.js \(caracteres\): 101 > 100/);
    assert.equal(readFileSync(join(root, 'scripts/context-budget.json'), 'utf8'), config);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('opengym-context-'));
    rmSync(root, { recursive: true, force: true });
  }
});
