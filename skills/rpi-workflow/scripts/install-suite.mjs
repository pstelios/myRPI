#!/usr/bin/env node
// Installs or updates this copy of the suite in another skills folder: each rpi-* folder there
// becomes an exact mirror of this one (files removed here are removed there; retired rpi-* folders
// are deleted); nothing else in the folder is touched. Then checks the installed copy.
// Run it from the application that receives the suite, using the script in the source copy:
//   node <source-skills>/rpi-workflow/scripts/install-suite.mjs --to <skills-dir> [--repo <root>]
// With --repo, the application's configuration is checked too (repository mode).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { checkSuite } from './check-suite.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { isInside, mirrorSuite, thisSuiteDir } from './lib/files.mjs';

function parseArgs(argv) {
  const args = { to: null, repo: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--to') args.to = argv[++i];
    else if (argv[i] === '--repo') args.repo = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!args.to) throw new Error('missing --to <skills-dir>');
  return args;
}

function versionAt(skillsDir) {
  const file = join(skillsDir, 'rpi-workflow', 'SKILL.md');
  if (!existsSync(file)) return null;
  try { return String(parseFrontmatter(readFileSync(file, 'utf8')).data?.metadata?.version ?? '') || null; } catch { return null; }
}

let args;
try { args = parseArgs(process.argv.slice(2)); } catch (err) {
  console.error(`${err.message}\nUsage: node install-suite.mjs --to <skills-dir> [--repo <root>]`);
  process.exit(2);
}
const dest = resolve(args.to);
if (isInside(dest, thisSuiteDir) || isInside(thisSuiteDir, dest)) {
  console.error(`Refusing to install into or over the source suite (${thisSuiteDir}).`);
  process.exit(2);
}

const before = versionAt(dest);
const version = versionAt(thisSuiteDir);
mirrorSuite(thisSuiteDir, dest);
console.log(`Installed rpi suite ${version} in ${dest}${before ? ` (was ${before})` : ''} from ${thisSuiteDir}`);
if (before && version && before.split('.')[0] !== version.split('.')[0]) {
  console.log(`Major version changed (${before} -> ${version}): review the changelog for configuration changes.`);
}

const repo = args.repo ? resolve(args.repo) : null;
const result = checkSuite({ suiteDir: dest, repoDir: repo, suiteOnly: !repo, base: repo ?? dest });
for (const f of result.findings) console.log(`${f.file}:${f.line} ${f.rule} ${f.message}`);
if (result.findings.length) {
  console.log(`Installed suite check: ${result.findings.length} finding(s)`);
  process.exit(1);
}
console.log(`Installed suite passes the ${repo ? 'repository' : 'suite-only'} check.`);
