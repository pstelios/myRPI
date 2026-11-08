#!/usr/bin/env node
// Static checks for the rpi skill suite and, in repository mode, for the repository that uses it.
// Usage: node check-suite.mjs [--repo <root>] [--suite <skills-dir>] [--suite-only]
// A suite other than this checkout's skills/ is an installed copy; when it or the repository's shared guidance
// differs from this checkout's, that is a warning (rule up-to-date): it reports drift from the source repository.
// Prints one line per finding: <file>:<line> <rule-id> <message>, and one per warning with "warning:" before the
// message. Findings are inconsistencies inside the project, including a configuration that is due for review,
// and exit 1; warnings never fail the check.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { GUIDANCE_FILE, SECTION_HEADING, SHARED_GUIDANCE_FILE, configValues, loadConfig, validateConfig } from './lib/config.mjs';
import { LEGACY_SKILLS, SUITE_SKILLS, isInside, thisSuiteDir, toPosix, walk } from './lib/files.mjs';
import { CHANGELOG_SUBSECTION, NOTES_FILE, SEMVER, compareVersions, normalizeText, parseChangelog, parseNotes, pendingChanges } from './lib/release-notes.mjs';

export const REPOSITORY_RULES = ['app-values', 'config', 'config-review', 'no-restated-lifecycle', 'single-copy'];
export const KNOWN_SKILL_LOCATIONS = ['.claude/skills', '.agents/skills', '.github/skills'];
const PLAN_STATUSES = ['draft', 'blocked', 'ready', 'approved', 'in-progress', 'verified'];

// Harness names, harness tool names, harness product features, and slash-command invocation.
// These must never appear in suite text; this file is a script and is exempt from the scan.
const HARNESS_TERMS = [
  ['harness name', /\b(claude|copilot|codex|gemini|cursor|windsurf|cline|anthropic|openai|chatgpt)\b/i],
  ['harness name', /\b(vs ?code|visual studio code)\b/i],
  ['harness tool name', /\b(AskUserQuestion|ask_user|TodoWrite|ExitPlanMode|EnterPlanMode|NotebookEdit|MultiEdit|WebFetch|WebSearch|apply_patch|run_in_terminal|manage_todo_list|str_replace_editor|replace_string_in_file)\b/],
  ['harness product feature', /\b(plan mode|slash[- ]commands?|sub-?agents?|custom instructions|auto[- ]?memory)\b/i],
  ['slash-command invocation', /(?<![\w.\/~:\\-])\/[a-z][a-z0-9-]*(?![\w\/.\\-])/],
];

// Rules whose findings are warnings: they report drift from the source repository, not an
// inconsistency inside the project, so they never fail the check.
export const WARNING_RULES = ['up-to-date'];

const CAPABILITY_REF =/\(capability:\s*([a-z][a-z0-9-]*)\)/g;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Generic single lowercase words (such as "test") cannot be matched reliably against prose.
const isSpecificValue = (v) => /[\s/.:\\]|[A-Z]/.test(v);

const realPath = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
const sameText = (a, b) => readFileSync(a, 'utf8').replace(/\r\n/g, '\n') === readFileSync(b, 'utf8').replace(/\r\n/g, '\n');

function suiteVersion(suiteDir) {
  const file = join(suiteDir, 'rpi-workflow', 'SKILL.md');
  if (!existsSync(file)) return null;
  try { return String(parseFrontmatter(readFileSync(file, 'utf8')).data?.metadata?.version ?? '') || null; } catch { return null; }
}

function suiteFiles(suiteDir) {
  const files = [];
  for (const skill of SUITE_SKILLS) {
    const dir = join(suiteDir, skill);
    for (const rel of walk(dir, { skip: (r) => /(^|\/)scripts$/.test(r) })) {
      files.push(join(dir, rel));
    }
  }
  return files;
}

export function checkSuite({ suiteDir = thisSuiteDir, repoDir = null, suiteOnly = false, base = null, sourceDir = thisSuiteDir } = {}) {
  suiteDir = resolve(suiteDir);
  sourceDir = resolve(sourceDir);
  const root = suiteOnly ? null : resolve(repoDir ?? process.cwd());
  const baseDir = resolve(base ?? root ?? process.cwd());
  const show = (p) => (isInside(p, baseDir) ? toPosix(relative(baseDir, p)) : toPosix(p));
  const findings = [];
  const warnings = [];
  const add = (file, line, rule, message) => (WARNING_RULES.includes(rule) ? warnings : findings).push({ file: show(file), line, rule, message });
  const result = { findings, warnings, skipped: [], scanned: { harnessTerms: 0, appValues: 0 }, capabilities: { referenced: [], defined: [] }, config: null, configSection: null };

  // suite-members
  const members = existsSync(suiteDir)
    ? readdirSync(suiteDir).filter((d) => d.startsWith('rpi-') && statSync(join(suiteDir, d)).isDirectory())
    : [];
  for (const skill of SUITE_SKILLS) if (!members.includes(skill)) add(join(suiteDir, skill), 1, 'suite-members', `missing suite skill ${skill}`);
  for (const extra of members) if (!SUITE_SKILLS.includes(extra)) add(join(suiteDir, extra), 1, 'suite-members', `unexpected suite folder ${extra}`);

  // frontmatter, version
  const versions = [];
  for (const skill of SUITE_SKILLS.filter((s) => members.includes(s))) {
    const file = join(suiteDir, skill, 'SKILL.md');
    if (!existsSync(file)) { add(file, 1, 'frontmatter', 'SKILL.md is missing'); continue; }
    let fm;
    try { fm = parseFrontmatter(readFileSync(file, 'utf8')); } catch (err) { add(file, 1, 'frontmatter', err.message); continue; }
    const { data, lines } = fm;
    if (!data) { add(file, 1, 'frontmatter', 'no YAML frontmatter'); continue; }
    if (data.name !== skill) add(file, lines.name ?? 1, 'frontmatter', `name "${data.name}" does not equal folder name "${skill}"`);
    if (typeof data.description !== 'string' || !data.description.trim()) add(file, lines.description ?? 1, 'frontmatter', 'description is missing or empty');
    else if (data.description.length > 1024) add(file, lines.description, 'frontmatter', `description is ${data.description.length} characters (at most 1024)`);
    if (data.metadata?.suite !== 'rpi') add(file, lines['metadata.suite'] ?? 1, 'version', 'metadata.suite must be "rpi"');
    const version = data.metadata?.version === undefined ? undefined : String(data.metadata.version);
    if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) add(file, lines['metadata.version'] ?? 1, 'version', 'metadata.version must be a semantic version');
    else versions.push({ skill, file, version, line: lines['metadata.version'] });
  }
  const reference = versions.find((v) => v.skill === 'rpi-workflow')?.version ?? versions[0]?.version;
  for (const v of versions) {
    if (v.version !== reference) add(v.file, v.line, 'version', `version ${v.version} differs from the suite version ${reference}`);
  }
  result.version = reference ?? null;

  // up-to-date: an installed copy is identical to the myRPI suite it is installed from.
  const isInstalledCopy = existsSync(sourceDir) && realPath(suiteDir) !== realPath(sourceDir);
  result.sourceVersion = isInstalledCopy ? suiteVersion(sourceDir) : null;
  if (isInstalledCopy) {
    const source = result.sourceVersion;
    const update = 'run task rpi:update';
    const anchor = versions.find((v) => v.skill === 'rpi-workflow') ?? versions[0];
    if (reference && source && reference !== source) {
      const order = compareVersions(reference, source);
      const message = order < 0 ? `installed suite ${reference} is older than ${source} in myRPI (${show(sourceDir)}); ${update}`
        : order > 0 ? `installed suite ${reference} is newer than ${source} in myRPI (${show(sourceDir)}); update the myRPI checkout`
          : `installed suite ${reference} differs from ${source} in myRPI (${show(sourceDir)}); ${update}`;
      add(anchor?.file ?? join(suiteDir, 'rpi-workflow', 'SKILL.md'), anchor?.line ?? 1, 'up-to-date', message);
    } else {
      const label = `myRPI's suite ${source ?? '?'}`;
      for (const skill of SUITE_SKILLS) {
        const installed = new Set(walk(join(suiteDir, skill)));
        const original = new Set(walk(join(sourceDir, skill)));
        for (const rel of [...new Set([...installed, ...original])].sort()) {
          const file = join(suiteDir, skill, rel);
          if (!installed.has(rel)) add(file, 1, 'up-to-date', `missing; it is part of ${label}; ${update}`);
          else if (!original.has(rel)) add(file, 1, 'up-to-date', `not part of ${label}; ${update}, or move the file to myRPI first`);
          else if (!sameText(file, join(sourceDir, skill, rel))) add(file, 1, 'up-to-date', `differs from ${label}; ${update}, or move the change to myRPI first`);
        }
      }
    }
  }

  // release-notes: the suite carries the configuration changes of every release, and myRPI's
  // changelog states the same text for each release.
  const notesFile = join(suiteDir, NOTES_FILE);
  let noteSections = null;
  if (members.includes('rpi-workflow')) {
    if (!existsSync(notesFile)) add(notesFile, 1, 'release-notes', 'configuration-changes.md is missing; it lists the configuration changes of every release');
    else {
      noteSections = parseNotes(readFileSync(notesFile, 'utf8'));
      for (const n of noteSections) {
        if (!SEMVER.test(n.version)) add(notesFile, n.line, 'release-notes', `"${n.version}" is not a semantic version`);
        else if (!n.body) add(notesFile, n.line, 'release-notes', `section ${n.version} is empty; list the changes or write "None."`);
      }
      if (reference && !noteSections.some((n) => n.version === reference)) add(notesFile, 1, 'release-notes', `no section for suite version ${reference}`);
      const changelog = join(suiteDir, '..', 'CHANGELOG.md');
      if (existsSync(changelog) && realPath(suiteDir) === realPath(sourceDir)) {
        const entries = parseChangelog(readFileSync(changelog, 'utf8'));
        if (reference && !entries.some((e) => e.version === reference)) add(changelog, 1, 'release-notes', `no entry for suite version ${reference}`);
        for (const entry of entries) {
          const note = noteSections.find((n) => n.version === entry.version);
          if (entry.notes === null) add(changelog, entry.line, 'release-notes', `version ${entry.version} has no "${CHANGELOG_SUBSECTION}" subsection; state the changes or "None."`);
          else if (!note) add(changelog, entry.line, 'release-notes', `version ${entry.version} has no section in ${toPosix(relative(baseDir, notesFile))}`);
          else if (normalizeText(note.body) !== normalizeText(entry.notes)) add(changelog, entry.line, 'release-notes', `"${CHANGELOG_SUBSECTION}" of ${entry.version} differs from its section in ${toPosix(relative(baseDir, notesFile))}`);
        }
      }
    }
  }

  // harness-terms, capabilities
  const texts =suiteFiles(suiteDir).map((file) => ({ file, text: readFileSync(file, 'utf8') }));
  result.scanned.harnessTerms = texts.length;
  for (const { file, text } of texts) {
    text.split('\n').forEach((line, i) => {
      for (const [label, pattern] of HARNESS_TERMS) {
        const m = line.match(pattern);
        if (m) add(file, i + 1, 'harness-terms', `${label} "${m[0]}"`);
      }
    });
  }
  const capFile = join(suiteDir, 'rpi-workflow', 'references', 'capabilities.md');
  const defined = new Map();
  if (existsSync(capFile)) {
    const text = readFileSync(capFile, 'utf8');
    const parts = text.split(/^(?=#{2,3} )/m);
    for (const part of parts) {
      const m = part.match(/^### ([a-z][a-z0-9-]*)\s*$/m);
      if (!m) continue;
      const line = lineOf(text, text.indexOf(part));
      defined.set(m[1], true);
      if (!/^\s*(\*\*)?Required behavior:/m.test(part)) add(capFile, line, 'capabilities', `capability ${m[1]} has no "Required behavior:" line`);
      if (!/^\s*(\*\*)?Fallback:/m.test(part)) add(capFile, line, 'capabilities', `capability ${m[1]} has no "Fallback:" line`);
    }
  } else {
    add(capFile, 1, 'capabilities', 'capability vocabulary is missing');
  }
  const referenced = new Set();
  for (const { file, text } of texts) {
    for (const m of text.matchAll(CAPABILITY_REF)) {
      referenced.add(m[1]);
      if (!defined.has(m[1])) add(file, lineOf(text, m.index), 'capabilities', `capability "${m[1]}" is not defined in rpi-workflow/references/capabilities.md`);
    }
  }
  result.capabilities = { referenced: [...referenced].sort(), defined: [...defined.keys()].sort() };

  // Repository rules
  if (suiteOnly) {
    result.skipped.push(...REPOSITORY_RULES);
  } else {
    const loaded = loadConfig(root);
    const guidancePath = join(root, GUIDANCE_FILE);
    const { section } = loaded;
    result.configSection = section;
    result.config = section.config;

    // config
    if (!loaded.exists) add(guidancePath, 1, 'config', `${GUIDANCE_FILE} not found; run rpi-init`);
    else if (!section.startLine) add(guidancePath, 1, 'config', `no "${SECTION_HEADING}" section; run rpi-init`);
    else if (section.error) add(guidancePath, section.yamlLine || section.startLine, 'config', section.error);
    else {
      for (const problem of validateConfig(section.config)) add(guidancePath, section.yamlLine, 'config', problem);
      if (!/rpi-workflow/.test(section.text)) add(guidancePath, section.startLine, 'config', 'the section does not reference the shared lifecycle in rpi-workflow');
    }

    // config-review: the configuration records the suite version it was last reviewed against. When the
    // installed suite is newer, a review with rpi-init is due, whatever the release notes list.
    const reviewed = section.config && typeof section.config.suite_version === 'string' ? section.config.suite_version : null;
    if (reviewed && SEMVER.test(reviewed) && reference) {
      const offset = section.text.split('\n').findIndex((l) => /^\s*suite_version:/.test(l));
      const line = offset === -1 ? section.yamlLine : section.startLine + offset;
      const order = compareVersions(reviewed, reference);
      if (order > 0) {
        add(guidancePath, line, 'config-review', `suite_version ${reviewed} is newer than the installed suite ${reference}; run task rpi:update`);
      } else if (order < 0) {
        const pending = pendingChanges(noteSections, reviewed, reference);
        const listed = pending.length
          ? `releases ${pending.map((n) => n.version).join(', ')} list configuration changes (${toPosix(relative(baseDir, notesFile))})`
          : 'no configuration change is listed since then, so confirming the review only records it';
        add(guidancePath, line, 'config-review', `the configuration was last reviewed for suite ${reviewed} but the installed suite is ${reference}; ${listed}; run the rpi-init skill to review it`);
      }
    }

    // app-values
    const values = configValues(section.config).filter(isSpecificValue);
    result.scanned.appValues = values.length;
    if (values.length) {
      const patterns = values.map((v) => [v, new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(v)}(?![A-Za-z0-9_])`, 'i')]);
      for (const file of suiteFiles(suiteDir)) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          for (const [value, pattern] of patterns) if (pattern.test(line)) add(file, i + 1, 'app-values', `configured value "${value}"`);
        });
      }
    }

    // no-restated-lifecycle
    if (loaded.exists) {
      const folders = [section.config?.features?.working, section.config?.features?.completed, section.config?.features?.specifications].filter((f) => typeof f === 'string' && f.trim());
      const statuses = PLAN_STATUSES.join('|');
      const checks = [
        ['feature artifact name', /-info\.md\b|-plan\.md\b|<feature>\.feature\b|\w\.feature\b/],
        ['plan status value', new RegExp(`\\bstatus:?\\s*\`?(${statuses})\\b|\`(${statuses})\``, 'i')],
        ...folders.map((f) => ['feature folder path', new RegExp(`(?<![\\w/])${escapeRegExp(f)}(?![\\w-])`)]),
      ];
      loaded.text.split('\n').forEach((line, i) => {
        const n = i + 1;
        if (section.startLine && n >= section.startLine && n <= section.endLine) return;
        for (const [label, pattern] of checks) {
          const m = line.match(pattern);
          if (m) add(guidancePath, n, 'no-restated-lifecycle', `${label} "${m[0]}" outside the "${SECTION_HEADING}" section; point to rpi-workflow instead`);
        }
      });
    }

    // up-to-date: the shared guidance is identical to the one of the myRPI checkout.
    const sharedHere = join(root, SHARED_GUIDANCE_FILE);
    const sharedSource = join(sourceDir, '..', SHARED_GUIDANCE_FILE);
    if (existsSync(sharedHere) && existsSync(sharedSource) && realPath(sharedHere) !== realPath(sharedSource) && !sameText(sharedHere, sharedSource)) {
      add(sharedHere, 1, 'up-to-date', `differs from myRPI's shared guidance; run task rpi:update, and keep repository-specific instructions in ${GUIDANCE_FILE}`);
    }

    // single-copy
    const real = realPath;
    const canonical = real(suiteDir);
    for (const location of KNOWN_SKILL_LOCATIONS) {
      const dir = join(root, location);
      if (!existsSync(dir)) continue;
      const isCanonical = real(dir) === canonical;
      for (const entry of readdirSync(dir)) {
        if (!statSync(join(dir, entry)).isDirectory()) continue;
        if (!isCanonical && entry.startsWith('rpi-')) add(join(dir, entry), 1, 'single-copy', `duplicate suite copy; the suite lives in ${show(suiteDir)}`);
        if (LEGACY_SKILLS.includes(entry)) add(join(dir, entry), 1, 'single-copy', `pre-suite skill folder "${entry}" must be removed`);
      }
    }
  }

  for (const list of [findings, warnings]) list.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return result;
}

function parseArgs(argv) {
  const args = { repo: null, suite: null, suiteOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i];
    else if (a === '--suite') args.suite = argv[++i];
    else if (a === '--suite-only') args.suiteOnly = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exit(2); }
  const result = checkSuite({ suiteDir: args.suite ?? thisSuiteDir, repoDir: args.repo, suiteOnly: args.suiteOnly });
  for (const f of result.findings) console.log(`${f.file}:${f.line} ${f.rule} ${f.message}`);
  for (const f of result.warnings) console.log(`${f.file}:${f.line} ${f.rule} warning: ${f.message}`);
  for (const rule of result.skipped) console.log(`skipped ${rule} (suite-only mode)`);
  const summary = `rpi suite ${result.version ?? '?'}: ${result.findings.length} finding(s)${result.warnings.length ? `, ${result.warnings.length} warning(s)` : ''}`;
  if (result.findings.length) { console.log(summary); process.exit(1); }
  console.log(`${summary}; all checks passed${result.warnings.length ? ' (warnings do not fail the check)' : ''}`);
}
