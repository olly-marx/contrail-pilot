// The words on the home chip (the user, 2026-11-10): 'Mission: PARIS' when the flight heads for the active city mission (also when that city is only 1-3 airports away),
// 'Explore: AMSTERDAM' in EXPLORE mode, 'Next: AMSTERDAM' when no city mission is open, and the route form 'LONDON > PARIS (go to)' for a destination the player chose.
// Pure (no DOM), so tests/steerchip.cjs can ask it. v is the hub view (src/hub.js: steer = steerOf(save), aim = a city 1-3 airports away that the route aims at, route = the next stops).
// on = the season 2 default-destination chip is in use (tutorial done, season 2, DEFAULT_DEST.on); off keeps the plain route form.
export function chipView(v, save, on = true) {
  const st = v && v.steer, tag = v && v.aim ? (save && save.aimCity && v.aim === save.aimCity ? 'go to' : 'mission') : null;
  if (on && st && st.city && st.why !== 'chosen') return { kind: 'word', word: st.why === 'mission' ? 'Mission' : st.why === 'explore' ? 'Explore' : 'Next', city: st.city };
  if (on && st && st.city && st.why === 'chosen' && !v.aim) return { kind: 'word', word: 'Going to', city: st.city };   // (a chosen city more than 3 airports away: the route form would show only the first hop)
  return { kind: 'route', route: (v && v.route) || [], tag };
}
