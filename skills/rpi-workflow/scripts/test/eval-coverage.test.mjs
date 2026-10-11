// Static scenario "Every agent scenario has an eval case".
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { checkScript, cleanup, copySuite, runNode, suiteDir, tempDir, writeTree } from './helpers.mjs';
import { checkSuite } from '../check-suite.mjs';
import { agentScenarioTitles } from '../lib/gherkin.mjs';

after(cleanup);

// The feature file whose agent scenarios the real eval cases cover; set by the project's task runner.
const featureFile = process.env.RPI_FEATURE ? resolve(process.env.RPI_FEATURE) : null;

const FEATURE = `Feature: Sample

  Rule: Sample rule

    @agent
    Scenario: Plain agent scenario
      Then something happens

    @static
    Scenario: Static scenario
      Then nothing is evaluated

    @agent
    Scenario Outline: Outline agent scenario
      Then <thing> happens

      Examples:
        | thing |
        | one   |
        | two   |
`;

const caseFile = (id, title) =>
  JSON.stringify({ id, title, fixture: { seeds: [] }, disable: ['structured-question'], turns: [{ say: 'hello' }], assert: [] }, null, 2);

test('Every agent scenario has an eval case', () => {
  // Outline examples expand into titled cases; non-agent scenarios are ignored.
  assert.deepEqual(agentScenarioTitles(FEATURE).map((s) => s.title), [
    'Plain agent scenario',
    'Outline agent scenario - one',
    'Outline agent scenario - two',
  ]);

  // The real feature file is fully covered by the real cases.
  if (featureFile) {
    const result = checkSuite({ suiteDir, suiteOnly: true, featureFile });
    assert.ok(result.scanned.agentScenarios > 0, 'agent scenarios were found');
    assert.deepEqual(result.findings.filter((f) => f.rule === 'eval-coverage'), []);
  }

  // Missing, duplicated, and orphaned cases are each reported.
  const root = tempDir();
  const skills = copySuite(root, 'skills');
  const cases = join(skills, 'rpi-workflow', 'evals', 'cases');
  rmSync(cases, { recursive: true, force: true });
  mkdirSync(cases, { recursive: true });
  writeTree(cases, {
    'A01-plain.json': caseFile('A01', 'Plain agent scenario'),
    'A02-one.json': caseFile('A02', 'Outline agent scenario - one'),
    'A03-one-again.json': caseFile('A03', 'Outline agent scenario - one'),
    'A04-orphan.json': caseFile('A04', 'A scenario that does not exist'),
  });
  writeTree(root, { 'sample.feature': FEATURE });
  const run = runNode(checkScript(skills), ['--suite-only', '--feature', join(root, 'sample.feature')], { cwd: root });
  assert.equal(run.code, 1, run.output);
  assert.match(run.stdout, /eval-coverage .*"Outline agent scenario - two" has no eval case/);
  assert.match(run.stdout, /eval-coverage .*"Outline agent scenario - one" has 2 eval cases/);
  assert.match(run.stdout, /eval-coverage .*"A scenario that does not exist" has no matching @agent scenario/);
});
