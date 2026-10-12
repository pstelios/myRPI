#!/usr/bin/env node
// Checks that every @agent scenario of a behavior specification has exactly one eval case, and that
// every eval case belongs to a scenario. Part of myRPI's own tests: it is not installed into applications.
// Usage: node check-coverage.mjs --feature <file.feature> [--cases <dir>]
// Prints one line per finding: <file>:<line> eval-coverage <message>. Exits 1 when there are findings.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { agentScenarioTitles } from './lib/gherkin.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const defaultCasesDir = join(here, 'cases');

// Structural problems of an eval case file.
export function validateCase(data) {
  const problems = [];
  if (!/^A\d{2,}$/.test(String(data.id ?? ''))) problems.push('case id must look like A01');
  if (typeof data.title !== 'string' || !data.title) problems.push('case has no title');
  if (!Array.isArray(data.turns) || !data.turns.length) problems.push('case has no turns');
  if (!Array.isArray(data.assert)) problems.push('case has no assert list');
  if (!Array.isArray(data.disable) || !data.disable.includes('structured-question')) problems.push('case must disable structured-question');
  return problems;
}

export function checkEvalCoverage({ featureFile, casesDir = defaultCasesDir }) {
  const findings = [];
  const add = (file, line, message) => findings.push({ file, line, rule: 'eval-coverage', message });
  const feature = resolve(featureFile);
  const result = { findings, scanned: { agentScenarios: 0 } };
  if (!existsSync(feature)) {
    add(feature, 1, 'feature file not found');
    return result;
  }
  const scenarios = agentScenarioTitles(readFileSync(feature, 'utf8'));
  result.scanned.agentScenarios = scenarios.length;
  const cases = [];
  const dir = resolve(casesDir);
  for (const name of existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')).sort() : []) {
    const file = join(dir, name);
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      cases.push({ file, title: data.title });
      for (const problem of validateCase(data)) add(file, 1, problem);
    } catch (err) {
      add(file, 1, `invalid JSON: ${err.message}`);
    }
  }
  for (const s of scenarios) {
    const count = cases.filter((c) => c.title === s.title).length;
    if (count === 0) add(feature, s.line, `"${s.title}" has no eval case`);
    else if (count > 1) add(feature, s.line, `"${s.title}" has ${count} eval cases`);
  }
  const titles = new Set(scenarios.map((s) => s.title));
  for (const c of cases) if (!titles.has(c.title)) add(c.file, 1, `"${c.title}" has no matching @agent scenario`);
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = { feature: null, cases: defaultCasesDir };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--feature') args.feature = argv[++i];
    else if (argv[i] === '--cases') args.cases = argv[++i];
    else { console.error(`unknown argument ${argv[i]}`); process.exit(2); }
  }
  if (!args.feature) { console.error('missing --feature <file.feature>'); process.exit(2); }
  const result = checkEvalCoverage({ featureFile: args.feature, casesDir: args.cases });
  const show = (p) => { const rel = relative(process.cwd(), p); return (rel && !rel.startsWith('..') ? rel : p).split('\\').join('/'); };
  for (const f of result.findings) console.log(`${show(f.file)}:${f.line} ${f.rule} ${f.message}`);
  const summary = `eval coverage: ${result.scanned.agentScenarios} agent scenario(s), ${result.findings.length} finding(s)`;
  if (result.findings.length) { console.log(summary); process.exit(1); }
  console.log(`${summary}; all agent scenarios have exactly one eval case`);
}
