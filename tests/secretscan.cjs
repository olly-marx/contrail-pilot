// THE TRIPWIRE (the Coordinator, 2026-11-10; a real pilot code and a tester's first name once reached this PUBLIC repo in comments and test data). Plain Node: every tracked TEXT file is scanned for (1) the SHAPE of a pilot code: four words
// from the game's NAME_WORDS in a row, then a number 10 to 99 (src/online.js makeCode; case-insensitive, words joined by a space or a hyphen) and (2) a tester's first name. Only the declared allow-list passes: fake codes in tests and the
// example in the placeholder, each pinned to its FILE and its exact string; an allowance nothing uses any more is itself a failure. Only the current tree is scanned (not history). Plants: tools/plants.tsv, test `secretscan`.
// NEVER write a pilot code, token or key into a repo file or a message, not even a real-looking one. Run: node tests/secretscan.cjs
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
// Clearly fake codes that tests and the placeholder use (file + exact lower-case string).
const ALLOW = [
  { file: 'index.html', code: 'otter comet robin hare 42' },
  { file: 'supabase/tests/online_save.sql', code: 'otter comet robin hare 77' },
  { file: 'supabase/tests/online_save.sql', code: 'otter comet robin hare 11' },
  { file: 'tests/onlinesave.cjs', code: 'puffin puffin puffin puffin 11' },
  { file: 'tests/pilotcode.cjs', code: 'owl fox hare cloud 42' },
];
const NAMES = [['l', 'ola'].join('')];   // the tester's first name, built from parts so that this file does not hold it
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const src = fs.readFileSync(path.join(root, 'src/online.js'), 'utf8'), m = /NAME_WORDS\s*=\s*\[(.*?)\]/s.exec(src);
const words = m ? [...m[1].matchAll(/'([A-Za-z]+)'/g)].map(x => x[1].toLowerCase()) : [];
check(words.length >= 20, `power: ${words.length} NAME_WORDS read from src/online.js (a scan with no words proves nothing)`);
const alt = words.join('|'), codeRx = new RegExp(`\\b(?:${alt})(?:[ -](?:${alt})){3}[ -]?[1-9][0-9]\\b`, 'gi'), nameRx = new RegExp(`\\b(?:${NAMES.join('|')})`, 'i');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const used = new Set(); let scanned = 0, bytes = 0;
for (const f of files) {
  if (f === 'tests/secretscan.cjs') continue;   // (this file holds the declared fake codes: it is the allow-list)
  let buf; try { buf = fs.readFileSync(path.join(root, f)); } catch (e) { continue; }
  if (buf.length > 3e6 || buf.includes(0)) continue;   // binary or huge: not text
  const text = buf.toString('utf8'); scanned++; bytes += buf.length;
  for (const mm of text.matchAll(codeRx)) {
    const code = mm[0].toLowerCase().replace(/-/g, ' '), ok = ALLOW.findIndex(a => a.file === f && a.code === code);
    if (ok >= 0) used.add(ok); else check(false, `${f}: a pilot-code-shaped string "${mm[0].slice(0, 4)}..." (four NAME_WORDS and a number): never write a pilot code into a repo file; if it is a clearly fake test code, declare it in tests/secretscan.cjs ALLOW`);
  }
  if (nameRx.test(text)) check(false, `${f}: a tester's first name is in a tracked file; say 'a tester'`);
}
ALLOW.forEach((a, i) => check(used.has(i), `allow-list entry ${a.file} "${a.code}" matches nothing any more: remove it (an unused allowance hides a future leak)`));
check(scanned > 300 && bytes > 2e6, `power: ${scanned} text files, ${bytes} bytes scanned (a scan of nothing proves nothing)`);
console.log(fails.length ? `FAIL secretscan:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : `PASS secretscan: ${scanned} tracked text files hold no pilot-code-shaped string outside the ${ALLOW.length} declared fakes and no tester name`);
process.exit(fails.length ? 1 : 0);
