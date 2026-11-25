// Story THEME generator (the user, 2026-11-22: Claude-written stories, model Claude Sonnet 5.5 chosen by the user for cost against
// quality; 2026-11-24 Plan A: each story has a difficulty). Runs on a developer machine, NEVER in the game: the API key stays in
// the shell (ANTHROPIC_API_KEY, or a profile from `ant auth login`). Message Batches API (half price), structured output.
//
//   node tools/stories/generate.mjs plan    [--per 6] [--areas africa,sasia]   write the requests (no API call)
//   node tools/stories/generate.mjs count   [...]                              count input tokens (free) and price it
//   node tools/stories/generate.mjs submit  [...] --yes                        create the batch (COSTS MONEY)
//   node tools/stories/generate.mjs collect <batch id>                         fetch, validate, write the pool
//
// A request asks for `per` themes of EACH level (easy, medium, hard, impossible) for one area. A theme names no cities: the game
// picks the stops when it offers the story, sized for the pilot (src/storyboard.js makeOffer), so one theme serves every player.
// Output (default ~/Documents/contrail/scratch/stories, outside the repo): requests.json, pool-<batch>.json (themes that pass
// tools/stories/validate.mjs), rejected-<batch>.json (with reasons). Review the pool, then append the good ones to THEMES.
// Needs: npm i --no-save @anthropic-ai/sdk
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LEVELS } from '../../src/storyboard.js';
import { AREAS } from '../../src/areas.js';
import { validate, LIMITS, PICS, stopsFor } from './validate.mjs';

export const MODEL = 'claude-sonnet-5-5';
const PRICE = { input: 2.0, output: 10.0, batch: 0.5 };   // $ per million tokens, Claude Sonnet 5.5 list price; the Batch API halves both
const args = process.argv.slice(2), cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(opt('out', path.join(os.homedir(), 'Documents/contrail/scratch/stories')));
const PER = Number(opt('per', 3));
const areaList = (opt('areas', '') || '').split(',').filter(Boolean);

const levelText = Object.entries(LEVELS).map(([k, L]) => `- ${k}: ${stopsFor(k).join(' or ')} stops; ${L.hearts ? `${L.hearts} ${L.hearts === 1 ? 'life' : 'lives'}` : 'unlimited tries'}; stages ${Math.round(L.fit[0] * 100)}-${Math.round(L.fit[1] * 100)}% of the pilot's range`).join('\n');
const SYSTEM = `You write short story missions for Contrail Pilot, a pixel-art flying game for children aged 7 to 12 made with a university contrail research group. The player flies a plane between real airports, plants trees, and looks after nature.

A story is a real-world-style task: carry something useful from a pickup city to one or more other cities, for people or wildlife. Good stories are specific and kind: rangers need camera memory cards, a village needs a solar water pump, scientists count puffins. Keep every fact general and true (no numbers, dates, or names of real people or organisations). Never mention harm, danger, weapons, illness details, crashes or anything frightening. Plain words a 7-year-old can read.

You do NOT choose cities. Write {0} for the pickup city and {1}, {2}, {3} for the next stops in order; the game fills them in.

Each story has a difficulty, and the words should fit it:
${levelText}
Easy stories are short, friendly errands. Impossible stories are long, urgent journeys ("three long flights, no second chances") and should feel special.

Rules:
- title at most ${LIMITS.title} characters; story at most ${LIMITS.story} characters; name the pickup {0} and the last stop in it.
- lines: exactly one sentence per stop (at most ${LIMITS.line} characters each), shown when the plane lands there; the first is the pickup.
- pic: one of ${PICS.join(', ')}. Use an animal's picture only when the story is about that animal.
- areas: the area key given, so the story is set there.
- near: true when the stops after the pickup share ONE event or ONE place (a storm, a flood, a drought, an outbreak, reserves or villages
  near each other); the game then picks delivery cities close together, and the pickup may be far away. false for a journey or a tour
  (scientists on a tour, a migration route), where the cities may be far apart. A story about one storm or flood MUST be near: true.
- Never describe the places themselves (islands, mountains, the coast, the desert, cold or hot): the game picks the cities, so such words may be wrong.
- id: a short lower-case slug, unique in your answer.
- Every story must be different from the others: different cargo, different people or animals.`;

const schema = {
  type: 'object', additionalProperties: false, required: ['themes'],
  properties: { themes: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'level', 'stops', 'near', 'title', 'story', 'lines', 'pic'],
    properties: {
      id: { type: 'string' }, level: { type: 'string', enum: Object.keys(LEVELS) }, stops: { type: 'integer', enum: [2, 3, 4] }, near: { type: 'boolean' },
      title: { type: 'string' }, story: { type: 'string' }, lines: { type: 'array', items: { type: 'string' } }, pic: { type: 'string', enum: PICS },
    } } } },
};
function request(area) {
  const a = AREAS[area];
  const user = `Area: ${a.name} (key "${area}"). Its cities include ${a.cities.slice(0, 10).join(', ')}.
Write ${PER} stories of EACH difficulty (${Object.keys(LEVELS).join(', ')}): ${PER * Object.keys(LEVELS).length} stories in all, set in this area.`;
  return {
    custom_id: `themes-${area}`,
    params: { model: MODEL, max_tokens: 16000, system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: user }] },
  };
}
async function client() { const { default: Anthropic } = await import('@anthropic-ai/sdk'); return new Anthropic(); }

const areas = areaList.length ? areaList : Object.keys(AREAS);
fs.mkdirSync(OUT, { recursive: true });
if (cmd === 'plan' || cmd === 'count' || cmd === 'submit') {
  const reqs = areas.map(request);
  fs.writeFileSync(path.join(OUT, 'requests.json'), JSON.stringify(reqs, null, 1));
  console.log(`${reqs.length} requests (${PER * 4} themes each) written to ${OUT}/requests.json`);
  if (cmd === 'count') {
    const c = await client(); let input = 0;
    for (const r of reqs) { const { model, system, messages, output_config } = r.params; input += (await c.messages.countTokens({ model, system, messages, output_config })).input_tokens; }
    const outEst = reqs.length * PER * 4 * 250;   // an estimate: about 250 output tokens a theme
    console.log(`input ${input} tokens (counted), output about ${outEst} (estimated): about $${((input * PRICE.input + outEst * PRICE.output) / 1e6 * PRICE.batch).toFixed(2)} as a batch`);
  }
  if (cmd === 'submit') {
    if (!args.includes('--yes')) { console.log('Not submitted: add --yes (this spends money).'); process.exit(1); }
    const b = await (await client()).messages.batches.create({ requests: reqs });
    fs.writeFileSync(path.join(OUT, `batch-${b.id}.json`), JSON.stringify({ id: b.id, areas }));
    console.log(`batch ${b.id}: ${b.processing_status}. Collect with: node tools/stories/generate.mjs collect ${b.id}`);
  }
} else if (cmd === 'collect') {
  const id = args[1], c = await client(), b = await c.messages.batches.retrieve(id);
  if (b.processing_status !== 'ended') { console.log(`batch ${id}: ${b.processing_status}; try again later`); process.exit(0); }
  const good = [], bad = [], seen = new Set(); const usage = { input: 0, output: 0 };
  for await (const r of await c.messages.batches.results(id)) {   // (results come in any order: keyed by custom_id)
    const area = r.custom_id.replace(/^themes-/, '');
    if (r.result.type !== 'succeeded') { bad.push({ id: r.custom_id, why: [r.result.type] }); continue; }
    const msg = r.result.message; usage.input += msg.usage.input_tokens; usage.output += msg.usage.output_tokens;
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') { bad.push({ id: r.custom_id, why: [msg.stop_reason] }); continue; }
    let parsed; try { parsed = JSON.parse(msg.content.find(x => x.type === 'text').text); } catch (e) { bad.push({ id: r.custom_id, why: ['not JSON'] }); continue; }
    for (const t of parsed.themes || []) {
      const theme = { ...t, id: `ai-${area}-${t.id}`, areas: [area], source: MODEL };
      const why = validate(theme); if (seen.has(theme.id)) why.push('duplicate id'); seen.add(theme.id);
      (why.length ? bad : good).push(why.length ? { theme, why } : theme);
    }
  }
  fs.writeFileSync(path.join(OUT, `pool-${id}.json`), JSON.stringify(good, null, 1));
  fs.writeFileSync(path.join(OUT, `rejected-${id}.json`), JSON.stringify(bad, null, 1));
  console.log(`${good.length} themes passed, ${bad.length} rejected. ${usage.input} input + ${usage.output} output tokens: $${((usage.input * PRICE.input + usage.output * PRICE.output) / 1e6 * PRICE.batch).toFixed(2)} as a batch.`);
} else console.log('usage: plan | count | submit --yes | collect <batch id>   (see the top of this file)');
