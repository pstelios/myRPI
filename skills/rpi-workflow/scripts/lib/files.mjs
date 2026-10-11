// File-tree helpers shared by the suite scripts.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUITE_SKILLS = ['rpi-workflow', 'rpi-init', 'rpi-refine', 'rpi-plan', 'rpi-implement', 'rpi-grill-me'];
export const LEGACY_SKILLS = ['refine', 'plan', 'implement', 'grill-me'];

// The skills directory that holds this copy of the suite (the parent of rpi-workflow).
export const thisSuiteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const toPosix = (p) => p.split(sep).join('/');

export function walk(dir, { skip = () => false } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  const visit = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      const rel = toPosix(relative(dir, full));
      if (skip(rel, full)) continue;
      if (statSync(full).isDirectory()) visit(full);
      else out.push(rel);
    }
  };
  visit(dir);
  return out;
}

export function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function isInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !/^[A-Za-z]:/.test(rel) && !rel.startsWith(sep));
}

// Makes dest/<name> an exact copy of src/<name> for every suite skill; stale suite folders are removed.
export function mirrorSuite(srcSuite, destSkills) {
  mkdirSync(destSkills, { recursive: true });
  for (const entry of readdirSync(destSkills)) {
    if (entry.startsWith('rpi-') && !SUITE_SKILLS.includes(entry)) rmSync(join(destSkills, entry), { recursive: true, force: true });
  }
  for (const skill of SUITE_SKILLS) {
    const target = join(destSkills, skill);
    rmSync(target, { recursive: true, force: true });
    cpSync(join(srcSuite, skill), target, { recursive: true });
  }
}
