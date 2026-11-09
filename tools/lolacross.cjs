// MEASUREMENT (Node, no browser): load a BACK UP MY GAME file through the real restore path (src/backup.js readBackup + prepareSave) and print, for every crossing that leaves an area,
// the three offer conditions (capability, nature, trial stars) from src/crossings.js offerCtx / offerCheck and which crossings available() lists. Not in the gate.
// Run: node tools/lolacross.cjs <backup.json>
globalThis.SEASON2 = true;
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const fs = require('fs'), text = fs.readFileSync(process.argv[2], 'utf8');
  const B = await import('../src/backup.js'), C = await import('../src/crossings.js'), A = await import('../src/areas.js'), M = await import('../src/missions2.js'), E = await import('../src/eras.js'), S = await import('../src/season.js');
  const r = B.readBackup(text); if (!r.ok) { console.log('REFUSED', r.reason); process.exit(1); }
  const save = r.save;
  console.log(`pilot ${JSON.parse(text).pilot}: city ${save.city}, flights ${save.flights}, landings ${save.landings}, areas ${JSON.stringify(save.areas)}, crossed ${JSON.stringify(save.crossed)}, era index ${E.eraProgress(save).index}`);
  console.log(`areaBest ${JSON.stringify(save.areaBest)}; unlocked areas ${JSON.stringify(A.unlockedAreas(save))}`);
  const listed = C.available(save); console.log(`available(): ${listed.map(c => `${c.id} (${c.from} to ${c.to}, ${c.km} km)`).join('; ') || 'none'}`);
  for (const c of C.CROSSINGS.filter(x => x.kind !== 'lap')) {
    const o = listed.find(x => x.id === c.id), cc = o || { ...c, from: c.a, to: c.b, km: C.crossingKm(c) }, ctx = C.offerCtx(save, cc), chk = C.offerCheck(cc, ctx);
    console.log(`${c.id.padEnd(18)} era ${c.era} from ${cc.from.padEnd(13)} ${o ? 'LISTED   ' : 'not listed'} capability ${Math.round(ctx.capabilityKm)}/${Math.round(S.SEASON.offer.distanceShare * cc.km)} ${chk.need.capability ? 'ok' : 'NO'}; nature ${Math.round(ctx.bio)}/${S.SEASON.offer.biodiversity} ${chk.need.nature ? 'ok' : 'NO'}; trial ${chk.need.contrails === undefined ? 'n/a' : chk.need.contrails ? 'ok' : 'NO'}; offered ${chk.offered}`);
  }
})();
