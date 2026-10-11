// YAML frontmatter between leading "---" lines.
import { parseYaml } from './yaml.mjs';

const FENCE = /^---\s*$/;

// Returns { data, body, lines, endLine }. data is null when there is no frontmatter.
// lines maps dotted key paths ("metadata.version") to 1-based line numbers in the file.
export function parseFrontmatter(text) {
  const all = text.split(/\r?\n/);
  if (!FENCE.test(all[0] ?? '')) return { data: null, body: text, lines: {}, endLine: 0 };
  const end = all.findIndex((l, i) => i > 0 && FENCE.test(l));
  if (end === -1) return { data: null, body: text, lines: {}, endLine: 0 };
  const yaml = all.slice(1, end).join('\n');
  const data = parseYaml(yaml, 2) ?? {};
  const lines = {};
  const stack = [];
  all.slice(1, end).forEach((line, i) => {
    const m = line.match(/^(\s*)([A-Za-z_][\w-]*)\s*:/);
    if (!m) return;
    const indent = m[1].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    stack.push({ indent, key: m[2] });
    lines[stack.map((s) => s.key).join('.')] = i + 2;
  });
  return { data, body: all.slice(end + 1).join('\n'), lines, endLine: end + 1 };
}

function formatScalar(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  const s = String(value);
  return /^[\w./-]+$/.test(s) && !/^(true|false|null|~|-?\d+)$/.test(s) ? s : JSON.stringify(s);
}

// Sets top-level scalar keys, replacing existing lines or appending new ones. Adds frontmatter when missing.
export function setFrontmatter(text, values) {
  const all = text.split('\n');
  let end = FENCE.test(all[0] ?? '') ? all.findIndex((l, i) => i > 0 && FENCE.test(l)) : -1;
  if (end === -1) {
    all.unshift('---', '---');
    end = 1;
  }
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}: ${formatScalar(value)}`;
    const at = all.findIndex((l, i) => i > 0 && i < end && new RegExp(`^${key}\\s*:`).test(l));
    if (at === -1) {
      all.splice(end, 0, line);
      end += 1;
    } else {
      all[at] = line;
    }
  }
  return all.join('\n');
}
