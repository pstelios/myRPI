// Installing the suite from this myRPI checkout into an application, shared by install-suite.mjs
// (update an application) and init-project.mjs (create a new one).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSuite } from '../check-suite.mjs';
import { GUIDANCE_FILE, SHARED_GUIDANCE_FILE, extractConfig } from './config.mjs';
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
  if (before && version && before.split('.')[0] !== version.split('.')[0]) {
    log(`Major version changed (${before} -> ${version}): review the changelog for configuration changes.`);
  }

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
  for (const f of result.findings) log(`${f.file}:${f.line} ${f.rule} ${f.message}`);
  if (result.findings.length) {
    log(`Installed suite check: ${result.findings.length} finding(s)`);
    return 1;
  }
  log(`Installed suite passes the ${configured ? 'repository' : 'suite-only'} check.`);
  if (repo !== null && !configured) log(`${GUIDANCE_FILE} has no "Feature workflow" configuration yet: run the rpi-init skill in the project.`);
  return 0;
}
