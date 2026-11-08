// The P1 celebration cues are called where their event happens (research/SOUND-DESIGN.md section 2, release B). Plain Node, reads the sources, ~0.1 s. A cue nobody calls is silence; a
// cue on the wrong site is a wrong sound. Each pair is DECLARED here (event -> file and cue). Positive control: an event with NO cue declared (the plain buy tap) is not asserted, and a
// source that lacks the call fails by name. Browser counting (each fires once per event) is a separate machine check. Plants: tools/plants.tsv (test cuesites).
const fs = require('fs'), path = require('path');
const SITES = [
  ['a new part arrives on the plane (the payoff)', 'src/hangar.js', 'sfx.reveal'],
  ['a new era opens', 'src/welcome.js', 'sfx.era'],
  ['a nature project is funded', 'src/wild.js', 'sfx.grow'],
  ['a mission is done (results card)', 'src/ui.js', 'sfx.done'],
  ['a badge is earned (results chips)', 'src/ui.js', 'sfx.medal'],
  ['a crossing lands', 'src/ui.js', 'sfx.welcome'],
  ['a crossing is lost', 'src/ui.js', 'sfx.softfail'],
];
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const sound = fs.readFileSync(path.join(__dirname, '../src/sound.js'), 'utf8');
for (const [ev, file, call] of SITES) {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  check(src.includes(call), `${ev}: ${file} calls ${call}`);
  check(new RegExp(`^\\s+${call.split('.')[1]}:`, 'm').test(sound), `${ev}: the cue '${call.split('.')[1]}' exists in src/sound.js`);
}
const hang = fs.readFileSync(path.join(__dirname, '../src/hangar.js'), 'utf8');
check(/sfx\.buy\(\); this\.ui\.renderHangar\(\)/.test(hang), 'POSITIVE CONTROL: the purchase tap itself still plays the plain buy (the reveal is a second, different sound)');
console.log(fails.length ? 'FAIL cuesites:\n - ' + fails.join('\n - ') : `PASS cuesites (${SITES.length} events call their cue)`);
process.exit(fails.length ? 1 : 0);
