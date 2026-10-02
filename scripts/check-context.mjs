#!/usr/bin/env node
// Measures repository context without loading reference datasets into agent output.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function measureText(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  return {
    chars: normalized.length,
    lines: normalized ? normalized.split('\n').length - Number(normalized.endsWith('\n')) : 0,
    estimatedTokens: Math.ceil(normalized.length / 4),
  };
}

export function markdownSections(text) {
  const sections = [];
  const counts = new Map();
  let title = '(intro)', body = [], fence = null;
  const flush = () => {
    const occurrence = (counts.get(title) || 0) + 1;
    counts.set(title, occurrence);
    sections.push({ key: `${title} [${occurrence}]`, ...measureText(body.join('\n')) });
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker && !fence) fence = marker[1];
    else if (fence && new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
    if (!fence && /^## /.test(line)) {
      flush();
      title = line.slice(3).trim();
      body = [line];
    } else body.push(line);
  }
  flush();
  return sections;
}

export function collectReport(root, budget) {
  const paths = [...new Set(execFileSync('git', [
    'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...budget.scanPaths,
  ], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).split('\0').filter(Boolean))].sort();
  const files = [], reference = [];
  for (const path of paths) {
    if (budget.excludedPrefixes.some(prefix => path.startsWith(prefix))) continue;
    const absolute = join(root, path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
    if (budget.referenceOnly.some(reference => reference.endsWith('/') ? path.startsWith(reference) : path === reference)) {
      reference.push({ path, bytes: statSync(absolute).size });
      continue;
    }
    const instruction = budget.instructionNames.includes(basename(path)) || path.endsWith('.instructions.md');
    const documentation = path.endsWith('.md');
    const code = budget.codeRoots.some(prefix => path.startsWith(prefix)) && budget.codeExtensions.includes(extname(path));
    if (!instruction && !documentation && !code) continue;
    const text = readFileSync(absolute, 'utf8');
    files.push({ path, kind: instruction ? 'instruction' : documentation ? 'documentation' : 'code',
      ...measureText(text), sections: documentation ? markdownSections(text) : [] });
  }
  const byPath = new Map(files.map(file => [file.path, file]));
  const startup = budget.startup.map(path => ({ path, ...(byPath.get(path) || { missing: true }) }));
  const source = files.filter(file => file.kind === 'code');
  const quantile = (key, q) => {
    const values = source.map(file => file[key]).sort((a, b) => a - b);
    return values.length ? values[Math.ceil(values.length * q) - 1] : 0;
  };
  return { startupChars: startup.reduce((sum, file) => sum + (file.chars || 0), 0), startup,
    distribution: { count: source.length, p50Lines: quantile('lines', .5), p95Lines: quantile('lines', .95),
      p95Chars: quantile('chars', .95), p99Lines: quantile('lines', .99) }, files, reference };
}

export function checkReport(report, budget) {
  const errors = [];
  const check = (label, actual, limit) => {
    if (actual > limit) errors.push(`${label}: ${actual} > ${limit}`);
  };
  for (const file of report.startup) if (file.missing) errors.push(`Falta archivo obligatorio: ${file.path}`);
  check('Carga base (caracteres)', report.startupChars, budget.limits.startupChars);
  for (const file of report.files) {
    const own = budget.files[file.path];
    if (file.kind === 'instruction') check(`${file.path} (caracteres)`, file.chars, own?.chars ?? budget.limits.instructionChars);
    if (file.kind === 'code') {
      check(`${file.path} (lineas)`, file.lines, own?.lines ?? budget.limits.codeLines);
      check(`${file.path} (caracteres)`, file.chars, own?.chars ?? budget.limits.codeChars);
    }
    if (file.kind !== 'documentation' || !budget.documentationRoots.some(prefix => file.path.startsWith(prefix))) continue;
    const documentLimit = file.path.startsWith('docs/tasks/active/')
      ? (budget.limits.taskChars ?? budget.limits.documentChars) : budget.limits.documentChars;
    check(`${file.path} (caracteres)`, file.chars, own?.chars ?? documentLimit);
    for (const section of file.sections) {
      const key = `${file.path}#${section.key}`;
      check(key, section.chars, budget.sections[key] ?? budget.limits.sectionChars);
    }
  }
  return errors;
}

export function validateBudget(budget) {
  if (budget.version !== 1) throw new Error('Version de presupuesto no soportada');
  const valid = (key, value) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Presupuesto invalido: ${key}`);
  };
  for (const key of ['startupChars', 'instructionChars', 'documentChars', 'sectionChars', 'codeLines', 'codeChars']) valid(key, budget.limits[key]);
  if (budget.limits.taskChars !== undefined) valid('taskChars', budget.limits.taskChars);
  for (const [path, limits] of Object.entries(budget.files)) {
    for (const [key, value] of Object.entries(limits)) valid(`${path}.${key}`, value);
  }
  for (const [key, value] of Object.entries(budget.sections)) valid(key, value);
}

export function run(root, args = []) {
  if (args.some(arg => !['--report', '--json'].includes(arg))) throw new Error('Opciones: --report, --json');
  const budget = JSON.parse(readFileSync(join(root, 'scripts/context-budget.json'), 'utf8'));
  validateBudget(budget);
  const report = collectReport(root, budget);
  const errors = checkReport(report, budget);
  if (args.includes('--json')) console.log(JSON.stringify({ ...report, errors }, null, 2));
  else {
    console.log(`Contexto base: ${report.startupChars} caracteres (~${Math.ceil(report.startupChars / 4)} tokens estimados).`);
    console.log(`Codigo: ${report.distribution.count} archivos; p95 ${report.distribution.p95Lines} lineas / ${report.distribution.p95Chars} caracteres.`);
    if (args.includes('--report')) {
      const largest = kind => report.files.filter(file => file.kind === kind).sort((a, b) => b.chars - a.chars).slice(0, 6);
      for (const kind of ['instruction', 'documentation', 'code']) {
        console.log(`${kind}:`);
        for (const file of largest(kind)) console.log(`  ${file.path}: ${file.lines} lineas, ${file.chars} caracteres`);
      }
      console.log('Secciones mayores (lectura dirigida, no carga obligatoria):');
      const sections = report.files.flatMap(file => file.sections.map(section => ({ path: file.path, ...section }))).sort((a, b) => b.chars - a.chars).slice(0, 6);
      for (const section of sections) console.log(`  ${section.path}#${section.key}: ${section.chars} caracteres`);
      console.log('Datos de referencia (solo metadatos):');
      for (const file of report.reference.sort((a, b) => b.bytes - a.bytes).slice(0, 4)) console.log(`  ${file.path}: ${file.bytes} bytes`);
    }
    if (errors.length) console.error(errors.join('\n'));
    else console.log('Presupuestos de contexto OK.');
  }
  return errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = run(join(dirname(fileURLToPath(import.meta.url)), '..'), process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
