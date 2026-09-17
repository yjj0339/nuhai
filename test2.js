const pw = require('C:/Users/HUAWEI/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const CHROME = 'C:/Users/HUAWEI/.agent-browser/browsers/chrome-150.0.7871.115/chrome.exe';
(async () => {
  const browser = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('http://127.0.0.1:8192/', { waitUntil: 'load' });
  await page.waitForTimeout(2800);
  let st = await page.evaluate(() => ({ phase: state.phase, three: typeof THREE !== 'undefined', noteOff: document.getElementById('loadnote').classList.contains('off') }));
  console.log('1-menu:', JSON.stringify(st));
  await page.screenshot({ path: 'shots/v2-menu.png' });

  await page.click('#btnStart');
  await page.waitForTimeout(1300);
  st = await page.evaluate(() => ({ phase: state.phase, quest: document.getElementById('questname').textContent }));
  console.log('2-start:', JSON.stringify(st));

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3200);
  st = await page.evaluate(() => ({ x: +state.boat.x.toFixed(1), z: +state.boat.z.toFixed(1), spd: +state.boat.speed.toFixed(2), dist: +state.dist.toFixed(1) }));
  console.log('3-sail:', JSON.stringify(st));
  await page.screenshot({ path: 'shots/v2-sail.png' });

  const got = await page.evaluate(async () => {
    if (!floaters.length) spawnFloater('wood', state.boat.x + 2, state.boat.z);
    let f = null;
    for (const m of floaters) if (m.userData.kind === 'wood') { f = m; break; }
    if (!f) f = spawnFloater('wood', state.boat.x + 2, state.boat.z);
    state.boat.x = f.position.x + 1.2; state.boat.z = f.position.z;
    const w0 = Math.floor(state.res.wood);
    await new Promise(r => setTimeout(r, 700));
    return { w0, w1: Math.floor(state.res.wood), pk: state.cnt.pickup, quest: state.quest };
  });
  console.log('4-pickup:', JSON.stringify(got));

  await page.keyboard.up('KeyW');
  const fish = await page.evaluate(async () => {
    for (const m of floaters) removeFloater(m);
    spawnFloater('fish', state.boat.x + 3, state.boat.z);
    state.boat.speed = 0; state.boat.sail = 0;
    state.boat.x = state.boat.x; state.boat.z = state.boat.z;
    const f0 = state.cnt.fish, food0 = Math.floor(state.res.food);
    await new Promise(r => setTimeout(r, 3600));
    return { f0, f1: state.cnt.fish, food0, food1: Math.floor(state.res.food) };
  });
  console.log('5-fish:', JSON.stringify(fish));
  await page.screenshot({ path: 'shots/v2-fish.png' });

  const quest = await page.evaluate(() => {
    state.cnt.pickup = 3; checkQuests();
    state.res.food = 12; state.res.water = 12; checkQuests();
    state.lv.sail = 2; checkQuests();
    const q = state.quest;
    state.lv.sail = 1;
    return { q, name: QUESTS[q - 1] && QUESTS[q - 1].name, next: QUESTS[q] && QUESTS[q].name };
  });
  console.log('6-quests:', JSON.stringify(quest));

  const merch = await page.evaluate(async () => {
    spawnMerchant(state.boat.x + 6, state.boat.z);
    updateEvents(0.1);
    await new Promise(r => setTimeout(r, 400));
    const gold0 = state.res.gold, wood0 = Math.floor(state.res.wood);
    state.res.wood = 15;
    doTrade(TRADES[0]);
    return { shown: !!document.querySelector('#hud .glass[style*="170px"]') || document.body.innerHTML.indexOf('漂 流 商 筏') > 0, gold0, gold1: state.res.gold, wood1: Math.floor(state.res.wood), trades: state.cnt.trade };
  });
  console.log('7-merchant:', JSON.stringify(merch));

  const dolph = await page.evaluate(() => { dolphinT = 0; updateEvents(0.1); return { luck: Math.round(state.luck), on: dolphinOn > 0 }; });
  console.log('8-dolphin:', JSON.stringify(dolph));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/v2-dolphin.png' });

  const glow = await page.evaluate(async () => {
    state.nightF = 0.8;
    for (const m of floaters) removeFloater(m);
    spawnFloater('glow', state.boat.x + 1.5, state.boat.z);
    const g0 = state.res.gold;
    await new Promise(r => setTimeout(r, 600));
    return { g0, g1: state.res.gold };
  });
  console.log('9-glow:', JSON.stringify(glow));

  st = await page.evaluate(() => {
    state.weather.cur = 'storm'; state.weather.next = 'breeze'; state.weather.t = 25;
    state.stats.hull = 80; state.nightF = 0;
    onWeatherChange();
    return 1;
  });
  await page.waitForTimeout(1700);
  st = await page.evaluate(() => ({ rain: +visW.rain.toFixed(2), hull: +state.stats.hull.toFixed(1), far: Math.round(scene.fog.far) }));
  console.log('10-storm:', JSON.stringify(st));
  await page.screenshot({ path: 'shots/v2-storm.png' });

  await page.evaluate(() => { state.res.gold = 600; state.res.wood = 300; updateHUD(); });
  await page.click('#btnUpgrade');
  await page.waitForTimeout(500);
  st = await page.evaluate(() => ({ open: document.getElementById('panelWrap').classList.contains('on'), items: document.querySelectorAll('.upitem').length, svgs: document.querySelectorAll('.upicon svg').length }));
  console.log('11-panel:', JSON.stringify(st));
  await page.screenshot({ path: 'shots/v2-panel.png' });
  const lv0 = await page.evaluate(() => state.lv.sail);
  await page.click('[data-up="sail"]');
  await page.waitForTimeout(300);
  st = await page.evaluate(() => ({ lv: state.lv.sail }));
  console.log('12-upgrade: sail', lv0, '->', JSON.stringify(st));
  await page.evaluate(() => togglePanel());

  await page.evaluate(() => { state.weather.cur = 'storm'; state.cnt.storms = 1; });
  await page.evaluate(() => { state.stats.hunger = 0.2; state.res.food = 0; state.res.water = 0; });
  await page.waitForTimeout(1400);
  st = await page.evaluate(() => ({ phase: state.phase, over: document.getElementById('over').classList.contains('on'), stats: document.querySelectorAll('.ovstat').length }));
  console.log('13-gameover:', JSON.stringify(st));
  await page.screenshot({ path: 'shots/v2-over.png' });

  await page.click('#btnRestart');
  await page.waitForTimeout(700);
  st = await page.evaluate(() => { state.lv.sail = 3; state.lv.hull = 3; state.res.wood = 130; state.res.gold = 160; doBuild(); return { phase: state.phase, title: document.getElementById('ovtitle').textContent }; });
  console.log('14-win:', JSON.stringify(st));
  await page.screenshot({ path: 'shots/v2-win.png' });

  const filtered = errors.filter(e => !/VALIDATE_STATUS|WebGLProgram|GPU stall/.test(e));
  console.log('ERRORS(' + filtered.length + '):');
  filtered.slice(0, 10).forEach(e => console.log('  ' + e));
  await browser.close();
  if (filtered.length) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
