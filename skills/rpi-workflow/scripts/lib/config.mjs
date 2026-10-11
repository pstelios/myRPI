// The repository's "Feature workflow" configuration: a "## Feature workflow" section of the
// guidance file holding one fenced yaml block whose top-level key is "rpi".
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseYaml } from './yaml.mjs';

export const GUIDANCE_FILE = 'AGENTS.md';
export const SECTION_HEADING = '## Feature workflow';
const GIT_VALUES = ['never', 'when-asked', 'allowed'];

// Returns { startLine, endLine, text, config, yamlLine, error } with 1-based lines; config is null when absent.
export function extractConfig(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === SECTION_HEADING);
  if (start === -1) return { startLine: 0, endLine: 0, text: '', config: null, yamlLine: 0, error: null };
  let end = lines.length;
  let fenced = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*```/.test(lines[i])) fenced = !fenced;
    else if (!fenced && /^#{1,2} /.test(lines[i])) { end = i; break; }
  }
  while (end - 1 > start && lines[end - 1] === '' && end === lines.length) end -= 1;
  const sectionLines = lines.slice(start, end);
  const result = { startLine: start + 1, endLine: end, text: sectionLines.join('\n'), config: null, yamlLine: 0, error: null };
  const open = sectionLines.findIndex((l) => /^```ya?ml\s*$/.test(l.trim()));
  if (open === -1) return { ...result, error: 'the section has no fenced yaml block' };
  const close = sectionLines.findIndex((l, i) => i > open && l.trim() === '```');
  if (close === -1) return { ...result, error: 'the yaml block is not closed' };
  result.yamlLine = start + open + 2;
  try {
    const parsed = parseYaml(sectionLines.slice(open + 1, close).join('\n'), result.yamlLine);
    if (!parsed || typeof parsed !== 'object' || !parsed.rpi) return { ...result, error: 'the yaml block has no top-level "rpi" key' };
    result.config = parsed.rpi;
  } catch (err) {
    result.error = err.message;
  }
  return result;
}

export function loadConfig(repoDir) {
  const path = join(repoDir, GUIDANCE_FILE);
  if (!existsSync(path)) return { path, exists: false, text: '', section: extractConfig('') };
  const text = readFileSync(path, 'utf8');
  return { path, exists: true, text, section: extractConfig(text) };
}

const isMap = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

// Returns a list of problems ("missing key ..." etc.) for the required configuration keys.
export function validateConfig(config) {
  const problems = [];
  if (!isMap(config)) return ['the configuration is not a map'];
  if (!nonEmptyString(config.suite_version)) problems.push('missing key suite_version');
  if (!isMap(config.features) || !nonEmptyString(config.features.working)) problems.push('missing key features.working');
  if (!isMap(config.features) || !nonEmptyString(config.features.completed)) problems.push('missing key features.completed');
  if (!nonEmptyString(config.architecture)) problems.push('missing key architecture (use "none" when there is no architecture document)');
  const v = config.verification;
  if (!isMap(v) || !isMap(v.focused) || !Object.keys(v.focused).length) problems.push('missing key verification.focused');
  if (!isMap(v) || !Array.isArray(v.full) || !v.full.length) problems.push('missing key verification.full');
  if (!Array.isArray(config.test_mapping) || !config.test_mapping.length) {
    problems.push('missing key test_mapping');
  } else {
    config.test_mapping.forEach((m, i) => {
      for (const key of ['kind', 'tool', 'location', 'command']) {
        if (!isMap(m) || !nonEmptyString(m[key])) problems.push(`missing key test_mapping[${i}].${key}`);
      }
    });
  }
  for (const key of ['commit', 'push', 'branch']) {
    const value = isMap(config.git) ? config.git[key] : undefined;
    if (value === undefined) problems.push(`missing key git.${key}`);
    else if (!GIT_VALUES.includes(value)) problems.push(`git.${key} must be one of ${GIT_VALUES.join(', ')}`);
  }
  return problems;
}

// Application-specific values (paths, tools, commands) that must not appear in skill text.
export function configValues(config) {
  const out = [];
  const add = (v) => {
    if (typeof v !== 'string') return;
    const s = v.trim();
    if (!s || s === 'none' || /^<[^>]*>$/.test(s)) return;
    out.push(s);
  };
  if (!isMap(config)) return out;
  add(config.features?.working);
  add(config.features?.completed);
  add(config.architecture);
  const v = config.verification ?? {};
  (Array.isArray(v.setup) ? v.setup : []).forEach(add);
  Object.values(isMap(v.focused) ? v.focused : {}).forEach(add);
  (Array.isArray(v.full) ? v.full : []).forEach(add);
  (Array.isArray(config.test_mapping) ? config.test_mapping : []).forEach((m) => {
    if (isMap(m)) [m.tool, m.location, m.command].forEach(add);
  });
  add(config.agent_evals?.report);
  (Array.isArray(config.agent_evals?.harnesses) ? config.agent_evals.harnesses : []).forEach((h) => {
    if (isMap(h)) [h.start, h.resume, h.version].forEach(add);
  });
  return [...new Set(out)];
}
