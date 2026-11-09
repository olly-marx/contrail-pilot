// Every row of tools/plants.tsv must still APPLY (2026-11-09; the game chat's dry check found 2 rows that changed nothing on main, the 11-07 audit found 3 more).
// A planted defect only protects us if its sed expression still matches the code; a row whose pattern no longer matches proves nothing and used to be found only
// when someone ran `DRY=1 tools/prove-plants.sh`. This runs in the Node tier (about 1 s, no browser, no working-tree edits: the expression is applied to a
// copy of the file's text through stdin) and fails by name: "plant row N (file, label) applies to nothing: the code moved".
// A row changes ONE line unless its label ends with [xN] (the count is then pinned; the 2026-11-09 measurement: 444 rows change 1 line, 8 change 2, one changes 18).
// What it does NOT check: that the test catches the plant (tools/prove-plants.sh does, and the release gate runs it for changed rows), or the file->test route
// (tools/gate-plan.py --lint does).
// PLANTS: the checker is tested on a built-in table with one live and one dead row (a checker that passes everything fails here). Run: node tests/plantsapply.cjs
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.resolve(__dirname, '..');

// Lines a sed expression changes: the larger of the added and removed line counts of `diff` (the way tools/prove-plants.sh reports 'N line(s) changed').
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plantsapply-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
function changedLines(a, b) {
  fs.writeFileSync(path.join(tmp, 'a'), a); fs.writeFileSync(path.join(tmp, 'b'), b);
  const d = spawnSync('diff', [path.join(tmp, 'a'), path.join(tmp, 'b')], { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout.split('\n');
  return Math.max(d.filter(l => l.startsWith('>')).length, d.filter(l => l.startsWith('<')).length);
}

// rows: the text of a plants table. Returns the problems, one string each. ENV plants (file '-') change no file and are skipped.
function deadRows(tsv, readFile) {
  const out = [];
  tsv.split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const [test, file, expr, ...rest] = line.split('\t'), label = rest.join('\t'), n = i + 1;
    if (file === '-' || file === undefined) return;
    if (!expr) { out.push(`plant row ${n} (${file}, ${label || test}) has no sed expression`); return; }
    const declared = (/\[x(\d+)\]\s*$/.exec(label) || [])[1]; let total = 0, rowOk = true;
    for (const f of file.split(',')) {
      let text; try { text = readFile(f); } catch (e) { rowOk = false; out.push(`plant row ${n} (${f}, ${label}) names a file that does not exist: the file moved`); continue; }
      const r = spawnSync('sed', [expr], { input: text, encoding: 'utf8', maxBuffer: 1 << 28 });
      if (r.status !== 0) { rowOk = false; out.push(`plant row ${n} (${f}, ${label}) has a sed expression that sed rejects: ${String(r.stderr).trim().slice(0, 100)}`); }
      else if (r.stdout === text) { rowOk = false; out.push(`plant row ${n} (${f}, ${label}) applies to nothing: the code moved`); }
      else total += changedLines(text, r.stdout);
    }
    // A plant changes exactly one line unless its label declares the count with [xN] (then the count is pinned): a pattern that starts matching a second place is a different plant.
    const want = declared === undefined ? 1 : Number(declared);
    if (rowOk && total !== want) out.push(`plant row ${n} (${file}, ${label}) changes ${total} line(s) but ${declared === undefined ? 'declares none (one is the default)' : 'declares [x' + want + ']'}: the pattern moved; if ${total} is intended, end the label with [x${total}]`);
  });
  return out;
}

const fails = [], check = (c, m) => { if (!c) fails.push(m); };
// 1. The checker itself: a built-in table with a live row, a dead row, a missing file and a bad expression.
const fake = { 'a.js': 'let x = 1;\nlet y = 2;\n', 'b.js': 'a\na\na\n' };
const table = [
  'sometest\ta.js\ts/let x = 1;/let x = 0;/\tlive row',
  'sometest\ta.js\ts/let z = 9;/let z = 0;/\tdead row (pattern matches nothing)',
  'sometest\tgone.js\ts/a/b/\tmissing file',
  'sometest\ta.js\ts/let x/\tbroken expression (unterminated s command)',
  'sometest\tb.js\ts/a/b/\tthree lines, no count declared',
  'sometest\tb.js\ts/a/b/\tthree lines, declared [x3]',
  'sometest\tb.js\ts/a/b/\tthree lines, wrong count [x2]',
  'sometest\t-\t\tenv plant (skipped)',
  '# a comment',
].join('\n');
const got = deadRows(table, f => { if (fake[f] === undefined) throw new Error('nope'); return fake[f]; });
check(got.length === 5, `the checker flags exactly: the dead row, the missing file, the broken expression, the undeclared multi-line row and the wrong count (got ${got.length}: ${got.join(' | ')})`);
check(got.some(g => /row 5 .*changes 3 line\(s\) but declares none/.test(g)) && got.some(g => /row 7 .*changes 3 line\(s\) but declares \[x2\]/.test(g)) && !got.some(g => /row 6 /.test(g)), `a multi-line row needs its declared [xN]: undeclared and wrong counts are flagged, the right one is not (got: ${got.join(' | ')})`);
check(got.some(g => /^plant row 2 \(a\.js, dead row.*\) applies to nothing: the code moved$/.test(g)), `the checker names the dead row by line number and says the code moved (got: ${got.join(' | ')})`);
check(got.some(g => /^plant row 4 .*has a sed expression that sed rejects/.test(g)), `a sed expression that sed rejects is named as such (got: ${got.join(' | ')})`);
check(!got.some(g => /row 1 /.test(g)), 'the checker does not flag a live row');
// 2. The real table.
const real = deadRows(fs.readFileSync(path.join(root, 'tools/plants.tsv'), 'utf8'), f => fs.readFileSync(path.join(root, f), 'utf8'));
for (const p of real) fails.push(p);

if (fails.length) { console.log('FAIL plantsapply:\n' + fails.map(f => ' - ' + f).join('\n')); process.exit(1); }
console.log(`PASS plantsapply (every row of tools/plants.tsv still changes exactly its declared number of lines; the checker flags a dead row, a missing file, a broken expression and a wrong line count)`);
