// Release notes about the "Feature workflow" configuration.
// The suite ships rpi-workflow/references/configuration-changes.md: one "## <version>" section per
// release saying what an application must change in its configuration, or "None.". The same text
// is the "### Configuration changes" subsection of that release's entry in myRPI's CHANGELOG.md.
// The suite check enforces that both exist and agree; rpi-init and the installer read the notes.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const NOTES_FILE = join('rpi-workflow', 'references', 'configuration-changes.md');
export const CHANGELOG_SUBSECTION = '### Configuration changes';
export const SEMVER = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

// Negative when a is older than b, positive when newer, 0 when the release numbers are equal.
export function compareVersions(a, b) {
  const parts = (v) => String(v).split('-')[0].split('.').map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Collapses whitespace so that line wrapping and line endings never count as a difference.
export const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

// A note that requires no change starts with "None".
export const isNone = (body) => /^none\b/i.test(body.trim());

// Splits text at headings of the given level; returns [{ title, line, body }] with 1-based lines.
function sections(text, level) {
  const lines = text.split(/\r?\n/);
  const heading = new RegExp(`^${'#'.repeat(level)} (?!#)(.+?)\\s*$`);
  const stop = new RegExp(`^#{1,${level}} `);
  const out = [];
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) { if (out.length) out[out.length - 1].lines.push(line); return; }
    const m = line.match(heading);
    if (m) out.push({ title: m[1], line: i + 1, lines: [] });
    else if (stop.test(line)) out.push({ title: null, line: i + 1, lines: [] });
    else if (out.length) out[out.length - 1].lines.push(line);
  });
  return out.filter((s) => s.title !== null).map((s) => ({ title: s.title, line: s.line, body: s.lines.join('\n').trim() }));
}

// The sections of configuration-changes.md: [{ version, line, body }].
export function parseNotes(text) {
  return sections(text, 2).map((s) => ({ version: s.title.split(/\s+/)[0], line: s.line, body: s.body }));
}

// The release entries of CHANGELOG.md: [{ version, line, notes }]; notes is the text of the
// "### Configuration changes" subsection, or null when the entry has none.
export function parseChangelog(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  lines.forEach((line, i) => {
    const m = line.match(/^## (\d+\.\d+\.\d+(?:-[\w.]+)?)\b/);
    if (m) entries.push({ version: m[1], line: i + 1, start: i, end: lines.length });
    else if (/^## /.test(line) && entries.length) entries[entries.length - 1].end = Math.min(entries[entries.length - 1].end, i);
  });
  entries.forEach((entry, i) => {
    if (entries[i + 1]) entry.end = Math.min(entry.end, entries[i + 1].start);
  });
  return entries.map((entry) => {
    const block = lines.slice(entry.start + 1, entry.end).join('\n');
    const sub = sections(block, 3).find((s) => `### ${s.title}` === CHANGELOG_SUBSECTION);
    return { version: entry.version, line: entry.line, notes: sub ? sub.body : null };
  });
}

export function readNotes(suiteDir) {
  const file = join(suiteDir, NOTES_FILE);
  return existsSync(file) ? parseNotes(readFileSync(file, 'utf8')) : null;
}

// The releases after `from` up to and including `to` whose notes require a change.
export function pendingChanges(notes, from, to) {
  return (notes ?? [])
    .filter((n) => SEMVER.test(n.version) && compareVersions(n.version, from) > 0 && compareVersions(n.version, to) <= 0 && !isNone(n.body))
    .sort((a, b) => compareVersions(a.version, b.version));
}
