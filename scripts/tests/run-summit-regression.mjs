// Runs the Summit's behaviour checks and the switch test; exits 1 if either fails. Usage: node scripts/tests/run-summit-regression.mjs [base]
import { spawnSync } from 'node:child_process';
const base = process.argv[2] || 'http://127.0.0.1:5173';
const run = (file) => spawnSync(process.execPath, [file, base], { stdio: 'pipe', encoding: 'utf8' });
const b = run('scripts/tests/summit-behaviour.mjs'); process.stdout.write(b.stdout);
const s = run('scripts/perf/switch-test.mjs'); process.stdout.write(s.stdout);
const stalls = [...s.stdout.matchAll(/│\s*\d+\s*│[^\n]*?│\s*(\d+)\s*│\s*(\d+)\s*│\s*$/gm)].map((m) => Number(m[1]));
const switchOk = s.status === 0 && stalls.length >= 5 && stalls.every((n) => n === 0);
console.log(`behaviour: ${b.status === 0 ? 'PASS' : 'FAIL'} · switch freezes: ${switchOk ? 'PASS' : 'FAIL'} (${stalls.join(',')})`);
process.exit(b.status === 0 && switchOk ? 0 : 1);
