// THE LOADING SCREEN'S ART (0.79.0; Oliver, 2026-11-24: 'the loading screen ... needs some proper pixel lab animation'; src/loader.js). Plain Node. Named lines:
//  1. the two PixelLab sheets src/loader.js names exist and are exactly SKY_FRAMES x 192 by 108 and PLANE_FRAMES x 64 by 32 (a wrong size draws a torn frame);
//  2. both are small (under 16 KB together): they are fetched before anything else on a cold start;
//  3. the canvas in index.html is the 192 x 108 the drawing assumes.
// Plants (tools/plants.tsv): the sky sheet counted as 6 frames. Run: node tests/loaderart.cjs
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), fails = [], check = (c, m) => { if (!c) fails.push(m); };
const src = fs.readFileSync(path.join(root, 'src/loader.js'), 'utf8');
const num = n => +((src.match(new RegExp(`${n} = (\\d+)`)) || [])[1]);
const str = n => (src.match(new RegExp(`${n} = '([^']+)'`)) || [])[1];
const size = f => { const d = fs.readFileSync(f); return [d.readUInt32BE(16), d.readUInt32BE(20), d.length]; };
const W = num('W'), H = num('H'), SF = num('SKY_FRAMES'), PF = num('PLANE_FRAMES'), PW = num('PLANE_W'), PH = num('PLANE_H');
const sky = path.join(root, str('SKY_SHEET') || 'missing'), plane = path.join(root, str('PLANE_SHEET') || 'missing');
check(fs.existsSync(sky) && fs.existsSync(plane), `1. both sheets exist: ${sky}, ${plane}`);
if (fs.existsSync(sky) && fs.existsSync(plane)) {
  const [sw, sh, sb] = size(sky), [pw, ph, pb] = size(plane);
  check(sw === SF * W && sh === H, `1. the sky sheet is ${SF} frames of ${W}x${H}: it is ${sw}x${sh}`);
  check(pw === PF * PW && ph === PH, `1. the plane sheet is ${PF} frames of ${PW}x${PH}: it is ${pw}x${ph}`);
  check(sb + pb < 16384, `2. the sheets are small: ${sb + pb} bytes`);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), cv = html.match(/<div id="loader"[^>]*><canvas width="(\d+)" height="(\d+)"/);
check(cv && +cv[1] === W && +cv[2] === H, `3. the loader canvas is ${W}x${H}: ${cv && cv.slice(1)}`);
if (fails.length) { console.log(`FAIL loaderart:\n - ${fails.join('\n - ')}`); process.exit(1); }
console.log(`PASS loaderart: the loading screen's PixelLab sheets (${SF} sky frames, ${PF} plane frames) match the drawing and the canvas`);
