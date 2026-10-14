#!/usr/bin/env node
// Agent eval runner. Runs each eval case non-interactively in every configured harness, inside a
// fresh temporary fixture repository outside the project, then checks the case's assertions.
// Part of myRPI's own tests: it is not installed into applications.
// Usage: node run-evals.mjs [--repo <root>] [--case <id|title>]... [--harness <name>]...
//                           [--report <file>] [--jobs <n>] [--keep] [--fresh] [--list]
//                           [--cases <dir>] [--fixtures <dir>] [--suite <skills-dir>]
// By default the cases and fixtures sit next to this script and the suite under test is the skills folder of this repository.
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHARED_GUIDANCE_FILE, loadConfig } from '../../scripts/lib/config.mjs';
import { parseFrontmatter, setFrontmatter } from '../../scripts/lib/frontmatter.mjs';
import { hashFile, isInside, mirrorSuite, thisSuiteDir, toPosix, walk } from '../../scripts/lib/files.mjs';
import { run, runShell, substitute, tokenize } from './lib/command.mjs';

const checkSuiteScript = fileURLToPath(new URL('../../scripts/check-suite.mjs', import.meta.url));

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILLS_DIR = '.agents/skills';
const DEFAULT_TIMEOUT_S = 900;

function parseArgs(argv) {
  const args = { repo: process.cwd(), cases: [], harnesses: [], report: null, jobs: 3, keep: false, fresh: false, list: false, casesDir: join(here, 'cases'), fixturesDir: join(here, 'fixtures'), suite: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i];
    else if (a === '--case') args.cases.push(argv[++i]);
    else if (a === '--harness') args.harnesses.push(argv[++i]);
    else if (a === '--report') args.report = argv[++i];
    else if (a === '--jobs') args.jobs = Math.max(1, Number(argv[++i]) || 1);
    else if (a === '--keep') args.keep = true;
    else if (a === '--fresh') args.fresh = true;
    else if (a === '--list') args.list = true;
    else if (a === '--cases') args.casesDir = resolve(argv[++i]);
    else if (a === '--fixtures') args.fixturesDir = resolve(argv[++i]);
    else if (a === '--suite') args.suite = resolve(argv[++i]);
    else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

function die(message) {
  console.error(message);
  process.exit(1);
}

// ---------- cases and fixtures ----------

function loadCases(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.json')).sort().map((n) => ({ file: n, ...JSON.parse(readFileSync(join(dir, n), 'utf8')) }));
}

function buildFixture(dir, testCase, suiteDir, skillsDir, fixtures) {
  const fx = testCase.fixture ?? {};
  for (const seed of fx.seeds ?? []) {
    const src = join(fixtures, seed);
    if (!existsSync(src)) throw new Error(`fixture seed "${seed}" not found`);
    cpSync(src, dir, { recursive: true });
  }
  for (const [path, content] of Object.entries(fx.files ?? {})) {
    const full = join(dir, path);
    if (content === null) rmSync(full, { recursive: true, force: true });
    else { mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content); }
  }
  for (const [path, pairs] of Object.entries(fx.replace ?? {})) {
    const full = join(dir, path);
    let text = readFileSync(full, 'utf8');
    for (const [from, to] of pairs) {
      if (!text.includes(from)) throw new Error(`fixture replace: "${from}" not found in ${path}`);
      text = text.replace(from, to);
    }
    writeFileSync(full, text);
  }
  for (const [path, values] of Object.entries(fx.frontmatter ?? {})) {
    const full = join(dir, path);
    writeFileSync(full, setFrontmatter(readFileSync(full, 'utf8'), values));
  }
  mirrorSuite(suiteDir, join(dir, skillsDir));
  // Like an installed application, the fixture gets the shared guidance next to the suite's source.
  const shared = join(dirname(resolve(suiteDir)), SHARED_GUIDANCE_FILE);
  if (existsSync(shared) && !existsSync(join(dir, SHARED_GUIDANCE_FILE))) cpSync(shared, join(dir, SHARED_GUIDANCE_FILE));
}

async function git(cwd, args) {
  const r = await run(['git', ...args], { cwd });
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

async function initRepo(dir) {
  await git(dir, ['init', '-q']);
  await git(dir, ['config', 'core.autocrlf', 'false']);
  await git(dir, ['config', 'user.name', 'rpi-eval']);
  await git(dir, ['config', 'user.email', 'rpi-eval@example.invalid']);
  await git(dir, ['config', 'commit.gpgsign', 'false']);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-q', '--allow-empty', '-m', 'Eval fixture']);
  return {
    branch: (await git(dir, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim(),
    branches: (await git(dir, ['branch', '--list'])).trim(),
  };
}

function snapshot(dir) {
  const hashes = new Map();
  for (const rel of walk(dir, { skip: (r) => r === '.git' })) hashes.set(rel, hashFile(join(dir, rel)));
  return hashes;
}

async function changedPaths(dir, ignore) {
  const out = await git(dir, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const parts = out.split('\0').filter(Boolean);
  const paths = [];
  for (let i = 0; i < parts.length; i += 1) {
    const status = parts[i].slice(0, 2);
    paths.push(parts[i].slice(3));
    if (status.includes('R') || status.includes('C')) { paths.push(parts[i + 1]); i += 1; }
  }
  return paths.filter((p) => !ignore.some((prefix) => p === prefix || p.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)));
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') { re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += glob[i + 2] === '/' ? 2 : 1; }
    else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

// ---------- assertions ----------

// Counts distinct questions: sentence-ending question marks outside code. A question that is
// repeated verbatim (some harnesses print a final message twice) counts once.
function questionCount(text) {
  let fenced = false;
  const questions = new Set();
  for (const raw of text.split('\n')) {
    if (/^\s*```/.test(raw)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const prose = raw.replace(/`[^`]*`/g, '`code`');
    for (const m of prose.matchAll(/[^.!?]*\?+(?=[\s*_)\]"'”’]|$)/g)) {
      questions.add(m[0].replace(/[*_\s]+/g, ' ').trim().toLowerCase());
    }
  }
  return questions.size;
}

function pickTurns(outputs, which = 'all') {
  if (which === 'last') return outputs.slice(-1);
  if (which === 'first') return outputs.slice(0, 1);
  if (typeof which === 'number') return outputs.slice(which - 1, which);
  return outputs;
}

function describe(a) {
  const target = a.path ?? (a.transcript !== undefined ? `transcript(${a.transcript})` : a.pattern ?? a.run ?? a.heading ?? '');
  const extra = a.pattern && a.path ? ` /${a.pattern}/` : a.pattern && a.transcript !== undefined ? ` /${a.pattern}/` : '';
  const key = a.key ? ` ${a.key}` : '';
  return `${a.type} ${target}${key}${extra}`.trim();
}

async function check(a, ctx) {
  const full = (p) => join(ctx.dir, p);
  const readText = (p) => (existsSync(full(p)) && statSync(full(p)).isFile() ? readFileSync(full(p), 'utf8') : null);
  const regex = () => new RegExp(a.pattern, a.flags ?? 'im');
  switch (a.type) {
    case 'file-exists': return existsSync(full(a.path)) || 'file does not exist';
    case 'file-absent': return !existsSync(full(a.path)) || 'file exists';
    case 'glob-exists': {
      const re = globToRegExp(a.pattern);
      const n = walk(ctx.dir, { skip: (r) => r === '.git' || r === ctx.skillsDir || r === 'node_modules' }).filter((p) => re.test(p)).length;
      return n >= (a.min ?? 1) || `${n} matching file(s)`;
    }
    case 'file-unchanged': {
      const before = ctx.initial.get(toPosix(a.path));
      const exists = existsSync(full(a.path));
      if (!before) return !exists || 'file was created';
      return (exists && hashFile(full(a.path)) === before) || (exists ? 'file changed' : 'file was deleted');
    }
    case 'frontmatter': {
      const text = readText(a.path);
      if (text === null) return 'not' in a ? true : 'file does not exist';
      let data;
      try { ({ data } = parseFrontmatter(text)); } catch (err) { return `invalid frontmatter: ${err.message}`; }
      const value = data?.[a.key];
      if ('equals' in a) return String(value) === String(a.equals) || `${a.key} is ${JSON.stringify(value)}`;
      if ('not' in a) return String(value) !== String(a.not) || `${a.key} is ${JSON.stringify(value)}`;
      if ('pattern' in a) return (value !== undefined && regex().test(String(value))) || `${a.key} is ${JSON.stringify(value)}`;
      return value !== undefined || `${a.key} is missing`;
    }
    case 'contains':
    case 'not-contains': {
      let text;
      if (a.transcript !== undefined) text = pickTurns(ctx.outputs, a.transcript).join('\n');
      else text = readText(a.path);
      if (text === null) return a.type === 'not-contains' ? true : 'file does not exist';
      const found = regex().test(text);
      return a.type === 'contains' ? found || 'pattern not found' : !found || 'pattern found';
    }
    case 'section-count': {
      const text = readText(a.path) ?? '';
      const n = text.split(/\r?\n/).filter((l) => l.trim() === a.heading).length;
      return n === a.count || `${n} section(s)`;
    }
    case 'line-count-max': {
      const text = readText(a.path);
      if (text === null) return 'file does not exist';
      const n = text.replace(/\n+$/, '').split('\n').length;
      return n <= a.max || `${n} lines`;
    }
    case 'question-count': {
      const turns = pickTurns(ctx.outputs, a.turns ?? 'all');
      if (!turns.length) return 'no turns';
      for (const [i, t] of turns.entries()) {
        const n = questionCount(t);
        if (a.max !== undefined && n > a.max) return `turn ${i + 1} of selection asks ${n} questions`;
        if (a.min !== undefined && n < a.min) return `turn ${i + 1} of selection asks ${n} questions`;
      }
      return true;
    }
    case 'command': {
      // {check} is myRPI's suite check of the fixture's installed suite: the suite holds no scripts.
      const line = a.run.replaceAll('{check}', `node "${checkSuiteScript}" --suite ${ctx.skillsDir}`).replaceAll('{suite}', ctx.skillsDir);
      const r = await runShell(line, { cwd: ctx.dir, timeoutMs: 300_000 });
      const expected = a.exit ?? 0;
      return r.code === expected || `exit ${r.code}: ${(r.stdout + r.stderr).trim().split('\n').slice(-3).join(' / ')}`;
    }
    case 'verification': {
      const { section } = loadConfig(ctx.dir);
      const commands = section.config?.verification?.full;
      if (!Array.isArray(commands) || !commands.length) return 'fixture has no configured full verification';
      for (const line of commands) {
        const r = await runShell(line, { cwd: ctx.dir, timeoutMs: 600_000 });
        if (r.code !== 0) return `"${line}" exit ${r.code}`;
      }
      return true;
    }
    case 'git': {
      if (a.commits !== undefined) {
        const n = Number((await git(ctx.dir, ['rev-list', '--count', '--all'])).trim());
        return n === a.commits || `${n} commit(s)`;
      }
      if (a.branch_unchanged) {
        const branch = (await git(ctx.dir, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
        const branches = (await git(ctx.dir, ['branch', '--list'])).trim();
        return (branch === ctx.git.branch && branches === ctx.git.branches) || `branch is ${branch}; branches: ${branches.replace(/\s+/g, ' ')}`;
      }
      return 'git assertion needs commits or branch_unchanged';
    }
    case 'git-clean': {
      const changed = await changedPaths(ctx.dir, ctx.ignore);
      return changed.length === 0 || `changed: ${changed.slice(0, 5).join(', ')}`;
    }
    case 'changes-within': {
      const changed = await changedPaths(ctx.dir, ctx.ignore);
      const outside = changed.filter((p) => !a.paths.some((allowed) => p === allowed || (allowed.endsWith('/') && p.startsWith(allowed))));
      return outside.length === 0 || `changed outside scope: ${outside.slice(0, 5).join(', ')}`;
    }
    default: return `unknown assertion type ${a.type}`;
  }
}

async function evaluate(list, ctx) {
  for (const a of list) {
    let outcome;
    try { outcome = await check(a, ctx); } catch (err) { outcome = err.message; }
    if (outcome !== true) return { ok: false, detail: `${describe(a)}: ${outcome}` };
  }
  return { ok: true, detail: '' };
}

// ---------- harness turns ----------

function harnessEnv(harness) {
  const env = { ...process.env };
  for (const pattern of harness.env_unset ?? []) {
    const re = globToRegExp(pattern);
    for (const key of Object.keys(env)) if (re.test(key)) delete env[key];
  }
  return env;
}

async function runCase(testCase, harness, opts) {
  const started = Date.now();
  const dir = mkdtempSync(join(opts.tmp, 'rpi-eval-'));
  if (isInside(dir, opts.repo)) throw new Error(`fixture ${dir} is inside the project`);
  const transcript = [`# ${testCase.id} ${testCase.title} — ${harness.name}`, '', `Fixture: ${dir}`, ''];
  const result = { id: testCase.id, title: testCase.title, harness: harness.name, ok: false, detail: '', turns: 0, seconds: 0 };
  try {
    buildFixture(dir, testCase, opts.suiteDir, opts.skillsDir, opts.fixturesDir);
    const gitState = await initRepo(dir);
    const ctx = { dir, skillsDir: opts.skillsDir, initial: snapshot(dir), outputs: [], git: gitState, ignore: opts.ignore };

    const disableArgs = [];
    for (const capability of testCase.disable ?? []) {
      const args = harness.disable?.[capability];
      if (args === undefined) throw new Error(`harness ${harness.name} cannot disable capability ${capability} (add disable.${capability})`);
      disableArgs.push(...tokenize(String(args)));
    }
    const env = harnessEnv(harness);
    const timeoutMs = (harness.timeout_s ?? DEFAULT_TIMEOUT_S) * 1000;
    let session = null;
    let started2 = false;

    const send = async (message) => {
      const usesSession = /\{session\}/.test(harness.start);
      if (!started2) session = usesSession ? randomUUID() : null;
      const template = started2 ? harness.resume : harness.start;
      const words = [...substitute(tokenize(template), { prompt: message, session: session ?? '' }), ...disableArgs];
      started2 = true;
      const t0 = Date.now();
      const r = await run(words, { cwd: dir, env, timeoutMs });
      if (!usesSession && harness.session && !session) {
        const m = r.stdout.match(new RegExp(harness.session));
        if (m) session = m[1];
      }
      ctx.outputs.push(r.stdout);
      result.turns += 1;
      transcript.push(`## Turn ${result.turns} (${Math.round((Date.now() - t0) / 1000)}s, exit ${r.code}${r.timedOut ? ', timed out' : ''})`, '', '**User:**', '', message, '', '**Agent:**', '', r.stdout.trim(), '');
      if (r.stderr.trim()) transcript.push('<details><summary>stderr</summary>', '', '```text', r.stderr.trim().slice(-4000), '```', '', '</details>', '');
      if (r.timedOut) throw new Error(`turn ${result.turns} timed out after ${timeoutMs / 1000}s`);
      if (r.code !== 0) throw new Error(`turn ${result.turns}: harness exited with code ${r.code}: ${r.stderr.trim().split('\n').slice(-2).join(' / ')}`);
    };

    for (const turn of testCase.turns) {
      if (turn.new_session) started2 = false;
      if (turn.say !== undefined) {
        await send(turn.say);
      } else if (turn.repeat !== undefined) {
        for (let i = 0; i < (turn.max ?? 3); i += 1) {
          if (turn.until?.length && (await evaluate(turn.until, ctx)).ok) break;
          await send(turn.repeat);
        }
      }
    }
    const outcome = await evaluate(testCase.assert ?? [], ctx);
    result.ok = outcome.ok;
    result.detail = outcome.detail;
  } catch (err) {
    result.ok = false;
    result.detail = `error: ${err.message}`;
  } finally {
    result.seconds = Math.round((Date.now() - started) / 1000);
    transcript.push(`## Result: ${result.ok ? 'pass' : `FAIL: ${result.detail}`}`, '');
    writeFileSync(join(opts.runDir, `${testCase.id}-${harness.name}.md`), transcript.join('\n'));
    if (!opts.keep) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
  return result;
}

// ---------- report ----------

const MARKER = /<!-- rpi-eval-results ([\s\S]*?) -->/;

function readPrevious(path) {
  if (!existsSync(path)) return {};
  const m = readFileSync(path, 'utf8').match(MARKER);
  try { return m ? JSON.parse(m[1]) : {}; } catch { return {}; }
}

function writeReport(path, { results, cases, harnessNames, suiteVersion, versions }) {
  const cell = (r) => (!r ? 'not run' : r.ok ? 'pass' : `FAIL: ${r.detail}`.replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 300));
  const lines = [
    '# Agent eval results',
    '',
    'Generated by the rpi-workflow eval runner. Each cell is the latest result of that case in that harness.',
    '',
    `- Suite version: ${suiteVersion}`,
    `- Harnesses: ${harnessNames.map((h) => `${h} (${versions[h] ?? 'version unknown'})`).join('; ')}`,
    `- Last run: ${new Date().toISOString()}`,
  ];
  const total = cases.length * harnessNames.length;
  const passed = cases.reduce((n, c) => n + harnessNames.filter((h) => results[`${c.id}|${h}`]?.ok).length, 0);
  lines.push(`- Passing: ${passed} of ${total}`, '', `| Case | Title | ${harnessNames.join(' | ')} |`, `|---|---|${harnessNames.map(() => '---').join('|')}|`);
  for (const c of cases) lines.push(`| ${c.id} | ${c.title} | ${harnessNames.map((h) => cell(results[`${c.id}|${h}`])).join(' | ')} |`);
  lines.push('', `<!-- rpi-eval-results ${JSON.stringify(results)} -->`, '');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n'));
}

// ---------- main ----------

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (err) { die(err.message); }
  const repo = resolve(args.repo);
  const suiteDir = args.suite ?? thisSuiteDir;
  const { section } = loadConfig(repo);
  const evals = section.config?.agent_evals;
  const harnesses = Array.isArray(evals?.harnesses) ? evals.harnesses : [];
  if (!harnesses.length) {
    die('No agent eval harness is configured. Add agent_evals.harnesses to the "Feature workflow" section of AGENTS_APP.md (see test/README.md).');
  }
  for (const h of harnesses) if (!h.name || !h.start || !h.resume) die(`Harness ${h.name ?? '(unnamed)'} needs name, start, and resume.`);

  const tmp = resolve(tmpdir());
  if (isInside(tmp, repo)) die(`The temporary location ${tmp} is inside the project; fixtures must be created outside the project.`);

  let cases = loadCases(args.casesDir);
  if (args.list) { for (const c of cases) console.log(`${c.id}  ${c.title}`); return 0; }
  if (args.cases.length) cases = cases.filter((c) => args.cases.some((sel) => c.id === sel || c.title.toLowerCase().includes(sel.toLowerCase())));
  const selected = args.harnesses.length ? harnesses.filter((h) => args.harnesses.includes(h.name)) : harnesses;
  if (!cases.length) die('No eval case matches the selection.');
  if (!selected.length) die('No configured harness matches the selection.');

  const reportPath = resolve(repo, args.report ?? evals.report ?? 'agent-eval-results.md');
  const runDir = join(tmp, 'rpi-eval-runs', new Date().toISOString().replace(/[:.]/g, '-'));
  mkdirSync(runDir, { recursive: true });
  const versions = {};
  for (const h of selected) {
    if (!h.version) continue;
    const r = await run(tokenize(h.version), { env: harnessEnv(h), timeoutMs: 60_000 });
    versions[h.name] = r.stdout.trim().split('\n')[0] || undefined;
  }
  const previous = args.fresh ? {} : readPrevious(reportPath);
  const opts = { repo, suiteDir, fixturesDir: args.fixturesDir, tmp, runDir, keep: args.keep, skillsDir: evals.skills_dir ?? DEFAULT_SKILLS_DIR, ignore: evals.ignore ?? [] };

  const jobs = [];
  for (const c of cases) for (const h of selected) jobs.push([c, h]);
  console.log(`Running ${cases.length} case(s) in ${selected.length} harness(es), ${args.jobs} at a time. Transcripts: ${runDir}`);
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const [c, h] = jobs[next++];
      const r = await runCase(c, h, opts);
      results.push(r);
      console.log(`${r.ok ? 'pass' : 'FAIL'}  ${c.id} ${h.name} (${r.turns} turn(s), ${r.seconds}s)${r.ok ? '' : `  ${r.detail}`}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(args.jobs, jobs.length) }, worker));

  const merged = { ...previous };
  const date = new Date().toISOString();
  for (const r of results) merged[`${r.id}|${r.harness}`] = { ok: r.ok, detail: r.detail, date };
  const allCases = loadCases(args.casesDir);
  const known = new Set(allCases.map((c) => c.id));
  for (const key of Object.keys(merged)) if (!known.has(key.split('|')[0])) delete merged[key];
  const harnessNames = harnesses.map((h) => h.name).filter((n) => selected.some((s) => s.name === n) || Object.keys(merged).some((k) => k.endsWith(`|${n}`)));
  const suiteVersion = parseFrontmatter(readFileSync(join(suiteDir, 'rpi-workflow', 'SKILL.md'), 'utf8')).data?.metadata?.version ?? 'unknown';
  writeReport(reportPath, { results: merged, cases: allCases, harnessNames, suiteVersion, versions });

  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed} passed, ${failed} failed. Report: ${reportPath}`);
  return failed ? 1 : 0;
}

main().then((code) => process.exit(code), (err) => die(err.stack ?? String(err)));
