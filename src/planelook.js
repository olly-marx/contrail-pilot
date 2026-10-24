// The upgraded plane's picture (eras, 0.10.4): the base plane with each bought part layered on. Every part
// image is the WHOLE plane with only that part changed (tools/art/planes/upgrades/), so a part is the set of
// pixels where it differs from the base; later parts win. Same for the 62x27 sprite and the 400x176 portrait.
export function composeOnto(ctx, base, parts) {
  const w = base.width, h = base.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(base, 0, 0);
  if (!parts.length) return;
  const read = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const b = read(base), out = ctx.getImageData(0, 0, w, h);
  for (const img of parts) {
    const p = read(img);
    for (let i = 0; i < p.length; i += 4) {
      if (p[i] !== b[i] || p[i + 1] !== b[i + 1] || p[i + 2] !== b[i + 2] || p[i + 3] !== b[i + 3]) {
        out.data[i] = p[i]; out.data[i + 1] = p[i + 1]; out.data[i + 2] = p[i + 2]; out.data[i + 3] = p[i + 3];
      }
    }
  }
  ctx.putImageData(out, 0, 0);
}

// For the hangar (HTML): a data URL of the composed portrait. Cached by the file list.
const cache = new Map();
const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
// overlays: transparent pictures drawn on top as they are (the hangar gadgets).
export async function composedURL(base, parts, overlays = []) {
  const key = [base, ...parts, '+', ...overlays].join('|');
  if (!parts.length && !overlays.length) return base;
  if (!cache.has(key)) cache.set(key, (async () => {
    const [b, ...ps] = await Promise.all([base, ...parts].map(load)), os = await Promise.all(overlays.map(load));
    const c = document.createElement('canvas'); c.width = b.width; c.height = b.height;
    composeOnto(c.getContext('2d'), b, ps);
    for (const o of os) c.getContext('2d').drawImage(o, 0, 0);
    return c.toDataURL();
  })());
  return cache.get(key);
}
