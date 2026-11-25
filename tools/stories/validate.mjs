// Checks a story THEME (the record src/storyboard.js THEMES holds and tools/stories/generate.mjs asks Claude to write) before it can
// enter the game. Pure; returns a list of reasons (empty: valid). The handwritten THEMES must pass it too (tests/storygen.cjs).
// A theme names no cities: the game picks them when it makes an offer, so {0}..{n-1} stand for the stops (0 = the pickup).
import { LEVELS, STORY_PICS, THEMES } from '../../src/storyboard.js';
import { AREAS } from '../../src/areas.js';

export const LIMITS = { title: 32, story: 170, line: 90 };
export const PICS = [...new Set([...STORY_PICS, ...THEMES.map(t => t.pic)])];   // pictures that exist in assets/ui (portrait-<pic>-0.png)
// Words a children's story must not use (the generator's prompt says the same; this is the check, not the hope).
const BANNED = /\b(crash|crashes|crashed|die|dies|died|dead|death|kill|killed|blood|weapon|gun|bomb|war|danger|dangerous|disease|virus|sick|poison|hunt|hunter|poach|poacher|scary|terrible)\b/i;
// ONE EVENT (Oliver, 2026-11-25: a storm in London, Oslo and Papeete): a story about one storm, flood, fire or outbreak must keep its
// delivery stops together (near: true, src/storyboard.js NEAR_KM).
const ONE_EVENT = /\b(storm|storms|flood|floods|flooding|hurricane|cyclone|typhoon|earthquake|wildfire|fire|fires|drought|outbreak|heatwave|blizzard|snowstorm|landslide|tsunami|eruption|volcano)\b/i;
const slots = t => [...String(t).matchAll(/\{(\d)\}/g)].map(m => +m[1]);
// The stop counts a level may use (the same rule as storyboard.js makeOffer: impossible also takes 3-stop themes).
export const stopsFor = level => (level === 'impossible' ? [3, 4] : (LEVELS[level] || {}).stops || []);

export function validate(t) {
  const why = [];
  const str = (k, max) => { if (typeof t[k] !== 'string' || !t[k].trim()) why.push(`${k}: missing`); else if (t[k].length > max) why.push(`${k}: ${t[k].length} > ${max} characters`); };
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(t.id || '')) why.push(`id: "${t.id}" is not a lower-case slug`);
  str('title', LIMITS.title); str('story', LIMITS.story);
  if (!Number.isInteger(t.stops) || t.stops < 2 || t.stops > 4) why.push(`stops: ${t.stops} (2 to 4)`);
  if (t.level != null && !LEVELS[t.level]) why.push(`level: "${t.level}" is not one of ${Object.keys(LEVELS).join(', ')}`);
  else if (t.level && !stopsFor(t.level).includes(t.stops)) why.push(`level ${t.level} takes ${stopsFor(t.level).join(' or ')} stops, not ${t.stops}`);
  if (t.near != null && typeof t.near !== 'boolean') why.push(`near: ${JSON.stringify(t.near)} (true or false)`);
  if (t.source && typeof t.near !== 'boolean') why.push('near: a generated story must say whether its stops are one place (true) or a tour (false)');
  if (!t.near && [t.title, t.story].some(x => typeof x === 'string' && ONE_EVENT.test(x))) why.push(`near: a story about one event ("${[t.title, t.story].join(' ').match(ONE_EVENT)[0]}") keeps its stops together (near: true)`);
  if (!PICS.includes(t.pic)) why.push(`pic: "${t.pic}" has no picture (one of ${PICS.join(', ')})`);
  if (t.areas != null && (!Array.isArray(t.areas) || !t.areas.length || t.areas.some(a => !AREAS[a]))) why.push(`areas: ${JSON.stringify(t.areas)} (null, or keys of src/areas.js AREAS)`);
  if (!Array.isArray(t.lines) || t.lines.length !== t.stops) why.push(`lines: ${Array.isArray(t.lines) ? t.lines.length : 'none'} for ${t.stops} stops (one line a stop)`);
  else t.lines.forEach((l, i) => { if (typeof l !== 'string' || !l.trim()) why.push(`lines[${i}]: empty`); else if (l.length > LIMITS.line) why.push(`lines[${i}]: ${l.length} > ${LIMITS.line} characters`); });
  // Placeholders: only stops that exist, and the story names the pickup and the last stop.
  const all = [t.story, ...(t.lines || [])].filter(x => typeof x === 'string');
  for (const s of all) for (const k of slots(s)) if (k >= t.stops) why.push(`{${k}} in "${s.slice(0, 40)}": the story has only ${t.stops} stops`);
  if (typeof t.story === 'string' && !slots(t.story).length) why.push('story: names no stop ({0} = the pickup)');
  for (const s of [t.title, ...all]) if (typeof s === 'string' && BANNED.test(s)) why.push(`"${s.match(BANNED)[0]}" is not a word for this game`);
  return why;
}
