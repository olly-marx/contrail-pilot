const { chromium } = require(process.argv[2]);
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  for (const u of process.argv.slice(3)) { const p = await b.newPage(); let st = '';
    try { const r = await p.goto(u, { timeout: 30000 }); st = r && r.status(); } catch (e) { st = 'nav:' + e.message.split('\n')[0].slice(12, 50); }
    await p.waitForTimeout(4000); let t = ''; try { t = (await p.title()).slice(0, 60); } catch (e) {}
    console.log(st, '|', t, '|', p.url().slice(0, 80), '<-', u); await p.close(); }
  await b.close(); })();
