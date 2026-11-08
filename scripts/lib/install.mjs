// Installing the suite from this myRPI checkout into an application, shared by install-suite.mjs
// (update an application) and init-project.mjs (create a new one).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSuite } from '../check-suite.mjs';
import { GUIDANCE_FILE, SHARED_GUIDANCE_FILE, extractConfig, loadConfig } from './config.mjs';
import { SEMVER, compareVersions, pendingChanges, readNotes } from './release-notes.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { isInside, mirrorSuite, thisSuiteDir } from './files.mjs';

export const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const sharedGuidance = join(projectDir, SHARED_GUIDANCE_FILE);

export function appGuidanceStub(title = 'Application guidance') {
  return `# ${title}

Guidance that applies only to this repository. The shared way of working is in [${SHARED_GUIDANCE_FILE}](${SHARED_GUIDANCE_FILE}), which is replaced on every suite update; write repository-specific instructions here instead.

No application-specific guidance yet. Run the rpi-init skill to set up the project and its "Feature workflow" configuration.
`;
}

function versionAt(skillsDir) {
  const file = join(skillsDir, 'rpi-workflow', 'SKILL.md');
  if (!existsSync(file)) return null;
  try { return String(parseFrontmatter(readFileSync(file, 'utf8')).data?.metadata?.version ?? '') || null; } catch { return null; }
}

const normalized = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const hasConfig = (path) => existsSync(path) && extractConfig(normalized(path)).config !== null;

// Returns why the application's AGENTS.md must not be replaced yet, or null when it is safe.
function guidanceConflict(repo) {
  const shared = join(repo, SHARED_GUIDANCE_FILE);
  const app = join(repo, GUIDANCE_FILE);
  if (!existsSync(shared) || normalized(shared) === normalized(sharedGuidance)) return null;
  if (hasConfig(shared) && !hasConfig(app)) {
    return `${SHARED_GUIDANCE_FILE} holds the "Feature workflow" configuration and ${GUIDANCE_FILE} does not. Move the configuration and any other application-specific guidance to ${GUIDANCE_FILE}, then run the update again.`;
  }
  if (!existsSync(app)) {
    return `${SHARED_GUIDANCE_FILE} differs from the shared guidance and ${GUIDANCE_FILE} does not exist. Move the application-specific guidance to ${GUIDANCE_FILE}, then run the update again.`;
  }
  return null;
}

// Prints the configuration changes of the releases after the version the configuration was last
// reviewed for (or, without a configuration, after the previously installed version).
function reportConfigurationChanges({ repo, before, version, log }) {
  const configured = repo !== null ? loadConfig(repo).section.config?.suite_version : null;
  const from = typeof configured === 'string' && SEMVER.test(configured) ? configured : before;
  if (!from || !version) return;
  if (compareVersions(from, version) >= 0) return;
  const pending = pendingChanges(readNotes(thisSuiteDir), from, version);
  if (!pending.length) {
    log(`The configuration was last reviewed for suite ${from}; no configuration change is listed up to ${version}.`);
    return;
  }
  log(`Configuration changes since suite ${from}:`);
  for (const note of pending) {
    log(`\n${note.version}`);
    log(note.body.split('\n').map((l) => `  ${l}`).join('\n'));
  }
  log('\nRun the rpi-init skill to review the configuration against these notes.');
}

// Installs the suite into <to> and, with <repo>, the shared guidance into the repository.
// Returns the exit code: 0 success, 1 check findings, 2 refused (nothing changed).
export function installSuite({ to, repo = null, appTitle, log = console.log, error = console.error }) {
  const dest = resolve(to);
  if (isInside(dest, thisSuiteDir) || isInside(thisSuiteDir, dest)) {
    error(`Refusing to install into or over the source suite (${thisSuiteDir}).`);
    return 2;
  }
  repo = repo ? resolve(repo) : null;
  const installGuidance = repo !== null && repo !== projectDir;
  if (installGuidance) {
    if (!existsSync(sharedGuidance)) {
      error(`The shared guidance file ${sharedGuidance} is missing.`);
      return 2;
    }
    const conflict = guidanceConflict(repo);
    if (conflict) {
      error(`Nothing was installed. ${conflict}`);
      return 2;
    }
  }

  const before = versionAt(dest);
  const version = versionAt(thisSuiteDir);
  mirrorSuite(thisSuiteDir, dest);
  log(`Installed rpi suite ${version} in ${dest}${before ? ` (was ${before})` : ''} from ${thisSuiteDir}`);
  reportConfigurationChanges({ repo, before, version, log });

  if (installGuidance) {
    writeFileSync(join(repo, SHARED_GUIDANCE_FILE), readFileSync(sharedGuidance));
    log(`Installed the shared guidance ${SHARED_GUIDANCE_FILE} from ${projectDir}`);
    const app = join(repo, GUIDANCE_FILE);
    if (!existsSync(app)) {
      writeFileSync(app, appGuidanceStub(appTitle));
      log(`Created ${GUIDANCE_FILE} for application-specific guidance`);
    }
  }

  // Until rpi-init has written the configuration, only the suite itself can be checked.
  const configured = repo !== null && hasConfig(join(repo, GUIDANCE_FILE));
  const result = checkSuite({ suiteDir: dest, repoDir: repo, suiteOnly: !configured, base: repo ?? dest });
  // A configuration that is due for review is not a failure of the update: the update worked and the
  // user is told to run rpi-init. Every other finding still fails it.
  const review = result.findings.filter((f) => f.rule === 'config-review');
  const errors = result.findings.filter((f) => f.rule !== 'config-review');
  for (const f of errors) log(`${f.file}:${f.line} ${f.rule} ${f.message}`);
  for (const f of result.warnings) log(`${f.file}:${f.line} ${f.rule} warning: ${f.message}`);
  if (errors.length) {
    log(`Installed suite check: ${errors.length} finding(s)`);
    return 1;
  }
  if (review.length) {
    log(`The suite is installed. Next: run the rpi-init skill to review the configuration. Until then task rpi:check fails with: ${review[0].message}`);
    return 0;
  }
  log(`Installed suite passes the ${configured ? 'repository' : 'suite-only'} check.`);
  if (repo !== null && !configured) log(`${GUIDANCE_FILE} has no "Feature workflow" configuration yet: run the rpi-init skill in the project.`);
  return 0;
}
