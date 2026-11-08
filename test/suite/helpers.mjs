// Shared helpers for the suite's own tests. Tests work on temporary copies so that the
// real suite and repository are never modified.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// myRPI's own tests live in test/; the suite that applications install lives in skills/.
const here = dirname(fileURLToPath(import.meta.url));
export const projectDir = resolve(here, '..', '..');
export const suiteDir = join(projectDir, 'skills');
export const evalsDir = join(projectDir, 'test', 'evals');
export const stubHarness = join(here, 'stub-harness.mjs');

export const SUITE_SKILLS = ['rpi-workflow', 'rpi-init', 'rpi-refine', 'rpi-plan', 'rpi-implement', 'rpi-grill-me'];

// Repository-mode tests run against the repository named by RPI_REPO (set by the project's
// task runner). Without it, those tests are skipped and say so.
export const repoDir = process.env.RPI_REPO ? resolve(process.env.RPI_REPO) : null;
export const repoSkip = repoDir ? false : 'RPI_REPO is not set; repository-mode test skipped';

const temps = [];

export function tempDir(prefix = 'rpi-test-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

export function cleanup() {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
}

// Copies the real suite into <root>/<skillsPath> and returns that skills directory.
export function copySuite(root, skillsPath = 'skills') {
  const dest = join(root, skillsPath);
  mkdirSync(dest, { recursive: true });
  for (const skill of SUITE_SKILLS) cpSync(join(suiteDir, skill), join(dest, skill), { recursive: true });
  return dest;
}

export function writeTree(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}

export function read(path) {
  return readFileSync(path, 'utf8');
}

export function runNode(script, args = [], options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', ...options });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

// The suite check is a myRPI tool; pass --suite to check a copy other than skills/.
export function checkScript() {
  return join(projectDir, 'scripts', 'check-suite.mjs');
}

// The eval runner and the coverage check are myRPI tools, not part of the installed suite.
export function evalScript() {
  return join(evalsDir, 'run-evals.mjs');
}

export function coverageScript() {
  return join(evalsDir, 'check-coverage.mjs');
}

// The installer is a myRPI tool too: applications run it from their myRPI checkout.
export function installScript() {
  return join(projectDir, 'scripts', 'install-suite.mjs');
}

// A minimal application guidance file (AGENTS_APP.md) with a valid "Feature workflow" section, for temporary repositories.
// The version of the suite in skills/, which a freshly reviewed configuration records.
export const suiteVersion = readFileSync(join(suiteDir, 'rpi-workflow', 'SKILL.md'), 'utf8').match(/^\s+version:\s*(\S+)\s*$/m)[1];

export function guidance({ extraYaml = '', before = '# Project guidance\n\nA sample project.\n', reviewedVersion = suiteVersion } = {}) {
  return `${before}
## Feature workflow

Follow the shared lifecycle in the rpi-workflow skill.

\`\`\`yaml
rpi:
  suite_version: ${reviewedVersion}
  features: { working: specs/active, completed: specs/archive }
  architecture: none
  verification:
    focused:
      unit: make spec FILE=<file>
    full: [make verify]
  test_mapping:
    - { kind: unit, tool: SpecRunner, location: spec, command: make spec }
  git: { commit: when-asked, push: never, branch: when-asked }
${extraYaml}\`\`\`
`;
}

// Creates a new project with only what it needs from myRPI (task rpi:init).
export function initScript() {
  return join(projectDir, 'scripts', 'init-project.mjs');
}
