// Run many balance cases in parallel (tools/balance.cjs is frame-stepped with a fixed 16.67 ms, so CPU load
// changes only the wall time, never the km). Each job = one case x one pilot, all its seeds, in its own process.
// Usage: CASES='comet-base-N0,jumbo-full-N0' PILOTS=straight,smart WORKERS=8 MAX=25000 node tools/balance-grid.cjs
const { spawn } = require('child_process');
const cases = (process.env.CASES || '').split(',').filter(Boolean), pilots = (process.env.PILOTS || 'straight,smart').split(',');
const jobs = []; for (const c of cases) for (const p of pilots) jobs.push([c, p]);
const N = Number(process.env.WORKERS || 8), rows = [], t0 = Date.now();
let next = 0, running = 0;
const one = () => new Promise(res => {
  const [c, pilot] = jobs[next++];
  const child = spawn('node', ['tools/balance.cjs'], { env: { ...process.env, PLANES: c, PILOTS: pilot, JSON: '1' } });
  let out = ''; child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => process.stderr.write(d));
  child.on('close', () => { const line = out.trim().split('\n').pop(); try { rows.push(...JSON.parse(line)); } catch (e) { rows.push({ plane: c, pilot, error: out.slice(-200) }); }
    process.stderr.write(`${c} ${pilot} done (${rows.length}/${jobs.length}, ${Math.round((Date.now() - t0) / 1000)} s)\n`); res(); });
});
(async () => {
  const lanes = Array.from({ length: Math.min(N, jobs.length) }, async () => { while (next < jobs.length) await one(); });
  await Promise.all(lanes);
  console.log(JSON.stringify({ seconds: Math.round((Date.now() - t0) / 1000), rows }));
})();
