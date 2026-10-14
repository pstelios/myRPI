#!/usr/bin/env node
// Creates a new project for the rpi workflow, with only what it needs from myRPI: the rpi skill
// suite, the shared AGENTS.md, an AGENTS_APP.md placeholder, and a Taskfile with rpi:update and
// rpi:check. The project itself (guidance, architecture, shell, configuration) is then set up by
// the rpi-init skill inside the new project.
//   node <myRPI>/scripts/init-project.mjs [<name>] [--dir <parent-folder>] [--skills <skills-path>]
// Without a name it asks for one. The project folder is <parent-folder>/<name>, by default next to
// this myRPI checkout; it must not exist yet or be empty (apart from version-control metadata).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { installSuite, projectDir } from './lib/install.mjs';
import { toPosix } from './lib/files.mjs';

const DEFAULT_SKILLS = '.claude/skills';
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const IGNORED = new Set(['.git']);

function parseArgs(argv) {
  const args = { name: null, dir: resolve(projectDir, '..'), skills: DEFAULT_SKILLS };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir') args.dir = resolve(argv[++i]);
    else if (argv[i] === '--skills') args.skills = argv[++i];
    else if (argv[i].startsWith('--')) throw new Error(`unknown argument ${argv[i]}`);
    else if (args.name === null) args.name = argv[i];
    else throw new Error(`unexpected argument ${argv[i]}`);
  }
  return args;
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(question)).trim(); } finally { rl.close(); }
}

let args;
try { args = parseArgs(process.argv.slice(2)); } catch (err) {
  console.error(`${err.message}\nUsage: node init-project.mjs [<name>] [--dir <parent-folder>] [--skills <skills-path>]`);
  process.exit(2);
}
if (!args.name) {
  if (!process.stdin.isTTY) {
    console.error('No project name given. Pass it as an argument, for example: task rpi:init -- my-app');
    process.exit(2);
  }
  args.name = await ask(`Name of the new project (created in ${args.dir}): `);
}
if (!NAME.test(args.name ?? '')) {
  console.error(`"${args.name}" is not a valid project name: use letters, digits, ".", "_", or "-", starting with a letter or digit.`);
  process.exit(2);
}

const target = join(args.dir, args.name);
if (existsSync(target) && readdirSync(target).some((entry) => !IGNORED.has(entry))) {
  console.error(`${target} already exists and is not empty. For an existing project, run its task rpi:update instead.`);
  process.exit(2);
}

mkdirSync(target, { recursive: true });
const source = toPosix(relative(target, projectDir)) || '.';
const taskfile = readFileSync(join(projectDir, 'templates', 'Taskfile.yml'), 'utf8')
  .replaceAll('__RPI_SOURCE__', source)
  .replaceAll('__RPI_SKILLS__', args.skills);
writeFileSync(join(target, 'Taskfile.yml'), taskfile);
console.log(`Created ${target} with a Taskfile (rpi:update and rpi:check use the myRPI checkout at ${source})`);

const code = installSuite({ to: join(target, args.skills), repo: target, appTitle: args.name });
if (code !== 0) process.exit(code);
console.log(`
Next: open ${target} with your agent and start the rpi-init skill. In this new project it offers
the new-project interview, then writes the project's guidance (AGENTS_APP.md), architecture
document, shell with health checks, and Feature workflow configuration.`);
