// Supporting unit tests for the shared library (not linked to a scenario).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml } from '../../skills/rpi-workflow/scripts/lib/yaml.mjs';
import { parseFrontmatter, setFrontmatter } from '../../skills/rpi-workflow/scripts/lib/frontmatter.mjs';
import { extractConfig } from '../../skills/rpi-workflow/scripts/lib/config.mjs';
import { tokenize } from '../evals/lib/command.mjs';

test('YAML subset: nested maps, flow collections, sequences, quoting, comments', () => {
  const data = parseYaml(`rpi:
  suite_version: 1.0.0   # comment
  features: { working: a/b, completed: 'c d' }
  full: [make verify, "npm run check"]
  flag: true
  count: 900
  empty: ~
  list:
    - { kind: unit, tool: X, command: make spec }
    - name: second
      start: 'tool -p {prompt} "quoted arg"'
      regex: '"id"\\s*:\\s*"([^"]+)"'
  seq:
  - one
  - two
`);
  assert.deepEqual(data, {
    rpi: {
      suite_version: '1.0.0',
      features: { working: 'a/b', completed: 'c d' },
      full: ['make verify', 'npm run check'],
      flag: true,
      count: 900,
      empty: null,
      list: [
        { kind: 'unit', tool: 'X', command: 'make spec' },
        { name: 'second', start: 'tool -p {prompt} "quoted arg"', regex: '"id"\\s*:\\s*"([^"]+)"' },
      ],
      seq: ['one', 'two'],
    },
  });
});

test('YAML subset fails loudly on unsupported input', () => {
  assert.throws(() => parseYaml('a: [unclosed'), /line 1/);
  assert.throws(() => parseYaml('a:\n   b: 1\n  c: 2'), /indentation/i);
});

test('Frontmatter: parse and set keys', () => {
  const text = '---\nstatus: draft\nrevision: 1\nmetadata:\n  version: 1.0.0\n---\n# Body\n';
  const { data, body, lines } = parseFrontmatter(text);
  assert.equal(data.status, 'draft');
  assert.equal(data.metadata.version, '1.0.0');
  assert.equal(body, '# Body\n');
  assert.equal(lines['metadata.version'], 5);
  const updated = setFrontmatter(text, { status: 'ready', brief_revision: 3 });
  assert.equal(parseFrontmatter(updated).data.status, 'ready');
  assert.equal(parseFrontmatter(updated).data.brief_revision, 3);
  assert.equal(parseFrontmatter('# no frontmatter\n').data, null);
  assert.match(setFrontmatter('# none\n', { status: 'confirmed' }), /^---\nstatus: confirmed\n---\n# none/);
});

test('Configuration: extracted from the Feature workflow section', () => {
  const text = '# G\n\n## Feature workflow\n\nSee rpi-workflow.\n\n```yaml\nrpi:\n  suite_version: 1.0.0\n```\n\n## Other\n';
  const section = extractConfig(text);
  assert.equal(section.startLine, 3);
  assert.equal(section.endLine, 11);
  assert.deepEqual(section.config, { suite_version: '1.0.0' });
  assert.equal(extractConfig('# G\n').config, null);
});

test('Command templates: tokenized with quoting', () => {
  assert.deepEqual(tokenize('"C:\\Program Files\\node.exe" a {prompt} \'b c\''), ['C:\\Program Files\\node.exe', 'a', '{prompt}', 'b c']);
});
