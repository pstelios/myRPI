// Static scenarios from the "The suite is reusable from a separate repository" rule.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SUITE_SKILLS, checkScript, cleanup, guidance, initScript, installScript, projectDir, read, runNode, suiteDir, tempDir, writeTree } from './helpers.mjs';

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
  test('The installed suite holds only what applications need', () => {
    // Nothing that only myRPI itself needs may sit in the suite folders.
    const forbidden = (file) => /(^|\/)(evals|fixtures|test)(\/|$)|(^|\/)scripts(\/|$)|run-evals|check-coverage|install-suite|check-suite|\.test\.mjs$|stub-harness/.test(file);
    for (const skill of SUITE_SKILLS) {
      assert.deepEqual(listFiles(join(suiteDir, skill)).filter(forbidden), [], `${skill} in the source repository`);
    }

    // An older copy that still has such files loses them when the suite is installed.
    const dest = tempDir('rpi-install-');
    writeTree(dest, {
      'skills/rpi-workflow/evals/cases/A01-old.json': '{}\n',
      'skills/rpi-workflow/scripts/run-evals.mjs': '// old\n',
      'skills/rpi-workflow/scripts/test/helpers.mjs': '// old\n',
    });
    const run = runNode(installScript(), ['--to', join(dest, 'skills')]);
    assert.equal(run.code, 0, run.output);
    for (const skill of SUITE_SKILLS) {
      assert.deepEqual(listFiles(join(dest, 'skills', skill)).filter(forbidden), [], `${skill} in the installed copy`);
    }
    assert.ok(!existsSync(join(dest, 'skills', 'rpi-workflow', 'evals')), 'old eval folder is gone');
  });

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

  test('Installing into an application also installs the shared guidance', () => {
    const shared = read(join(projectDir, 'AGENTS.md'));

    // A new application gets the shared guidance and a placeholder for its own guidance.
    const fresh = tempDir('rpi-install-');
    const first = runNode(installScript(), ['--to', join(fresh, 'skills'), '--repo', fresh]);
    assert.equal(read(join(fresh, 'AGENTS.md')), shared);
    assert.match(read(join(fresh, 'AGENTS_APP.md')), /^# Application guidance/);
    assert.equal(first.code, 0, first.output);
    assert.match(first.stdout, /no "Feature workflow" configuration yet: run the rpi-init skill/, 'the placeholder has no configuration yet');

    // An update replaces an older shared copy and leaves the application guidance alone.
    const app = tempDir('rpi-install-');
    writeTree(app, { 'AGENTS.md': '# Agent guidance\n\nAn older shared copy.\n', 'AGENTS_APP.md': guidance() });
    const update = runNode(installScript(), ['--to', join(app, 'skills'), '--repo', app]);
    assert.equal(update.code, 0, update.output);
    assert.equal(read(join(app, 'AGENTS.md')), shared);
    assert.equal(read(join(app, 'AGENTS_APP.md')), guidance());
  });

  test('Installing refuses to replace application content in the shared guidance', () => {
    const cases = {
      'no application guidance file': { 'AGENTS.md': '# Project guidance\n\nApplication rules.\n' },
      'configuration still in the shared file': { 'AGENTS.md': guidance(), 'AGENTS_APP.md': '# Application guidance\n' },
    };
    for (const [name, files] of Object.entries(cases)) {
      const app = tempDir('rpi-install-');
      writeTree(app, files);
      const run = runNode(installScript(), ['--to', join(app, 'skills'), '--repo', app]);
      assert.equal(run.code, 2, `${name}: ${run.output}`);
      assert.match(run.stderr, /Nothing was installed\..*AGENTS_APP\.md/, name);
      assert.ok(!existsSync(join(app, 'skills')), `${name}: no suite installed`);
      for (const [path, content] of Object.entries(files)) assert.equal(read(join(app, path)), content, `${name}: ${path} unchanged`);
    }
  });

  test('A new project gets only what it needs from myRPI', () => {
    const parent = tempDir('rpi-init-');
    const run = runNode(initScript(), ['demo', '--dir', parent]);
    assert.equal(run.code, 0, run.output);
    const project = join(parent, 'demo');
    const skillFiles = SUITE_SKILLS.flatMap((skill) => listFiles(join(suiteDir, skill)).map((f) => `.claude/skills/${skill}/${f}`));
    assert.deepEqual(listFiles(project), ['AGENTS.md', 'AGENTS_APP.md', 'Taskfile.yml', ...skillFiles].sort());
    assert.equal(read(join(project, 'AGENTS.md')), read(join(projectDir, 'AGENTS.md')));
    assert.match(read(join(project, 'AGENTS_APP.md')), /^# demo/);

    // The Taskfile's suite tasks run myRPI's installer and suite check from this checkout.
    const taskfile = read(join(project, 'Taskfile.yml'));
    const source = relative(project, projectDir).split('\\').join('/');
    assert.match(taskfile, /^ {2}rpi:update:/m);
    assert.match(taskfile, /^ {2}rpi:check:/m);
    assert.ok(taskfile.includes(`default "${source}"`), 'the default RPI_SOURCE is this checkout');
    assert.ok(taskfile.includes('/scripts/install-suite.mjs" --to .claude/skills --repo .'));
    assert.ok(!/__RPI_[A-Z]+__/.test(taskfile), 'no placeholder is left');

    // An invalid name or a non-empty folder is refused without changes.
    assert.equal(runNode(initScript(), ['bad name', '--dir', parent]).code, 2);
    writeTree(parent, { 'busy/README.md': 'existing\n' });
    assert.equal(runNode(initScript(), ['busy', '--dir', parent]).code, 2);
    assert.deepEqual(listFiles(join(parent, 'busy')), ['README.md']);
  });

  test('An installed suite passes the check without repository configuration', () => {
    const dest = tempDir('rpi-install-');
    assert.equal(runNode(installScript(), ['--to', join(dest, 'skills')]).code, 0);
    const installed = join(dest, 'skills');
    const run = runNode(checkScript(), ['--suite', installed, '--suite-only'], { cwd: dest });
    assert.equal(run.code, 0, run.output);
    for (const rule of ['app-values', 'config', 'no-restated-lifecycle', 'single-copy']) {
      assert.match(run.stdout, new RegExp(`^skipped ${rule}\\b`, 'm'), `${rule} reported as skipped`);
    }
  });

  test('The suite check reports an installed copy that differs from myRPI', () => {
    const app = tempDir('rpi-install-');
    writeTree(app, { 'AGENTS_APP.md': guidance() });
    const skills = join(app, '.claude', 'skills');
    const install = () => runNode(installScript(), ['--to', skills, '--repo', app]);
    const check = () => runNode(checkScript(), ['--suite', skills, '--repo', app]);
    assert.equal(install().code, 0);
    const clean = check();
    assert.equal(clean.code, 0, `a fresh install passes:\n${clean.output}`);

    // Changed, extra, and removed suite files and a changed shared guidance are each reported.
    writeFileSync(join(skills, 'rpi-grill-me', 'SKILL.md'), `${read(join(skills, 'rpi-grill-me', 'SKILL.md'))}\nA local edit.\n`);
    writeTree(skills, { 'rpi-plan/notes.md': 'Local notes.\n' });
    rmSync(join(skills, 'rpi-refine', 'SKILL.md'));
    writeFileSync(join(app, 'AGENTS.md'), `${read(join(app, 'AGENTS.md'))}\nA project rule.\n`);
    const edited = check();
    assert.equal(edited.code, 1, edited.output);
    for (const pattern of [
      /^\.claude\/skills\/rpi-grill-me\/SKILL\.md:1 up-to-date differs from myRPI's suite .*task rpi:update/m,
      /^\.claude\/skills\/rpi-plan\/notes\.md:1 up-to-date not part of myRPI's suite/m,
      /^\.claude\/skills\/rpi-refine\/SKILL\.md:1 up-to-date missing/m,
      /^AGENTS\.md:1 up-to-date differs from myRPI's shared guidance/m,
    ]) assert.match(edited.stdout, pattern);

    // Line endings alone are not a difference.
    assert.equal(install().code, 0);
    const workflow = join(skills, 'rpi-workflow', 'SKILL.md');
    writeFileSync(workflow, read(workflow).replace(/\r?\n/g, '\r\n'));
    assert.equal(check().code, 0, 'CRLF copy passes');

    // A different version is reported once, with both versions.
    const source = read(join(suiteDir, 'rpi-workflow', 'SKILL.md')).match(/^\s+version:\s*(\S+)$/m)[1];
    for (const skill of SUITE_SKILLS) {
      const file = join(skills, skill, 'SKILL.md');
      writeFileSync(file, read(file).replace(/^(\s+version:\s*)\S+$/m, '$10.0.1'));
    }
    const older = check();
    assert.equal(older.code, 1);
    const lines = older.stdout.split('\n').filter((l) => / up-to-date /.test(l));
    assert.equal(lines.length, 1, older.output);
    assert.match(lines[0], new RegExp(`^\\.claude/skills/rpi-workflow/SKILL\\.md:\\d+ up-to-date installed suite 0\\.0\\.1 is older than ${source.replace(/\./g, '\\.')} in myRPI .*task rpi:update`));

    // Installing again brings the copy back in line.
    assert.equal(install().code, 0);
    assert.equal(check().code, 0);
  });
});
