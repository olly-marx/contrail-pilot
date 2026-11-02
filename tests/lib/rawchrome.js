// Drives a real Chrome over the DevTools protocol with NO Playwright (tests/swupdate.cjs). Why: Playwright attaches to service-worker targets, and under it a NEW worker's
// activation (and sometimes a navigation that overlaps it) stalled in about 1 run in 3 (3 hangs in 11 runs); the same scenario in raw Chrome was 0 stalls in 13 runs
// (research: the 2026-11-02 verdict (a)). Node's built-in WebSocket is the whole client. Chrome is found like every other test: $CHROME, else /usr/bin/google-chrome (CI sets CHROME).
const { spawn } = require('child_process'); const http = require('http'); const fs = require('fs'), os = require('os'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// The launch switches: Playwright's own list (its chromiumSwitches), because without it headless Chrome here never reached the loopback server (HTTPS upgrades etc.).
const FLAGS = ['--headless=new', '--disable-field-trial-config', '--disable-background-networking', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-back-forward-cache',
  '--disable-breakpad', '--disable-client-side-phishing-detection', '--disable-component-extensions-with-background-pages', '--disable-component-update', '--disable-default-apps', '--disable-dev-shm-usage',
  '--disable-extensions', '--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,BlockOriginHeaderModificationOnRedirect,AvoidCorsURLLoaderRestartOnRedirect,Translate,AutoDeElevate',
  '--disable-hang-monitor', '--disable-ipc-flooding-protection', '--disable-popup-blocking', '--disable-prompt-on-repost', '--disable-renderer-backgrounding', '--force-color-profile=srgb', '--metrics-recording-only',
  '--password-store=basic', '--use-mock-keychain', '--no-service-autorun', '--disable-sync', '--enable-automation', '--no-sandbox', '--remote-allow-origins=*', '--no-first-run', '--no-default-browser-check',
  '--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1', '--window-size=375,667'];
const getJSON = url => new Promise((ok, no) => http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { ok(JSON.parse(d)); } catch (e) { no(e); } }); }).on('error', no));

async function launch({ pidfile } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'rawchrome-'));
  const chrome = spawn(process.env.CHROME || '/usr/bin/google-chrome', [...FLAGS, `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  if (pidfile) fs.writeFileSync(pidfile, String(chrome.pid));
  let targets; for (let i = 0; ; i++) { try { targets = await getJSON(`http://127.0.0.1:${port}/json`); break; } catch (e) { if (i > 60) throw new Error('Chrome did not start (' + (process.env.CHROME || '/usr/bin/google-chrome') + ')'); await sleep(250); } }
  const page = targets.find(t => t.type === 'page'); const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map(); let loadWaiters = [];
  ws.addEventListener('message', m => { const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === 'Page.loadEventFired') { const w = loadWaiters; loadWaiters = []; w.forEach(f => f()); } });
  const send = (method, params = {}) => new Promise(ok => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
  const api = {
    send,
    eval: async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; },
    // navigate and wait for the load event: { ok, ms }; ok false = it did not load within maxMs
    goto: async (url, maxMs = 60000) => { const t = Date.now(); const loaded = new Promise(r => loadWaiters.push(r)); await send('Page.navigate', { url }); const res = await Promise.race([loaded.then(() => true), sleep(maxMs).then(() => false)]); return { ok: res, ms: Date.now() - t }; },
    // poll a page expression until it is truthy (a failed evaluation counts as not yet: the page may be reloading under us)
    until: async (expr, ms) => { const t = Date.now(); while (Date.now() - t < ms) { let v; try { v = await api.eval(expr); } catch (e) { v = false; } if (v) return true; await sleep(400); } return false; },
    onNewDocument: source => send('Page.addScriptToEvaluateOnNewDocument', { source }),
    close: () => { try { ws.close(); } catch (e) { /* closed */ } try { chrome.kill('SIGKILL'); } catch (e) { /* gone */ } },
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 1, mobile: true });
  return api;
}
module.exports = { launch, FLAGS, sleep };
