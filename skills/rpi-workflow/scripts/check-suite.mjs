#!/usr/bin/env node
// Static checks for the rpi skill suite and, in repository mode, for the repository that uses it.
// Usage: node check-suite.mjs [--repo <root>] [--suite <skills-dir>] [--suite-only] [--feature <file.feature>]
// Prints one line per finding: <file>:<line> <rule-id> <message>. Exits 1 when there are findings.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { GUIDANCE_FILE, SECTION_HEADING, configValues, loadConfig, validateConfig } from './lib/config.mjs';
import { LEGACY_SKILLS, SUITE_SKILLS, isInside, thisSuiteDir, toPosix, walk } from './lib/files.mjs';
import { agentScenarioTitles } from './lib/gherkin.mjs';

export const REPOSITORY_RULES = ['app-values', 'config', 'no-restated-lifecycle', 'single-copy'];
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

const CAPABILITY_REF = /\(capability:\s*([a-z][a-z0-9-]*)\)/g;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Generic single lowercase words (such as "test") cannot be matched reliably against prose.
const isSpecificValue = (v) => /[\s/.:\\]|[A-Z]/.test(v);

function suiteFiles(suiteDir, { excludeEvals = false } = {}) {
  const files = [];
  for (const skill of SUITE_SKILLS) {
    const dir = join(suiteDir, skill);
    for (const rel of walk(dir, { skip: (r) => /(^|\/)scripts$/.test(r) || (excludeEvals && /(^|\/)evals$/.test(r)) })) {
      files.push(join(dir, rel));
    }
  }
  return files;
}

export function checkSuite({ suiteDir = thisSuiteDir, repoDir = null, suiteOnly = false, featureFile = null, base = null } = {}) {
  suiteDir = resolve(suiteDir);
  const root = suiteOnly ? null : resolve(repoDir ?? process.cwd());
  const baseDir = resolve(base ?? root ?? process.cwd());
  const show = (p) => (isInside(p, baseDir) ? toPosix(relative(baseDir, p)) : toPosix(p));
  const findings = [];
  const add = (file, line, rule, message) => findings.push({ file: show(file), line, rule, message });
  const result = { findings, skipped: [], scanned: { harnessTerms: 0, appValues: 0, agentScenarios: 0 }, capabilities: { referenced: [], defined: [] }, config: null, configSection: null };

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

  // harness-terms, capabilities
  const texts = suiteFiles(suiteDir).map((file) => ({ file, text: readFileSync(file, 'utf8') }));
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

    // app-values
    const values = configValues(section.config).filter(isSpecificValue);
    result.scanned.appValues = values.length;
    if (values.length) {
      const patterns = values.map((v) => [v, new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(v)}(?![A-Za-z0-9_])`, 'i')]);
      for (const file of suiteFiles(suiteDir, { excludeEvals: true })) {
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

    // single-copy
    const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
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

  // eval-coverage
  if (featureFile) {
    const feature = resolve(featureFile);
    if (!existsSync(feature)) {
      add(feature, 1, 'eval-coverage', 'feature file not found');
    } else {
      const scenarios = agentScenarioTitles(readFileSync(feature, 'utf8'));
      result.scanned.agentScenarios = scenarios.length;
      const casesDir = join(suiteDir, 'rpi-workflow', 'evals', 'cases');
      const cases = [];
      for (const name of existsSync(casesDir) ? readdirSync(casesDir).filter((n) => n.endsWith('.json')).sort() : []) {
        const file = join(casesDir, name);
        try {
          const data = JSON.parse(readFileSync(file, 'utf8'));
          cases.push({ file, title: data.title });
          for (const problem of validateCase(data)) add(file, 1, 'eval-coverage', problem);
        } catch (err) {
          add(file, 1, 'eval-coverage', `invalid JSON: ${err.message}`);
        }
      }
      for (const s of scenarios) {
        const count = cases.filter((c) => c.title === s.title).length;
        if (count === 0) add(feature, s.line, 'eval-coverage', `"${s.title}" has no eval case`);
        else if (count > 1) add(feature, s.line, 'eval-coverage', `"${s.title}" has ${count} eval cases`);
      }
      const titles = new Set(scenarios.map((s) => s.title));
      for (const c of cases) if (!titles.has(c.title)) add(c.file, 1, 'eval-coverage', `"${c.title}" has no matching @agent scenario`);
    }
  } else {
    result.skipped.push('eval-coverage');
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return result;
}

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

function parseArgs(argv) {
  const args = { repo: null, suite: null, suiteOnly: false, feature: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i];
    else if (a === '--suite') args.suite = argv[++i];
    else if (a === '--suite-only') args.suiteOnly = true;
    else if (a === '--feature') args.feature = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exit(2); }
  const result = checkSuite({ suiteDir: args.suite ?? thisSuiteDir, repoDir: args.repo, suiteOnly: args.suiteOnly, featureFile: args.feature });
  for (const f of result.findings) console.log(`${f.file}:${f.line} ${f.rule} ${f.message}`);
  for (const rule of result.skipped) console.log(`skipped ${rule} (${rule === 'eval-coverage' ? 'no --feature given' : 'suite-only mode'})`);
  const summary = `rpi suite ${result.version ?? '?'}: ${result.findings.length} finding(s)`;
  if (result.findings.length) { console.log(summary); process.exit(1); }
  console.log(`${summary}; all checks passed`);
}
