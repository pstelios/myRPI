// Static scenarios from the "Agent behavior is verified automatically" rule (eval runner).
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { cleanup, copySuite, evalScript, guidance, read, runNode, stubHarness, tempDir, writeTree } from './helpers.mjs';

after(cleanup);

const q = (s) => `"${s}"`;

function harnessYaml(harnesses, { report = 'reports/agents.md' } = {}) {
  const lines = ['  agent_evals:', `    report: ${report}`, '    skills_dir: .agents/skills', '    harnesses:'];
  for (const { name, mode, log } of harnesses) {
    const base = `${q(process.execPath)} ${q(stubHarness)} ${mode}`;
    const tail = log ? ` ${q(log)}` : '';
    lines.push(`      - name: ${name}`);
    lines.push(`        start: '${base} {session} {prompt}${tail}'`);
    lines.push(`        resume: '${base} {session} {prompt}${tail}'`);
    lines.push("        disable: { structured-question: '' }");
    lines.push('        timeout_s: 60');
  }
  return `${lines.join('\n')}\n`;
}

const STUB_CASE = {
  id: 'A01',
  title: 'Stub case',
  fixture: { seeds: [], files: { 'README.md': 'seed\n' } },
  disable: ['structured-question'],
  turns: [{ say: 'Use the stub skill.' }],
  assert: [
    { type: 'file-exists', path: 'result.txt' },
    { type: 'contains', path: 'result.txt', pattern: '^ok$' },
    { type: 'question-count', turns: 'all', max: 1 },
  ],
};

// A temporary project: guidance with the given harnesses and a suite whose only case is STUB_CASE.
function project(harnesses, options) {
  const root = tempDir('rpi-project-');
  writeTree(root, { 'AGENTS.md': guidance({ extraYaml: harnesses ? harnessYaml(harnesses, options) : '' }) });
  const skills = copySuite(root, '.agents/skills');
  const cases = join(skills, 'rpi-workflow', 'evals', 'cases');
  rmSync(cases, { recursive: true, force: true });
  mkdirSync(cases, { recursive: true });
  writeTree(cases, { 'A01-stub-case.json': JSON.stringify(STUB_CASE, null, 2) });
  return { root, skills };
}

function treeHash(dir) {
  const hash = createHash('sha256');
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else hash.update(`${relative(dir, full)}\0`).update(readFileSync(full)).update('\0');
    }
  };
  walk(dir);
  return hash.digest('hex');
}

const isInside = (child, parent) => {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`:`) && !rel.startsWith(sep));
};

describe('Rule: Agent behavior is verified automatically', () => {
  test('Eval runner reports results per case and harness', () => {
    const { root, skills } = project([
      { name: 'stub-good', mode: 'good' },
      { name: 'stub-bad', mode: 'bad' },
    ]);
    const report = join(tempDir('rpi-report-'), 'agents.md');
    const run = runNode(evalScript(skills), ['--repo', root, '--report', report]);
    assert.equal(run.code, 1, `runner exits with a failure:\n${run.output}`);

    const text = read(report);
    const header = text.split('\n').find((l) => l.startsWith('| Case'));
    assert.ok(header, text);
    assert.ok(header.indexOf('stub-good') < header.indexOf('stub-bad'), 'one column per harness, in configured order');
    const row = text.split('\n').find((l) => l.includes('Stub case'));
    assert.ok(row, text);
    const cells = row.split('|').map((c) => c.trim());
    const good = cells[header.split('|').map((c) => c.trim()).indexOf('stub-good')];
    const bad = cells[header.split('|').map((c) => c.trim()).indexOf('stub-bad')];
    assert.equal(good, 'pass');
    assert.match(bad, /^FAIL: file-exists result\.txt/);
    assert.match(text, /Suite version: 1\.1\.0/);
  });

  test('Eval runner fails when no harness is configured', () => {
    const { root, skills } = project(null);
    const run = runNode(evalScript(skills), ['--repo', root]);
    assert.equal(run.code, 1);
    assert.match(run.output, /no agent eval harness is configured/i);
    assert.match(run.output, /agent_evals\.harnesses/);
  });

  test('Eval runner isolates fixtures outside the repository', () => {
    const log = join(tempDir('rpi-log-'), 'calls.jsonl');
    const { root, skills } = project([{ name: 'stub-good', mode: 'good', log }]);
    const before = treeHash(root);
    const report = join(tempDir('rpi-report-'), 'agents.md');
    const run = runNode(evalScript(skills), ['--repo', root, '--report', report]);
    assert.equal(run.code, 0, run.output);

    const calls = read(log).trim().split('\n').map((l) => JSON.parse(l));
    assert.ok(calls.length > 0);
    for (const call of calls) {
      assert.ok(!isInside(call.cwd, root), `fixture ${call.cwd} is outside the project`);
      assert.ok(isInside(call.cwd, tmpdir()), `fixture ${call.cwd} is in the temporary location`);
    }
    assert.equal(treeHash(root), before, "the project's own files are unchanged");

    // A temporary location inside the project is refused.
    const inside = join(root, 'tmp-inside');
    mkdirSync(inside);
    const env = { ...process.env, TMPDIR: inside, TMP: inside, TEMP: inside };
    const refused = runNode(evalScript(skills), ['--repo', root, '--report', report], { env });
    assert.equal(refused.code, 1, refused.output);
    assert.match(refused.output, /outside the project/i);
  });
});
