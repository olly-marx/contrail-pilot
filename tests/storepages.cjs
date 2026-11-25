// THE STORE PAGES (0.79.0; the App Store and TestFlight need a privacy policy and a support page: privacy.html, support.html). Plain Node. Named lines:
//  1. tools/make-site.sh publishes both (they are what the App Store Connect URLs point at);
//  2. each links the other and the game, and every relative link resolves to a file;
//  3. neither carries an email address or a pilot code (public pages; contact is through the repository's issues);
//  4. the privacy page names what the game sends (pilot name, saved game, flight results) and says there are no adverts or analytics; a new server call must be added here.
// Plants (tools/plants.tsv): the pages left out of the site. Run: node tests/storepages.cjs
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), fails = [], check = (c, m) => { if (!c) fails.push(m); };
const site = fs.readFileSync(path.join(root, 'tools/make-site.sh'), 'utf8');
for (const p of ['privacy.html', 'support.html']) {
  check(/^cp -r .*\bprivacy\.html support\.html\b/m.test(site) , `1. make-site.sh copies ${p}`);
  const h = fs.readFileSync(path.join(root, p), 'utf8');
  for (const m of h.matchAll(/(?:href|src)="([^"#:]+)"/g)) { const f = m[1].split('?')[0]; check(f === './' || fs.existsSync(path.join(root, f)), `2. ${p}: link ${m[1]} resolves`); }
  check(/href="\.\/"/.test(h) && /href="(privacy|support)\.html"/.test(h), `2. ${p} links the game and the other page`);
  check(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(h), `3. ${p} has no email address`);
}
const priv = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
check(/pilot name/i.test(priv) && /saved game/i.test(priv) && /[Ff]light results/.test(priv) && /no adverts, no analytics/i.test(priv), '4. the privacy page names the data sent and says no adverts or analytics');
// The server calls the game makes (src/*.js rpc names): the page was written against this list on 2026-11-25. A new one means: read the page again, then add it here.
const KNOWN = ['get_save', 'has_pilot_code', 'leaderboard', 'my_player', 'pilot_login', 'put_save', 'send_flights', 'set_pilot_code'];
const calls = new Set(); for (const f of fs.readdirSync(path.join(root, 'src'))) if (f.endsWith('.js')) for (const m of fs.readFileSync(path.join(root, 'src', f), 'utf8').matchAll(/rpc\('([a-z_]+)'/g)) calls.add(m[1]);
const fresh = [...calls].filter(c => !KNOWN.includes(c));
check(!fresh.length, `4. server calls not reviewed against privacy.html: ${fresh.join(', ')}`);
if (fails.length) { console.log(`FAIL storepages:\n - ${fails.join('\n - ')}`); process.exit(1); }
console.log('PASS storepages: privacy.html and support.html are published, link correctly, carry no email, and the privacy page covers every server call');
