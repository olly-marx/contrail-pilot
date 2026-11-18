// Every relative module URL in the DEPLOYED site carries the build stamp (0.67.1 hotfix, 2026-11-18).
// Why: tools/make-site.sh stamped only "from './name.js'" in src/*.js. './sim/rules.js', '../config.js', './missions2.js' and the
// dynamic/worker imports kept bare URLs, so a phone that updated could run the new src/GameScene.js?v=<new> with the OLD src/sim/rules.js
// (old service-worker cache or the 10-minute HTTP cache): 0.67.0 crashed on start with "this.rollDistance is not a function".
// This test builds the real site (the same script CI deploys) and checks: (1) no relative module specifier in src/** lacks ?v=<build>;
// (2) every stamped specifier points at a file that exists; (3) the specific imports of the crash are stamped.
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..'), B = 'tst1234';
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'stamps-'));
const fails = [];
try {
  execFileSync('bash', [path.join(ROOT, 'tools/make-site.sh'), out, B], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  const files = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
  walk(path.join(out, 'src'));
  const SPEC = /(?:\bfrom|\bimport|\bimport\(|\bURL\() *'(\.\.?\/[^']+)'/g;
  let n = 0;
  for (const f of files) {
    const rel = path.relative(out, f), src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(SPEC)) {
      const s = m[1]; if (!/\.js(\?|$)/.test(s)) continue; n++;
      if (!s.endsWith('?v=' + B)) { fails.push(`${rel}: unstamped import '${s}'`); continue; }
      const target = path.resolve(path.dirname(f), s.slice(0, -('?v=' + B).length));
      if (!fs.existsSync(target)) fails.push(`${rel}: stamped import '${s}' points at a missing file`);
    }
  }
  const must = { 'src/GameScene.js': ["./sim/rules.js?v=" + B, "./missions2.js?v=" + B], 'src/sim/rules.js': ["../config.js?v=" + B], 'src/capability.js': ["./sim/simulate.js?v=" + B, "./capworker.js?v=" + B] };
  for (const [f, list] of Object.entries(must)) { const s = fs.readFileSync(path.join(out, f), 'utf8'); for (const x of list) if (!s.includes(`'${x}'`)) fails.push(`${f}: missing '${x}'`); }
  if (n < 100) fails.push(`only ${n} relative imports found: the scan is broken`);
  console.log(`${files.length} files, ${n} relative imports checked`);
} finally { fs.rmSync(out, { recursive: true, force: true }); }
if (fails.length) { console.log(fails.slice(0, 20).map(x => '- ' + x).join('\n') + (fails.length > 20 ? `\n- ... ${fails.length - 20} more` : '')); process.exit(1); }
console.log('PASS: every relative module URL in the built site carries the build stamp');
