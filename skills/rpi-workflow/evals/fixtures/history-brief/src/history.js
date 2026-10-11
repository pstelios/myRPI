import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILE = 'data/history.json';

// Greeting history is stored as a JSON array of names.
export function loadHistory() {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
}

export function recordGreeting(name) {
  const history = loadHistory();
  history.push(name);
  writeFileSync(FILE, JSON.stringify(history));
}
