// Static scenarios from the "The suite is portable across harnesses and applications" rule.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SUITE_SKILLS, checkScript, cleanup, copySuite, guidance, read, repoDir, repoSkip, runNode, suiteDir, tempDir, writeTree,
} from './helpers.mjs';
import { checkSuite } from '../../skills/rpi-workflow/scripts/check-suite.mjs';
import { parseFrontmatter } from '../../skills/rpi-workflow/scripts/lib/frontmatter.mjs';

after(cleanup);

const findingsFor = (result, rule) => result.findings.filter((f) => f.rule === rule);

function lineCount(path) {
  return read(path).split('\n').length;
}

// A temporary repository with a valid configuration and a fresh copy of the suite in its
// canonical skill location. Every rule passes for it before a violation is injected.
function tempRepo() {
  const root = tempDir();
  writeTree(root, { 'AGENTS.md': guidance() });
  const skills = copySuite(root, '.claude/skills');
  return { root, skills };
}

function appendLine(file, line) {
  const text = read(file);
  const sep = text.endsWith('\n') ? '' : '\n';
  appendFileSync(file, `${sep}${line}\n`);
  return lineCount(file) - 1; // 1-based number of the appended line
}

function replaceLine(file, pattern, replacement) {
  const lines = read(file).split('\n');
  const index = lines.findIndex((l) => pattern.test(l));
  assert.notEqual(index, -1, `pattern ${pattern} not found in ${file}`);
  lines[index] = lines[index].replace(pattern, replacement);
  writeFileSync(file, lines.join('\n'));
  return index + 1;
}

describe('Rule: The suite is portable across harnesses and applications', () => {
  test('Suite folders have matching names and one shared version', () => {
    const members = readdirSync(suiteDir).filter((d) => d.startsWith('rpi-') && statSync(join(suiteDir, d)).isDirectory());
    assert.deepEqual(members.sort(), [...SUITE_SKILLS].sort());
    const versions = new Set();
    for (const skill of SUITE_SKILLS) {
      const { data } = parseFrontmatter(read(join(suiteDir, skill, 'SKILL.md')));
      assert.equal(data.name, skill, `${skill} frontmatter name`);
      assert.ok(typeof data.description === 'string' && data.description.trim().length > 0, `${skill} description`);
      assert.ok(data.description.length <= 1024, `${skill} description length`);
      assert.equal(data.metadata?.suite, 'rpi', `${skill} metadata.suite`);
      assert.match(String(data.metadata?.version), /^\d+\.\d+\.\d+$/, `${skill} metadata.version`);
      versions.add(String(data.metadata.version));
    }
    assert.equal(versions.size, 1, `one shared version, found ${[...versions]}`);
    const result = checkSuite({ suiteDir, suiteOnly: true });
    for (const rule of ['suite-members', 'frontmatter', 'version']) assert.deepEqual(findingsFor(result, rule), [], rule);
  });

  test('Skill text names no harness, harness tool, or slash command', () => {
    const result = checkSuite({ suiteDir, suiteOnly: true });
    assert.ok(result.scanned.harnessTerms > 0, 'suite files were scanned');
    assert.deepEqual(findingsFor(result, 'harness-terms'), []);
  });

  test('Skill text contains no application-specific values', { skip: repoSkip }, () => {
    const result = checkSuite({ suiteDir, repoDir });
    assert.ok(result.scanned.appValues >= 5, `configured values were collected (${result.scanned.appValues})`);
    assert.deepEqual(findingsFor(result, 'app-values'), []);
  });

  test('Every capability used by a skill is defined with a fallback', () => {
    const result = checkSuite({ suiteDir, suiteOnly: true });
    assert.ok(result.capabilities.referenced.length > 0, 'skills reference capabilities');
    for (const name of result.capabilities.referenced) assert.ok(result.capabilities.defined.includes(name), `${name} is defined`);
    assert.deepEqual(findingsFor(result, 'capabilities'), []);
  });

  describe('Scenario Outline: Suite check reports a violation and fails', () => {
    const cases = [
      ['a harness tool name', 'harness-terms', (s) => ({ file: 'rpi-plan/SKILL.md', line: appendLine(join(s, 'rpi-plan', 'SKILL.md'), 'Ask with the AskUserQuestion tool.') })],
      ['a slash-command invocation', 'harness-terms', (s) => ({ file: 'rpi-refine/SKILL.md', line: appendLine(join(s, 'rpi-refine', 'SKILL.md'), 'Then run /rpi-plan next.') })],
      ['a configured application command', 'app-values', (s) => ({ file: 'rpi-implement/SKILL.md', line: appendLine(join(s, 'rpi-implement', 'SKILL.md'), 'Run `make verify` before finishing.') })],
      ['a skill whose frontmatter name differs from its folder', 'frontmatter', (s) => ({ file: 'rpi-plan/SKILL.md', line: replaceLine(join(s, 'rpi-plan', 'SKILL.md'), /^name: rpi-plan$/, 'name: rpi-planner') })],
      ['a skill with a different suite version', 'version', (s) => ({ file: 'rpi-grill-me/SKILL.md', line: replaceLine(join(s, 'rpi-grill-me', 'SKILL.md'), /^(\s+version:\s*)\S+$/, '$19.9.9') })],
      ['an undefined capability reference', 'capabilities', (s) => ({ file: 'rpi-init/SKILL.md', line: appendLine(join(s, 'rpi-init', 'SKILL.md'), 'Beam the files over (capability: teleport).') })],
    ];

    for (const [example, rule, inject] of cases) {
      test(`Suite check reports a violation and fails - ${example}`, () => {
        const { root, skills } = tempRepo();
        const clean = runNode(checkScript(skills), ['--repo', root]);
        assert.equal(clean.code, 0, `baseline passes:\n${clean.output}`);

        const { file, line } = inject(skills);
        const run = runNode(checkScript(skills), ['--repo', root]);
        assert.equal(run.code, 1, `exits with a failure:\n${run.output}`);
        const expected = `.claude/skills/${file}:${line} ${rule} `;
        assert.ok(run.stdout.split('\n').some((l) => l.startsWith(expected)), `reports "${expected}…":\n${run.output}`);
      });
    }
  });

  test('Repository configuration is present and complete', { skip: repoSkip }, () => {
    const result = checkSuite({ suiteDir, repoDir });
    assert.deepEqual(findingsFor(result, 'config'), []);
    assert.ok(result.config, 'configuration was parsed');
    for (const key of ['suite_version', 'features', 'architecture', 'verification', 'test_mapping', 'git']) {
      assert.ok(key in result.config, `has ${key}`);
    }
    assert.match(result.configSection.text, /rpi-workflow/, 'references the shared lifecycle definition');

    // A missing key is reported.
    const { root, skills } = tempRepo();
    writeFileSync(join(root, 'AGENTS.md'), guidance().replace(/^\s+git: .*$/m, ''));
    const run = runNode(checkScript(skills), ['--repo', root]);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^AGENTS\.md:\d+ config .*git/m);
  });

  test('Repository configuration may name a separate specifications folder', () => {
    const withSpecs = (value) => guidance().replace(
      'features: { working: specs/active, completed: specs/archive }',
      `features: { working: specs/active, completed: specs/archive, specifications: ${value} }`,
    );

    // A folder is accepted, and the configuration is parsed with it.
    const { root, skills } = tempRepo();
    writeFileSync(join(root, 'AGENTS.md'), withSpecs('spec/living'));
    const clean = runNode(checkScript(skills), ['--repo', root]);
    assert.equal(clean.code, 0, clean.output);

    // The folder is an application-specific value: skill text must not contain it.
    appendLine(join(skills, 'rpi-implement', 'SKILL.md'), 'Move the scenarios to spec/living when done.');
    const leaked = runNode(checkScript(skills), ['--repo', root]);
    assert.equal(leaked.code, 1);
    assert.match(leaked.stdout, /app-values .*spec\/living/);

    // Guidance outside the configuration section does not name it either.
    const other = tempRepo();
    writeFileSync(join(other.root, 'AGENTS.md'), withSpecs('spec/living').replace('A sample project.', 'Scenarios live in spec/living.'));
    const restated = runNode(checkScript(other.skills), ['--repo', other.root]);
    assert.equal(restated.code, 1);
    assert.match(restated.stdout, /no-restated-lifecycle .*spec\/living/);

    // An empty value is reported as a configuration problem.
    const empty = tempRepo();
    writeFileSync(join(empty.root, 'AGENTS.md'), withSpecs("''"));
    const reported = runNode(checkScript(empty.skills), ['--repo', empty.root]);
    assert.equal(reported.code, 1);
    assert.match(reported.stdout, /^AGENTS\.md:\d+ config .*features\.specifications/m);
  });

  test('Repository guidance does not restate the lifecycle', { skip: repoSkip }, () => {
    const result = checkSuite({ suiteDir, repoDir });
    assert.deepEqual(findingsFor(result, 'no-restated-lifecycle'), []);

    const { root, skills } = tempRepo();
    const before = '# Project guidance\n\nKeep the brief in `<feature>-info.md` until the plan has status `approved`.\n';
    writeFileSync(join(root, 'AGENTS.md'), guidance({ before }));
    const run = runNode(checkScript(skills), ['--repo', root]);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^AGENTS\.md:3 no-restated-lifecycle /m);
  });

  test('The repository holds one copy of the suite', { skip: repoSkip }, () => {
    const result = checkSuite({ suiteDir, repoDir });
    assert.deepEqual(findingsFor(result, 'single-copy'), []);

    const { root, skills } = tempRepo();
    mkdirSync(join(root, '.agents', 'skills', 'rpi-plan'), { recursive: true });
    writeFileSync(join(root, '.agents', 'skills', 'rpi-plan', 'SKILL.md'), '---\nname: rpi-plan\n---\n');
    mkdirSync(join(skills, 'grill-me'), { recursive: true });
    writeFileSync(join(skills, 'grill-me', 'SKILL.md'), '---\nname: grill-me\n---\n');
    const run = runNode(checkScript(skills), ['--repo', root]);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /^\.agents\/skills\/rpi-plan:\d+ single-copy /m);
    assert.match(run.stdout, /^\.claude\/skills\/grill-me:\d+ single-copy /m);
  });
});

// Guards the check against silently scanning nothing.
test('suite rules pass for the real suite in suite-only mode', () => {
  const result = checkSuite({ suiteDir, suiteOnly: true });
  assert.deepEqual(result.findings, [], result.findings.map((f) => `${f.file}:${f.line} ${f.rule} ${f.message}`).join('\n'));
  assert.ok(result.scanned.harnessTerms > 0 && result.capabilities.defined.length > 0);
});
