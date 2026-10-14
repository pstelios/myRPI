#!/usr/bin/env node
// Installs or updates the rpi suite from this myRPI checkout. It is myRPI's own tool and is never
// copied into applications, so an application always runs the installer of the suite it pulls.
//   node <myRPI>/scripts/install-suite.mjs --to <skills-dir> [--repo <root>]
// Each rpi-* folder in <skills-dir> becomes an exact mirror of myRPI's skills/ (files removed here
// are removed there; retired rpi-* folders are deleted); nothing else in the folder is touched.
// With --repo, the application also gets the shared guidance file: <root>/AGENTS.md is replaced by
// myRPI's AGENTS.md, and <root>/AGENTS_APP.md (application-specific guidance) is created when missing
// and never overwritten. The installed copy is then checked, in repository mode once configured.
import { installSuite } from './lib/install.mjs';

function parseArgs(argv) {
  const args = { to: null, repo: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--to') args.to = argv[++i];
    else if (argv[i] === '--repo') args.repo = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!args.to) throw new Error('missing --to <skills-dir>');
  return args;
}

let args;
try { args = parseArgs(process.argv.slice(2)); } catch (err) {
  console.error(`${err.message}\nUsage: node install-suite.mjs --to <skills-dir> [--repo <root>]`);
  process.exit(2);
}
process.exit(installSuite(args));
