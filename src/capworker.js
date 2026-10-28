// The capability estimate's HEAT part, off the main thread (src/capability.js). One message in: { save, opts, season2 };
// one out: { runs } (km of each careful crashes-off flight). Imports the sim engine like Node does: no DOM here.
self.onmessage = async e => {
  const { save, opts, season2 } = e.data;
  if (season2) { globalThis.SEASON2 = true; globalThis.window = { SEASON2: true }; }
  const { capability } = await import('./sim/simulate.js');
  self.postMessage({ runs: capability(save, opts).careful.runs });
};
