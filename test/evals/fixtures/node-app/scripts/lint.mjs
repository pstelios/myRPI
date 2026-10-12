// Minimal lint: source and test files must not contain console.log or trailing whitespace.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
for (const dir of ['src', 'test']) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) {
    const text = readFileSync(join(dir, file), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/console\.log/.test(line) || /[ \t]+$/.test(line)) {
        console.error(`${dir}/${file}:${i + 1} lint error`);
        failures += 1;
      }
    });
  }
}
process.exit(failures ? 1 : 0);
