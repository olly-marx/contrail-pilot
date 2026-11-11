// THE DEFAULT DESTINATION (ROUTING V2 step 2, research/DESIGN-ROUTING-V2.md section 2; the user, 2026-11-09: "I don't like the greedy world tour"; the sim chat's measured rule, 2026-11-10): with no destination chosen the
// flight goes to the NEAREST UNVISITED city: fewest hops over the open network, ties in link order (a breadth-first search in LINKS order), NO random numbers. The player still flies THROUGH the hops and lands at the first airport
// on the way, exactly as before: the default must never make the player land at each hop (measured: that cuts an expert's seeds per flight by 47 percent). Pure: no DOM, no clock; the network, the visited list and pathTo come in as arguments
// (src/route.js flightPath, src/aim.js routeTo). DEFAULT_DEST.on is the sim's A/B switch (off = the old greedy tour).
export const DEFAULT_DEST = { on: true };

// The nearest city of the network that is not in `visited`: [first found in breadth-first order from `from`], or null (nothing unvisited is reachable).
export function nearestUnvisited(L, from, visited, accept = null) {   // accept: an optional filter on the city (STAY IN A BIOME: only cities of one land)
  if (!L[from]) return null;
  const seen = new Set([from]); let level = [from];
  while (level.length) {
    const next = [];
    for (const c of level) for (const n of L[c] || []) {
      if (seen.has(n)) continue;
      seen.add(n);
      if (!visited.has(n) && (!accept || accept(n))) return n;
      next.push(n);
    }
    level = next;
  }
  return null;
}

// The path of a flight: `start` (the cities already on it, at least the city we are in), then the shortest way to the default target, then the shortest way on to the next default target from there (the cities of the path and the
// targets count as visited), until the path holds count + 1 cities. When nothing unvisited is left reachable (all-visited), the rest of the path is TODAY'S GREEDY TOUR: exactly the rule the sim chat measured (an unmeasured
// nicer rule, e.g. 'the city landed in longest ago', is a later step). `tour(path, count)` continues a path with the old tour (src/route.js).
export function defaultChain(L, visitedList, count, pathTo, start, tour) {
  const path = [...start], visited = new Set([...(visitedList || []), ...path]);
  let guard = 0;
  while (path.length < count + 1 && guard++ < 400) {
    const from = path[path.length - 1];
    const target = nearestUnvisited(L, from, visited);
    if (!target) return tour ? tour(path, count) : path.slice(0, count + 1);   // all visited: the old tour carries on from here
    const way = pathTo(from, target, L);
    if (!way || way.length < 2) break;
    for (const c of way.slice(1)) { path.push(c); }
    visited.add(target);
  }
  return path.slice(0, count + 1);
}

// The default target from a city: where 'Next: <city>' points.
export const defaultTargetFrom = (L, here, visitedList) => nearestUnvisited(L, here, new Set([...(visitedList || []), here]));   // null when every reachable city is visited
