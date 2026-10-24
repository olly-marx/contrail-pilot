// Eras of the plane side (research/PLANE-DESIGN.md section 8, PLANE-ERAS-1-3.md). An era opens by
// REAL flying time: save.flightSeconds, the seconds actually flown (take-off to landing or crash;
// crashes count; flight school, paused tips and menus don't). Era n (n = 1 for the 1970s) needs
// 20 x n^1.5 more minutes than the one before: 20, 57, 104, 160, 224 min.
export const ERAS = [
  { id: '1950s', name: 'the 1950s' },
  { id: '1970s', name: 'the 1970s' },
  { id: '1990s', name: 'the 1990s' },
  { id: '2010s', name: 'the 2010s' },
  { id: '2030s', name: 'the 2030s' },
  { id: 'future', name: 'the far future' },
];

export const ERA_BASE_MIN = 20;   // 30 until 0.10.3 (user: 30 min of the Comet was 'a nightmare')
export const eraMinutes = n => ERA_BASE_MIN * Math.pow(n, 1.5);   // minutes spent in era n-1 to open era n
// Total flying minutes at which era i (0 = 1950s) opens.
export const eraOpensAt = i => { let t = 0; for (let n = 1; n <= i; n++) t += eraMinutes(n); return t; };

// Where a save stands: the era reached, the next one, and minutes done / needed inside this era.
export function eraProgress(save) {
  const mins = (save.flightSeconds || 0) / 60;
  let i = 0;
  while (i + 1 < ERAS.length && mins >= eraOpensAt(i + 1)) i++;
  const next = i + 1 < ERAS.length ? ERAS[i + 1] : null;
  const from = eraOpensAt(i), need = next ? eraOpensAt(i + 1) - from : 0;
  return { index: i, era: ERAS[i], next, done: next ? mins - from : 0, need, frac: next ? (mins - from) / need : 1 };
}

// A bar for the results and FLY screens: "To the 1970s: 18 / 30 min".
export function eraBarHTML(save) {
  const p = eraProgress(save);
  const label = p.next ? `To ${p.next.name}: <b>${Math.floor(p.done)} / ${Math.round(p.need)} min</b>` : 'Every era open!';
  return `<div class="era-row"><span class="era-badge">${p.era.id === 'future' ? 'Far future' : p.era.id}</span><span class="era-track"><span class="era-fill" style="width:${(p.frac * 100).toFixed(1)}%"></span></span></div>
    <p class="small era-label">${label}</p>`;
}
