// Static scenario "Every agent scenario has an eval case".
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { cleanup, coverageScript, runNode, tempDir, writeTree } from './helpers.mjs';
import { checkEvalCoverage } from '../evals/check-coverage.mjs';
import { agentScenarioTitles } from '../evals/lib/gherkin.mjs';

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
    const result = checkEvalCoverage({ featureFile });
    assert.ok(result.scanned.agentScenarios > 0, 'agent scenarios were found');
    assert.deepEqual(result.findings, []);
  }

  // Missing, duplicated, and orphaned cases are each reported.
  const root = tempDir();
  const cases = join(root, 'cases');
  writeTree(cases, {
    'A01-plain.json': caseFile('A01', 'Plain agent scenario'),
    'A02-one.json': caseFile('A02', 'Outline agent scenario - one'),
    'A03-one-again.json': caseFile('A03', 'Outline agent scenario - one'),
    'A04-orphan.json': caseFile('A04', 'A scenario that does not exist'),
  });
  writeTree(root, { 'sample.feature': FEATURE });
  const run = runNode(coverageScript(), ['--feature', join(root, 'sample.feature'), '--cases', cases], { cwd: root });
  assert.equal(run.code, 1, run.output);
  assert.match(run.stdout, /eval-coverage .*"Outline agent scenario - two" has no eval case/);
  assert.match(run.stdout, /eval-coverage .*"Outline agent scenario - one" has 2 eval cases/);
  assert.match(run.stdout, /eval-coverage .*"A scenario that does not exist" has no matching @agent scenario/);
});
