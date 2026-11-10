// THE TARGET BANNER and the LIGHT-UP (research/TARGET-BANNER-PLAN.md; the user, 2026-11-10: tested a crossing from Sapporo and had to fly there first). Pure: no DOM, no clock, no random numbers. src/GameScene.js draws it.
// While the flight is heading for a destination the top text of the flight screen says 'Flying to SAPPORO' (in place of the mission title), or 'Flying to SAPPORO to cross' when that city is the departure of a ready crossing;
// when the flight follows a MISSION (ROUTE-DEFAULT-MISSION-PLAN.md) the mission's condition stays visible on a second line. The target airport lights up from when its runway comes on screen until the plane passes it.
export const TEXT_MAX = 40;   // the longest line: 'Flying to ANTANANARIVO to cross' is 31; the text is 200 px wide, two lines of 8 px
// The condition of a mission that must stay visible next to the banner (null: the city is the whole mission). m: { def: { id }, fill }.
export function conditionOf(m) {
  const id = m && m.def && m.def.id, f = (m && m.fill) || {};
  if (id === 'chain' && f.cityB) return `then ${f.cityB}`;
  if (id === 'rescue') return f.cityB ? `and plant ${2 * (f.k || 1)} trees` : null;
  if (id === 'landclean') return `with ${3 * (f.k || 1)} clean gaps`;
  if (id === 'stretch') return 'in one flight';
  if (id === 'route') return 'without stopping';
  return null;
}
// The banner text, or null (no target, or the plane has landed there). { city, crossFrom: true when the city is the departure of a ready crossing, mission: the steering mission or null, landed: this flight has landed at the city }
export function bannerText({ city, crossFrom = false, mission = null, landed = false } = {}) {
  if (!city || landed) return null;
  const first = `Flying to ${city}${crossFrom ? ' to cross' : ''}`, cond = conditionOf(mission);
  return cond ? `${first}\n${cond}` : first;
}
// Is this runway the lit one? name: the runway's city; passed: the plane is past its end; landed: the flight has landed (anywhere). The runway exists only once it has scrolled on screen, so 'lit' starts there.
export const isLit = (target, name, passed, landed) => !!target && name === target && !passed && !landed;
