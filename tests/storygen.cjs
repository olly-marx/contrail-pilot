// THE STORY GENERATOR'S CHECK (tools/stories/validate.mjs; Plan A, 2026-11-24: stories have a difficulty). Plain Node, no API call.
// 1. Every handwritten theme in src/storyboard.js THEMES passes (the positive control: the check accepts what the game already ships).
// 2. Each broken theme is refused for its own reason: a level with the wrong number of stops, an unknown level, a placeholder past the
//    last stop, a story that names no stop, one line short, a picture that does not exist, an unknown area, a banned word, a storm
//    whose stops may be far apart (Oliver, 2026-11-25: not near: true), a generated story that does not say near.
// 3. The request the generator would send asks for every level and constrains `level` to LEVELS, and requires `near` (plan writes it; nothing is sent).
// Plants: tools/plants.tsv, test storygen. Run: node tests/storygen.cjs
(async () => {
  const { THEMES, LEVELS } = await import('../src/storyboard.js');
  const { validate } = await import('../tools/stories/validate.mjs');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const t of THEMES) { const w = validate(t); check(!w.length, `handwritten theme ${t.id} passes: ${w.join('; ')}`); }
  const ok = { id: 'ok-one', level: 'hard', stops: 3, title: 'Seeds for a meadow', story: 'Wildflower seeds from {0} are going to {1} and {2}.', lines: ['Seeds on board.', '{1} gets its seeds.', '{2} too!'], pic: 'story-crate', areas: ['africa'] };
  check(!validate(ok).length, `a good generated theme passes: ${validate(ok)}`);
  const bad = {
    'level stops': { level: 'easy' }, 'unknown level': { level: 'super' }, 'past the last stop': { story: 'From {0} to {1}, {2} and {3}.' },
    'no stop named': { story: 'Seeds are going to a meadow.' }, 'line short': { lines: ['a', 'b'] }, 'no picture': { pic: 'unicorn' },
    'unknown area': { areas: ['atlantis'] }, 'banned word': { story: 'A dangerous trip from {0} to {1} and {2}.' }, 'long title': { title: 'x'.repeat(40) },
    'a storm far apart': { story: 'A big storm passed. Tents from {0} go to {1} and {2}.', near: false }, 'generated, near unsaid': { source: 'claude-sonnet-5-5' },
  };
  for (const [name, patch] of Object.entries(bad)) check(validate({ ...ok, ...patch }).length > 0, `refused: ${name}`);
  const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'storygen-'));
  execFileSync(process.execPath, ['tools/stories/generate.mjs', 'plan', '--areas', 'africa', '--out', out], { cwd: path.join(__dirname, '..') });
  const req = JSON.parse(fs.readFileSync(path.join(out, 'requests.json'), 'utf8'))[0];
  const lv = req.params.output_config.format.schema.properties.themes.items.properties.level.enum;
  check(JSON.stringify(lv) === JSON.stringify(Object.keys(LEVELS)), `the schema's level is one of LEVELS: ${lv}`);
  const items = req.params.output_config.format.schema.properties.themes.items;
  check(items.required.includes('near') && items.properties.near.type === 'boolean', 'the schema requires near (one place or a tour)');
  check(Object.keys(LEVELS).every(k => req.params.messages[0].content.includes(k)) && req.params.model === 'claude-sonnet-5-5', 'the request asks for every level, on Claude Sonnet 5.5');
  fs.rmSync(out, { recursive: true, force: true });
  if (fails.length) { console.log('FAIL storygen\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS storygen (${THEMES.length} handwritten themes pass, ${Object.keys(bad).length} broken ones refused, the request asks for every level)`);
})();
