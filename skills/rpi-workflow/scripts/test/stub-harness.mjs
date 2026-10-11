#!/usr/bin/env node
// Deterministic, offline stand-in for an agent harness, used by the eval runner's own tests.
// Usage: stub-harness.mjs <good|bad> <session> <prompt> [log-file]
//   good: writes result.txt containing "ok" in the working directory.
//   bad:  changes nothing.
// When a log file is given, appends one JSON line with the working directory, session, and prompt.
import { appendFileSync, writeFileSync } from 'node:fs';

const [mode, session, prompt, log] = process.argv.slice(2);
if (log) appendFileSync(log, `${JSON.stringify({ cwd: process.cwd(), session, prompt, mode })}\n`);
if (mode === 'good') writeFileSync('result.txt', 'ok\n');
process.stdout.write(`Stub ${mode} reply for session ${session}.\nWhich option do you prefer?\n`);
