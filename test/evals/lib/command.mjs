// Command templates from configuration: tokenizing, placeholder substitution, and spawning
// without a shell (Windows batch shims are run through cmd.exe with escaped arguments).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, extname, isAbsolute, join } from 'node:path';

// Splits a template into words; single or double quotes group words. Backslashes are literal.
export function tokenize(template) {
  const words = [];
  let current = '';
  let quote = null;
  let started = false;
  for (const ch of template) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || current) words.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
    }
  }
  if (quote) throw new Error(`unterminated quote in command template: ${template}`);
  if (started || current) words.push(current);
  return words;
}

// Replaces {name} placeholders inside each word.
export function substitute(words, values) {
  return words.map((w) => w.replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m)));
}

function resolveExecutable(command, env) {
  if (process.platform !== 'win32') return command;
  if (isAbsolute(command) || command.includes('/') || command.includes('\\')) return command;
  const exts = extname(command) ? [''] : (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';');
  for (const dir of (env.PATH ?? env.Path ?? '').split(delimiter)) {
    for (const ext of exts) {
      const candidate = join(dir, command + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return command;
}

// cmd.exe escaping as used for npm-style batch shims, which re-parse their arguments.
const META = /([()\][%!^"`<>&|;, *?])/g;
function escapeForCmd(arg) {
  let s = `${arg}`.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"').replace(/(?=(\\+?)?)\1$/, '$1$1');
  s = `"${s}"`.replace(META, '^$1');
  return s.replace(META, '^$1');
}

const comspec = (env) => env.ComSpec ?? env.COMSPEC ?? 'cmd.exe';

function prepare(words, env) {
  const [command, ...args] = words;
  const exe = resolveExecutable(command, env);
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(exe)) {
    const line = [exe.replace(META, '^$1'), ...args.map(escapeForCmd)].join(' ');
    return { file: comspec(env), args: ['/d', '/s', '/c', `"${line}"`], verbatim: true };
  }
  return { file: exe, args, verbatim: false };
}

function killTree(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
}

// Runs words[0] with words[1..]; resolves { code, stdout, stderr, timedOut }.
export function run(words, options = {}) {
  return spawnPrepared(prepare(words, options.env ?? process.env), options);
}

// Runs a shell command line (used for configured verification and case "command" assertions).
export function runShell(line, options = {}) {
  const env = options.env ?? process.env;
  const prepared = process.platform === 'win32'
    ? { file: comspec(env), args: ['/d', '/s', '/c', `"${line}"`], verbatim: true }
    : { file: '/bin/sh', args: ['-c', line], verbatim: false };
  return spawnPrepared(prepared, options);
}

function spawnPrepared({ file, args, verbatim }, { cwd, env = process.env, timeoutMs = 0, input } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(file, args, { cwd, env, windowsVerbatimArguments: verbatim, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = timeoutMs ? setTimeout(() => { timedOut = true; killTree(child); }, timeoutMs) : null;
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolvePromise({ code: 127, stdout, stderr: `${stderr}${err.message}`, timedOut });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolvePromise({ code: code ?? 1, stdout, stderr, timedOut });
    });
    child.stdin.end(input ?? '');
  });
}
