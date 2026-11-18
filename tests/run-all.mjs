// Runs every test suite in the repository: `npm test` from the root.
// Set CHROMIUM_PATH to reuse a local Chromium for the browser checks.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const suites = [
  ...fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.mjs') && f !== 'run-all.mjs').sort()
    .map(f => ({name: 'tests/' + f, cmd: 'node', args: ['tests/' + f], cwd: root})),
  {name: 'desktop (npm test)', cmd: 'npm', args: ['test', '--silent'], cwd: path.join(root, 'desktop')},
  ...['tools/releases', 'tools/security', 'tools/operations'].map(dir =>
    ({name: dir + ' (python)', cmd: 'python3', args: ['-m', 'unittest', 'discover', '-s', dir, '-p', 'test_*.py'], cwd: root})),
];
const failed = [];
for (const suite of suites) {
  const started = Date.now();
  const result = spawnSync(suite.cmd, suite.args, {cwd: suite.cwd, encoding: 'utf8', env: process.env});
  const ok = result.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${suite.name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  if (!ok) {
    failed.push(suite.name);
    process.stdout.write((result.stdout || '').slice(-2000) + (result.stderr || '').slice(-2000) + '\n');
  }
}
console.log(failed.length ? `\n${failed.length} of ${suites.length} suites failed: ${failed.join(', ')}` : `\nAll ${suites.length} suites passed.`);
process.exit(failed.length ? 1 : 0);
