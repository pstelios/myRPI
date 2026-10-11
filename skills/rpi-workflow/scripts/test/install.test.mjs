// Static scenarios from the "The suite is reusable from a separate repository" rule.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SUITE_SKILLS, checkScript, cleanup, installScript, read, runNode, suiteDir, tempDir, writeTree } from './helpers.mjs';

after(cleanup);

function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dir, full).split('\\').join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

describe('Rule: The suite is reusable from a separate repository', () => {
  test('Installing the suite produces an identical copy', () => {
    const dest = tempDir('rpi-install-');
    writeTree(dest, {
      'README.md': 'unrelated readme\n',
      'skills/other-skill/SKILL.md': 'not part of the suite\n',
      'skills/rpi-plan/SKILL.md': 'old plan skill\n',
      'skills/rpi-plan/obsolete.md': 'removed from the source suite\n',
      'skills/rpi-retired/SKILL.md': 'a suite skill that no longer exists\n',
    });

    const run = runNode(installScript(), ['--to', join(dest, 'skills')]);
    assert.equal(run.code, 0, run.output);

    for (const skill of SUITE_SKILLS) {
      const source = join(suiteDir, skill);
      const copy = join(dest, 'skills', skill);
      assert.deepEqual(listFiles(copy), listFiles(source), `${skill} file list`);
      for (const file of listFiles(source)) assert.equal(read(join(copy, file)), read(join(source, file)), `${skill}/${file}`);
    }
    assert.ok(!existsSync(join(dest, 'skills', 'rpi-plan', 'obsolete.md')), 'removed file is gone');
    assert.ok(!existsSync(join(dest, 'skills', 'rpi-retired')), 'retired suite folder is gone');
    assert.equal(read(join(dest, 'README.md')), 'unrelated readme\n');
    assert.equal(read(join(dest, 'skills', 'other-skill', 'SKILL.md')), 'not part of the suite\n');

    // Installing over the source itself is refused.
    assert.equal(runNode(installScript(), ['--to', suiteDir]).code, 2);
  });

  test('An installed suite passes the check without repository configuration', () => {
    const dest = tempDir('rpi-install-');
    assert.equal(runNode(installScript(), ['--to', join(dest, 'skills')]).code, 0);
    const installed = join(dest, 'skills');
    const run = runNode(checkScript(installed), ['--suite-only'], { cwd: dest });
    assert.equal(run.code, 0, run.output);
    for (const rule of ['app-values', 'config', 'no-restated-lifecycle', 'single-copy']) {
      assert.match(run.stdout, new RegExp(`^skipped ${rule}\\b`, 'm'), `${rule} reported as skipped`);
    }
  });
});
