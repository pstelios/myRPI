// Static scenarios about the configuration release notes: the changelog parity, the review that
// the suite check asks for, and the installer's report.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { checkSuite } from '../../scripts/check-suite.mjs';
import { compareVersions, parseChangelog, parseNotes, pendingChanges } from '../../scripts/lib/release-notes.mjs';
import { checkScript, cleanup, copySuite, guidance, installScript, projectDir, read, runNode, suiteVersion, tempDir, writeTree } from './helpers.mjs';

after(cleanup);

const NOTES = 'rpi-workflow/references/configuration-changes.md';
const escaped = suiteVersion.replace(/\./g, '\\.');
const rule = (result, id) => result.findings.filter((f) => f.rule === id);
const messages = (result, id) => rule(result, id).map((f) => f.message).join('\n');

// A temporary stand-in for myRPI: the suite with its changelog next to it.
function source() {
  const root = tempDir('rpi-notes-');
  const skills = copySuite(root);
  writeFileSync(join(root, 'CHANGELOG.md'), read(join(projectDir, 'CHANGELOG.md')));
  return { root, skills, notes: join(skills, NOTES), changelog: join(root, 'CHANGELOG.md') };
}
const checkSource = ({ skills }) => checkSuite({ suiteDir: skills, sourceDir: skills, suiteOnly: true });

describe('release notes helpers', () => {
  test('parseNotes and parseChangelog read the version sections', () => {
    const notes = parseNotes('# T\n\nIntro.\n\n## 2.0.0\n\nChange it.\n\n## 1.0.0\n\nNone.\n');
    assert.deepEqual(notes.map((n) => [n.version, n.body]), [['2.0.0', 'Change it.'], ['1.0.0', 'None.']]);
    const entries = parseChangelog('# C\n\n## 2.0.0 — d\n\n- a\n\n### Configuration changes\n\nChange it.\n\n## 1.0.0 — d\n\n- b\n');
    assert.deepEqual(entries.map((e) => [e.version, e.notes]), [['2.0.0', 'Change it.'], ['1.0.0', null]]);
  });

  test('pendingChanges lists releases after the reviewed one that need a change', () => {
    const notes = parseNotes('## 3.0.0\n\nMove it.\n\n## 2.0.1\n\nNone.\n\n## 2.0.0\n\nAdd it.\n\n## 1.0.0\n\nNone.\n');
    assert.deepEqual(pendingChanges(notes, '1.0.0', '3.0.0').map((n) => n.version), ['2.0.0', '3.0.0']);
    assert.deepEqual(pendingChanges(notes, '2.0.0', '3.0.0').map((n) => n.version), ['3.0.0']);
    assert.deepEqual(pendingChanges(notes, '3.0.0', '3.0.0'), []);
    assert.ok(compareVersions('3.1.0', '3.0.9') > 0 && compareVersions('2.0.0', '2.0.0') === 0);
  });
});

describe('Rule: The suite is reusable from a separate repository', () => {
  test('Every release states its configuration changes', () => {
    assert.deepEqual(rule(checkSource(source()), 'release-notes'), [], 'the real suite and changelog agree');

    // A changelog entry without the subsection.
    const noSubsection = source();
    writeFileSync(noSubsection.changelog, read(noSubsection.changelog).replace('### Configuration changes\n\nNone. First release.\n', ''));
    assert.match(messages(checkSource(noSubsection), 'release-notes'), /version 1\.0\.0 has no "### Configuration changes" subsection/);

    // A changelog entry whose text differs from the shipped section.
    const differs = source();
    writeFileSync(differs.notes, read(differs.notes).replace('None. First release.', 'None. First release, reworded.'));
    assert.match(messages(checkSource(differs), 'release-notes'), /"### Configuration changes" of 1\.0\.0 differs/);

    // A release without a section in the shipped file, and the current release in particular.
    const missing = source();
    writeFileSync(missing.notes, read(missing.notes).replace(/## 3\.0\.0[\s\S]*?(?=## 2\.0\.0)/, ''));
    assert.match(messages(checkSource(missing), 'release-notes'), /version 3\.0\.0 has no section in/);
    const noCurrent = source();
    writeFileSync(noCurrent.notes, read(noCurrent.notes).replace(new RegExp(`## ${escaped}[\\s\\S]*?(?=## 3\\.0\\.1)`), ''));
    assert.match(messages(checkSource(noCurrent), 'release-notes'), new RegExp(`no section for suite version ${escaped}`));

    // A changelog without an entry for the current suite version.
    const noEntry = source();
    writeFileSync(noEntry.changelog, read(noEntry.changelog).replace(new RegExp(`## ${escaped}[\\s\\S]*?(?=\\n## 3\\.0\\.1)`), ''));
    assert.match(messages(checkSource(noEntry), 'release-notes'), new RegExp(`no entry for suite version ${escaped}`));
  });

  test('The suite check asks for a configuration review after a suite update', () => {
    const review = (reviewedVersion) => {
      const root = tempDir('rpi-review-');
      const skills = copySuite(root, '.claude/skills');
      writeTree(root, { 'AGENTS_APP.md': guidance({ reviewedVersion }) });
      return checkSuite({ suiteDir: skills, repoDir: root });
    };

    const due = rule(review('1.0.0'), 'config-review');
    assert.equal(due.length, 1);
    assert.match(due[0].message, /last reviewed for suite 1\.0\.0 but the installed suite is .*; releases 2\.0\.0, 3\.0\.0 list configuration changes/);
    assert.match(due[0].message, /rpi-init/);
    assert.equal(due[0].file, 'AGENTS_APP.md');
    assert.ok(due[0].line > 1, 'the finding points at the suite_version line');

    const noneListed = rule(review('3.0.0'), 'config-review');
    assert.equal(noneListed.length, 1, 'a review is due even when every later release says "None."');
    assert.match(noneListed[0].message, /last reviewed for suite 3\.0\.0 but the installed suite is .*no configuration change is listed since then.*rpi-init/);
    assert.deepEqual(rule(review(suiteVersion), 'config-review'), [], 'a reviewed configuration passes');
    assert.match(messages(review('99.0.0'), 'config-review'), /newer than the installed suite .*task rpi:update/);
    assert.match(messages(review('three'), 'config'), /suite_version must be a semantic version/);
  });

  test('The installer shows the configuration changes since the last review', () => {
    const app = tempDir('rpi-install-');
    writeTree(app, { 'AGENTS_APP.md': guidance({ reviewedVersion: '1.0.0' }) });
    const stale = runNode(installScript(), ['--to', join(app, '.claude', 'skills'), '--repo', app]);
    assert.match(stale.stdout, /Configuration changes since suite 1\.0\.0:/);
    assert.match(stale.stdout, /^2\.0\.0$/m);
    assert.match(stale.stdout, /^3\.0\.0$/m);
    assert.doesNotMatch(stale.stdout, /^3\.0\.1$/m, 'releases that say "None." are not listed');
    assert.match(stale.stdout, /Run the rpi-init skill to review the configuration/);
    assert.equal(stale.code, 0, 'a pending review is the next step, not a failure of the update');
    assert.match(stale.stdout, /Next: run the rpi-init skill to review the configuration/);
    const afterwards = runNode(checkScript(), ['--suite', join(app, '.claude', 'skills'), '--repo', app]);
    assert.equal(afterwards.code, 1, 'rpi:check fails until the configuration is reviewed');
    assert.match(afterwards.stdout, /AGENTS_APP\.md:\d+ config-review /);

    // An older review with no listed change still points to rpi-init.
    const none = tempDir('rpi-install-');
    writeTree(none, { 'AGENTS_APP.md': guidance({ reviewedVersion: '3.0.0' }) });
    const noChange = runNode(installScript(), ['--to', join(none, '.claude', 'skills'), '--repo', none]);
    assert.equal(noChange.code, 0, noChange.output);
    assert.match(noChange.stdout, /last reviewed for suite 3\.0\.0; no configuration change is listed up to/);
    assert.match(noChange.stdout, /Next: run the rpi-init skill to review the configuration/);

    // Without a configuration, the previously installed version is the starting point.
    const fresh = tempDir('rpi-install-');
    writeTree(fresh, { 'skills/rpi-workflow/SKILL.md': '---\nname: rpi-workflow\nmetadata:\n  suite: rpi\n  version: 1.0.0\n---\n' });
    const older = runNode(installScript(), ['--to', join(fresh, 'skills')]);
    assert.match(older.stdout, /Configuration changes since suite 1\.0\.0:/);

    // A reviewed configuration prints nothing.
    const current = tempDir('rpi-install-');
    writeTree(current, { 'AGENTS_APP.md': guidance() });
    const quiet = runNode(installScript(), ['--to', join(current, '.claude', 'skills'), '--repo', current]);
    assert.equal(quiet.code, 0, quiet.output);
    assert.doesNotMatch(quiet.stdout, /Configuration changes since/);
  });
});
