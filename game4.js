var $ = function (id) { return document.getElementById(id); };
var hudT = 0, miniT = 0, saveT = 0, timeScale = 1, achT = 0, musicT = 2.5;
var overMode = 'lose';
var logOpen = false, resetArm = 0, bannerTO = 0;

function toast(msg, cls) {
  var box = $('toasts');
  while (box.children.length >= 4) box.removeChild(box.firstChild);
  var d = document.createElement('div');
  d.className = 'toast' + (cls ? ' ' + cls : '');
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(function () { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; }, 2200);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2650);
}
function toastGet(msg, cls) {
  var box = $('toasts');
  var d = document.createElement('div');
  d.className = 'toast' + (cls ? ' ' + cls : '');
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(function () { d.style.transition = 'opacity .3s'; d.style.opacity = '0'; }, 900);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1250);
}
function showBanner(t, s) {
  $('banT').textContent = t;
  $('banS').textContent = s || '';
  var b = $('banner');
  b.classList.remove('on');
  void b.offsetWidth;
  b.classList.add('on');
  clearTimeout(bannerTO);
  bannerTO = setTimeout(function () { b.classList.remove('on'); }, 2600);
}
function showPrompt(txt) {
  var p = $('prompt');
  if ($('promptxt').textContent !== txt) $('promptxt').textContent = txt;
  if (!p.classList.contains('on')) p.classList.add('on');
}
function hidePrompt() {
  var p = $('prompt');
  if (p.classList.contains('on')) p.classList.remove('on');
}

var WARN_TXT = {
  breeze: '风渐起 · 浪将增大',
  fog: '浓雾将至 · 减速慢行',
  drizzle: '细雨将至 · 淡水自生',
  storm: '雷暴逼近 · 检查木材储备！',
  sun: '天气即将放晴'
};
function showWarn(next) {
  $('warntxt').textContent = '预警：' + WARN_TXT[next];
  $('warn').classList.add('on');
}
function hideWarn() { $('warn').classList.remove('on'); }

function updateWeatherHUD() {
  var def = WDEF[state.weather.cur];
  $('wIconBox').innerHTML = WSVG[state.weather.cur];
  $('wName').textContent = def.name;
  $('wDesc').textContent = def.desc;
}
function updateWeatherTime() {
  var total = WTIME[state.weather.cur];
  var f = clamp(state.weather.t / total[1], 0, 1);
  $('wTimeFill').style.width = (f * 100).toFixed(1) + '%';
}

function updateHUD() {
  var cap = holdCap(state.lv.hold);
  $('rvW').textContent = Math.floor(state.res.wood);
  $('rcW').textContent = '/' + cap[0];
  $('rvF').textContent = Math.floor(state.res.food);
  $('rcF').textContent = '/' + cap[1];
  $('rvT').textContent = Math.floor(state.res.water);
  $('rcT').textContent = '/' + cap[2];
  $('rvG').textContent = state.res.gold;
  $('bh').style.width = state.stats.hunger + '%';
  $('bt').style.width = state.stats.thirst + '%';
  $('bp').style.width = state.stats.hull / maxHull() * 100 + '%';
  $('vh').textContent = Math.ceil(state.stats.hunger);
  $('vt').textContent = Math.ceil(state.stats.thirst);
  $('vp').textContent = Math.ceil(state.stats.hull);
  $('srH').classList.toggle('danger', state.stats.hunger < 30);
  $('srT').classList.toggle('danger', state.stats.thirst < 30);
  $('srP').classList.toggle('danger', state.stats.hull / maxHull() < 0.3);
  $('hudDay').textContent = '第 ' + state.day + ' 天';
  $('hudClock').textContent = fmtClock(state.dayT);
  $('expl').textContent = explorePct() + '%';
  $('vignette').style.opacity = state.phase === 'play' ? clamp((0.32 - state.stats.hull / maxHull()) * 3.2, 0, 0.62).toFixed(2) : 0;
  var cdR = 1 - clamp(state.burstCd / 25, 0, 1);
  $('burstCd').style.height = (cdR * 100).toFixed(0) + '%';
  $('burstBtn').classList.toggle('ready', state.burstCd <= 0);
  updateWeatherTime();
}

function updateQuestHUD() {
  if (state.quest >= QUESTS.length) {
    $('qtag').textContent = '最终目标';
    $('questname').textContent = '建造远洋巨轮';
    $('questdesc').textContent = '船帆3级 + 船体3级 + 木材120 + 金币150，在船坞点「建造」通关';
    var ready = canBuild();
    $('questfill').style.width = ready ? '100%' : '62%';
    $('questval').textContent = ready ? '条件已齐，去船坞建造！' : '攒够物资就出海回家';
    return;
  }
  var q = QUESTS[state.quest];
  var p = questProgress();
  $('qtag').textContent = '目标 ' + (state.quest + 1) + ' / ' + QUESTS.length;
  $('questname').textContent = q.name;
  $('questdesc').textContent = q.desc;
  $('questfill').style.width = clamp(p.cur / p.max * 100, 0, 100) + '%';
  $('questval').textContent = p.cur + ' / ' + p.max;
}

function updateBuffHUD() {
  var row = $('buffrow');
  row.innerHTML = '';
  if (state.luck > 0) {
    var d = document.createElement('div');
    d.className = 'buff glass';
    d.innerHTML = '<div class="bdot"></div>海豚好运 · 打捞+25% · ' + Math.ceil(state.luck) + 's';
    row.appendChild(d);
  }
  if (state.windfall > 0) {
    var d5 = document.createElement('div');
    d5.className = 'buff glass';
    d5.innerHTML = '<div class="bdot" style="background:#ffd75e"></div>顺风 · 航速+15% · ' + Math.ceil(state.windfall) + 's';
    row.appendChild(d5);
  }
  if (state.burst > 0) {
    var d3 = document.createElement('div');
    d3.className = 'buff glass';
    d3.innerHTML = '<div class="bdot" style="background:#67c7f2"></div>乘风突进 · 航速大增';
    row.appendChild(d3);
  }
  var nearWhirl = false;
  for (var wi = 0; wi < whirlpools.length; wi++) {
    if (Math.hypot(state.boat.x - whirlpools[wi].position.x, state.boat.z - whirlpools[wi].position.z) < 40) { nearWhirl = true; break; }
  }
  if (nearWhirl) {
    var d2 = document.createElement('div');
    d2.className = 'buff glass';
    d2.innerHTML = '<div class="bdot" style="background:#8a6ac8"></div>漩涡引力 · 全速驶离！';
    row.appendChild(d2);
  }
  if (state.weather.cur === 'storm') {
    var d4 = document.createElement('div');
    d4.className = 'buff glass';
    d4.innerHTML = '<div class="bdot" style="background:#f2a63c"></div>雷暴 · 打捞+50% · 注意船体';
    row.appendChild(d4);
  }
}

var tradeCard = null;
function showTradeCard() {
  if (tradeCard) { renderTradeCard(); return; }
  tradeCard = document.createElement('div');
  tradeCard.className = 'glass';
  tradeCard.style.cssText = 'position:absolute;bottom:170px;left:50%;transform:translateX(-50%);padding:14px 16px;min-width:280px;pointer-events:auto';
  $('hud').appendChild(tradeCard);
  renderTradeCard();
}
function hideTradeCard() {
  if (tradeCard && tradeCard.parentNode) tradeCard.parentNode.removeChild(tradeCard);
  tradeCard = null;
}
function renderTradeCard() {
  if (!tradeCard) return;
  var html = '<div style="font-weight:900;font-size:14px;margin-bottom:9px;letter-spacing:1px">漂 流 商 筏 <span style="font-size:11px;color:#7fa0b8;font-weight:700">· 存在 ' + Math.ceil(merchant ? merchant.userData.life : 0) + 's</span></div>';
  for (var i = 0; i < TRADES.length; i++) {
    var t = TRADES[i];
    var ok = canTrade(t);
    html += '<div style="display:flex;align-items:center;gap:10px;margin-top:7px">' +
      '<span style="flex:1;font-size:12.5px;font-weight:800">' + t.label + '</span>' +
      '<button class="gbtn" style="padding:6px 12px;font-size:12px;' + (ok ? '' : 'opacity:.45;pointer-events:none') + '" data-trade="' + i + '">交易</button></div>';
  }
  html += '<div style="font-size:11px;color:#7fa0b8;margin-top:8px;font-weight:700">你有：木材 ' + Math.floor(state.res.wood) + ' · 金币 ' + state.res.gold + '</div>';
  tradeCard.innerHTML = html;
  var btns = tradeCard.querySelectorAll('[data-trade]');
  for (var b = 0; b < btns.length; b++) btns[b].onclick = function () { doTrade(TRADES[+this.getAttribute('data-trade')]); };
}

var mini = $('mini'), mctx = mini.getContext('2d');
var FKC = { wood: '#a9743f', food: '#e0704a', water: '#3e9fd6', gold: '#e0a52e', fish: '#4dc06a', glow: '#4dc0a8', chest: '#e0a52e', bottle: '#5fae72', letter: '#ffd75e' };
function islandsFoundById(id) { return !!state.islandsFound[id]; }
function drawMini() {
  var W = mini.width, H = mini.height;
  var sc = W / ((GRID_R * 2 + 2) * CELL);
  var cx = W / 2, cy = H / 2;
  mctx.fillStyle = '#e9f2f7';
  mctx.fillRect(0, 0, W, H);
  mctx.fillStyle = '#a3d4ea';
  var key;
  for (key in state.explored) {
    if (!state.explored[key]) continue;
    var p = key.split(',');
    var gx = parseInt(p[0], 10), gz = parseInt(p[1], 10);
    mctx.fillRect(cx + gx * CELL * sc - CELL * sc / 2, cy + gz * CELL * sc / 2 - CELL * sc / 2, CELL * sc + 0.5, CELL * sc + 0.5);
  }
  mctx.strokeStyle = 'rgba(120,160,185,.35)';
  mctx.lineWidth = 2.5;
  mctx.strokeRect(cx - WORLD_R * sc, cy - WORLD_R * sc, WORLD_R * 2 * sc, WORLD_R * 2 * sc);
  for (var i = 0; i < islands.length; i++) {
    var u = islands[i].userData;
    var ix = cx + u.x * sc, iz = cy + u.z * sc;
    mctx.fillStyle = u.found ? '#e8c87a' : '#c4d8e2';
    mctx.beginPath();
    mctx.arc(ix, iz, Math.max(3.5, u.r * sc * 1.6), 0, 6.29);
    mctx.fill();
    if (u.found) {
      mctx.fillStyle = '#7db95c';
      mctx.beginPath();
      mctx.arc(ix, iz, Math.max(1.8, u.r * sc * 0.7), 0, 6.29);
      mctx.fill();
    }
  }
  mctx.globalAlpha = 0.85;
  for (var f = 0; f < floaters.length; f++) {
    var fm = floaters[f];
    var fx = cx + fm.position.x * sc, fz = cy + fm.position.z * sc;
    if (fx < 5 || fx > W - 5 || fz < 5 || fz > H - 5) continue;
    mctx.fillStyle = FKC[fm.userData.kind] || '#888';
    mctx.beginPath();
    mctx.arc(fx, fz, fm.userData.kind === 'fish' ? 4.2 : 2.6, 0, 6.29);
    mctx.fill();
  }
  mctx.globalAlpha = 1;
  for (var wp2 = 0; wp2 < whirlpools.length; wp2++) {
    var wx = cx + whirlpools[wp2].position.x * sc, wz = cy + whirlpools[wp2].position.z * sc;
    if (wx < 5 || wx > W - 5 || wz < 5 || wz > H - 5) continue;
    mctx.strokeStyle = '#8a6ac8';
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.arc(wx, wz, 4.5, 0, 4.8);
    mctx.stroke();
    mctx.fillStyle = '#8a6ac8';
    mctx.beginPath();
    mctx.arc(wx, wz, 2, 0, 6.29);
    mctx.fill();
  }
  for (var ic2 = 0; ic2 < islandCaches.length; ic2++) {
    var cc = islandCaches[ic2];
    if (cc.userData.taken || !islandsFoundById(cc.userData.islId)) continue;
    var cx2 = cx + cc.userData.x * sc, cz2 = cy + cc.userData.z * sc;
    if (cx2 < 5 || cx2 > W - 5 || cz2 < 5 || cz2 > H - 5) continue;
    mctx.save();
    mctx.translate(cx2, cz2);
    mctx.rotate(Math.PI / 4);
    mctx.fillStyle = '#ffd75e';
    mctx.fillRect(-3.2, -3.2, 6.4, 6.4);
    mctx.strokeStyle = '#a8781f';
    mctx.lineWidth = 1.4;
    mctx.strokeRect(-3.2, -3.2, 6.4, 6.4);
    mctx.restore();
  }
  if (whale) {
    mctx.fillStyle = '#4a6a8a';
    mctx.beginPath();
    mctx.arc(cx + whale.position.x * sc, cy + whale.position.z * sc, 4.5, 0, 6.29);
    mctx.fill();
  }
  if (merchant) {
    var mx = cx + merchant.position.x * sc, mz = cy + merchant.position.z * sc;
    mctx.save();
    mctx.translate(mx, mz);
    mctx.rotate(Math.PI / 4);
    mctx.fillStyle = '#ef8a5a';
    mctx.fillRect(-4.5, -4.5, 9, 9);
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 1.6;
    mctx.strokeRect(-4.5, -4.5, 9, 9);
    mctx.restore();
  }
  var b = state.boat;
  mctx.save();
  mctx.translate(cx + b.x * sc, cy + b.z * sc);
  mctx.rotate(-b.heading);
  mctx.fillStyle = '#ef6f3c';
  mctx.beginPath();
  mctx.moveTo(0, -9);
  mctx.lineTo(6.5, 7);
  mctx.lineTo(-6.5, 7);
  mctx.closePath();
  mctx.fill();
  mctx.strokeStyle = '#fff';
  mctx.lineWidth = 2.2;
  mctx.stroke();
  mctx.restore();
}

function lvDots(cur, max) {
  var s = '<span class="lv">';
  for (var i = 1; i <= max; i++) s += '<b class="' + (i <= cur ? 'f' : '') + '"></b>';
  return s + '</span>';
}
function renderUpList() {
  var html = '';
  var order = ['sail', 'hull', 'hold', 'lamp', 'net', 'rudder', 'lookout'];
  for (var i = 0; i < order.length; i++) {
    var k = order[i];
    var u = UPG[k];
    var lv = state.lv[k];
    var idx = lv - 1;
    var maxed = lv >= u.max;
    var costG = maxed ? 0 : u.costG[idx];
    var costW = maxed ? 0 : u.costW[idx];
    var afford = !maxed && state.res.gold >= costG && state.res.wood >= costW;
    html += '<div class="upitem"><div class="upicon ' + u.icon + '">' + u.svg + '</div>' +
      '<div class="upmain"><div class="upname">' + u.name + ' ' + lvDots(lv, u.max) + '</div>' +
      '<div class="updesc">' + u.eff(lv) + (maxed ? '' : ' → ' + u.eff(lv + 1)) + '</div></div>';
    if (maxed) html += '<button class="upbtn upmax" disabled>已满级</button>';
    else html += '<button class="upbtn ' + (afford ? 'upok' : 'upno') + '"' + (afford ? '' : ' disabled') +
      ' data-up="' + k + '">金币' + costG + '<br>木材' + costW + '</button>';
    html += '</div>';
  }
  var ok = canBuild() && !state.freeplay;
  var buildLabel = state.freeplay ? '已 建 成' : (ok ? '建 造' : '未达成');
  html += '<div class="upitem' + (ok ? ' armed' : '') + '" id="builditem"><div class="upicon ui-lamp"><svg viewBox="0 0 24 24" fill="none"><path d="M4 14l1.6-7A2.4 2.4 0 0 1 8 5h8a2.4 2.4 0 0 1 2.4 2L20 14" stroke="#a8781f" stroke-width="2" stroke-linejoin="round"/><path d="M4 14h16v3.4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14z" fill="#a8781f" opacity=".85"/><path d="M9 19.6V21M15 19.6V21" stroke="#a8781f" stroke-width="2" stroke-linecap="round"/><path d="M12 3.2c2.8 1.8 2.8 5 0 6.8-2.8-1.8-2.8-5 0-6.8z" fill="#2f9bd6"/></svg></div>' +
    '<div class="upmain"><div class="upname">' + (state.freeplay ? '远洋巨轮 · 已建成' : '建造远洋巨轮 · 通关') + '</div>' +
    '<div class="updesc">' + (state.freeplay ? '巨轮已建成，享受自由航行吧' : '需要：船帆3级(' + state.lv.sail + ') · 船体3级(' + state.lv.hull + ') · 木材' + Math.floor(state.res.wood) + '/' + BUILD_NEED.wood + ' · 金币' + state.res.gold + '/' + BUILD_NEED.gold) + '</div></div>' +
    '<button class="upbtn upok" id="btnBuild"' + (ok ? '' : ' disabled') + '>' + buildLabel + '</button></div>';
  $('uplist').innerHTML = html;
  var btns = $('uplist').querySelectorAll('[data-up]');
  for (var b = 0; b < btns.length; b++) btns[b].onclick = function () { doUpgrade(this.getAttribute('data-up')); };
  var bb = $('btnBuild');
  if (bb) bb.onclick = doBuild;
}

function togglePanel() {
  var pw = $('panelWrap');
  var open = !pw.classList.contains('on');
  if (open && logOpen) closeLog();
  pw.classList.toggle('on', open);
  timeScale = open ? 0.25 : 1;
  if (open) renderUpList();
}

function openLog() {
  if ($('panelWrap').classList.contains('on')) togglePanel();
  logOpen = true;
  $('logWrap').classList.add('on');
  renderLog();
}
function closeLog() {
  logOpen = false;
  $('logWrap').classList.remove('on');
}
function renderLog() {
  var its = [
    ['生存天数', state.day + ' 天'],
    ['航行距离', (state.dist / 1000).toFixed(1) + ' km'],
    ['打捞物资', state.cnt.pickup],
    ['捕鱼次数', state.cnt.fish],
    ['挺过风暴', state.cnt.storms],
    ['发现岛屿', Object.keys(state.islandsFound).length],
    ['漂流瓶', state.cnt.bottles],
    ['岛屿宝藏', state.cnt.cacheOpen || 0],
    ['逃出漩涡', state.cnt.whirlEsc || 0],
    ['顺风信件', state.cnt.letters || 0],
    ['成就', Object.keys(state.ach).length + ' / ' + ACHS.length],
    ['探索度', explorePct() + '%']
  ];
  var h = '';
  for (var i = 0; i < its.length; i++) h += '<div class="lstat"><b>' + its[i][1] + '</b><span>' + its[i][0] + '</span></div>';
  $('logStats').innerHTML = h;
  var ahs = '', done = 0;
  for (var j = 0; j < ACHS.length; j++) {
    var a = ACHS[j];
    var ok = !!state.ach[a.id];
    if (ok) done++;
    var pr = !ok && a.p ? a.p() : null;
    var prTxt = pr ? '（' + pr[0] + ' / ' + pr[1] + '）' : '';
    ahs += '<div class="achitem' + (ok ? ' done' : '') + '"><div class="achdot">' + (ok ? '✓' : (j + 1)) + '</div><div><div class="achname">' + a.name + '</div><div class="achdesc">' + a.desc + prTxt + '</div></div><div class="achrew">' + (ok ? '已获得' : '金币+' + a.rew) + '</div></div>';
  }
  $('achlist').innerHTML = ahs + '<div style="font-size:11px;color:#7fa0b8;text-align:right;margin-top:3px;font-weight:700">成就 ' + done + ' / ' + ACHS.length + '</div>';
  $('btnMute').textContent = '音效：' + (state.mute ? '关' : '开');
  $('btnMusic').textContent = '音乐：' + (state.settings.music === false ? '关' : '开');
  $('btnHiRes').textContent = '高清画质：' + (state.settings.hiRes ? '开' : '关');
}

function togglePause() {
  if (state.phase === 'play') {
    state.phase = 'pause';
    overMode = 'pause';
    $('ovtitle').textContent = '已 暂 停';
    $('ovtitle').className = 'win';
    renderOvStats();
    $('ovsub').innerHTML = '按 P 键或点击按钮继续航行';
    $('btnRestart').textContent = '继 续 航 行';
    $('over').classList.add('on');
    save();
  } else if (state.phase === 'pause') {
    state.phase = 'play';
    $('over').classList.remove('on');
  }
}

function renderOvStats() {
  var items = [
    ['生存天数', state.day],
    ['海图探索', explorePct() + '%'],
    ['金币', state.res.gold],
    ['打捞物资', state.cnt.pickup]
  ];
  var html = '';
  for (var i = 0; i < items.length; i++) {
    html += '<div class="ovstat"><b>' + items[i][1] + '</b><span>' + items[i][0] + '</span></div>';
  }
  $('ovstats').innerHTML = html;
}

function gameOver(why) {
  state.phase = 'over';
  sfxLose();
  clearSave();
  overMode = 'lose';
  hidePrompt();
  hideTradeCard();
  $('btnFree').style.display = 'none';
  var whyTxt = {
    hunger: '食物耗尽，你饿晕在甲板上，被路过的商船救起…',
    thirst: '淡水喝干了，商船把你送回了港口…',
    hull: '船体在风浪中解体，你抱着木板漂回了岸边…'
  }[why];
  $('ovtitle').textContent = '航 程 结 束';
  $('ovtitle').className = 'lose';
  renderOvStats();
  $('ovsub').innerHTML = whyTxt + '<br><span style="font-size:12px;color:#7d9cb2">共航行 ' + (state.dist / 1000).toFixed(1) + ' 公里 · 捕鱼 ' + state.cnt.fish + ' 次 · 开箱 ' + state.cnt.chests + ' 个 · 成就 ' + Object.keys(state.ach).length + '/' + ACHS.length + '</span><br><span style="font-size:12px;color:#7d9cb2">下次记得多备淡水和木材，风暴前靠岛休整</span>';
  $('btnRestart').textContent = '再 次 出 海';
  $('over').classList.add('on');
}
function showOver(win) {
  overMode = 'win';
  $('ovtitle').textContent = '通 关 !';
  $('ovtitle').className = 'win';
  renderOvStats();
  $('ovsub').innerHTML = '远洋巨轮建成！你带着满舱物资驶向地平线，结束漂流生涯。<br>发现 <b>' + Object.keys(state.islandsFound).length + '</b> 座岛屿 · 航行 <b>' + (state.dist / 1000).toFixed(1) + '</b> 公里 · 成就 <b>' + Object.keys(state.ach).length + '</b>/' + ACHS.length;
  $('btnRestart').textContent = '开 启 新 航 程';
  $('btnFree').style.display = 'inline-block';
  $('over').classList.add('on');
}
function freeplay() {
  state.freeplay = 1;
  state.phase = 'play';
  $('over').classList.remove('on');
  $('btnFree').style.display = 'none';
  toast('自由航行：这片海还有更多秘密等你发现', 'gold');
  save();
}

function updateCamera(dt) {
  var b = state.boat;
  var camYaw = boat.userData.camYaw === undefined ? b.heading + Math.PI : boat.userData.camYaw;
  var wantYaw = b.heading + Math.PI + camCtl.user;
  camYaw = angLerp(camYaw, wantYaw, dt * 2.2);
  boat.userData.camYaw = camYaw;
  var cp = camCtl.pitch, cd = camCtl.dist;
  var tx = b.x, ty = boat.position.y + 2.4, tz = b.z;
  var px = tx + Math.sin(camYaw) * Math.cos(cp) * cd;
  var pz = tz + Math.cos(camYaw) * Math.cos(cp) * cd;
  var py = ty + Math.sin(cp) * cd;
  camera.position.x = lerp(camera.position.x, px, dt * 4.5);
  camera.position.y = lerp(camera.position.y, py, dt * 4.5);
  camera.position.z = lerp(camera.position.z, pz, dt * 4.5);
  if (state.weather.cur === 'storm') {
    var sk = 0.05;
    camera.position.x += rand(-sk, sk);
    camera.position.y += rand(-sk, sk);
  }
  var spdR = clamp(b.speed / Math.max(1, boatSpeedMax()), 0, 1);
  var wantFov = 55 + spdR * 7;
  if (Math.abs(camera.fov - wantFov) > 0.06) {
    camera.fov = lerp(camera.fov, wantFov, dt * 2.5);
    camera.updateProjectionMatrix();
  }
  camera.lookAt(tx, ty + 1, tz);
}

function updateFX(dt) {
  seaMat.uniforms.uTime.value = state.time;
  seaMat.uniforms.uAmp.value = visW.amp;
  seaMat.uniforms.cDeep.value.copy(visW.seaDeep);
  seaMat.uniforms.cShallow.value.copy(visW.seaShal);
  seaMat.uniforms.cFog.value.copy(scene.fog.color);
  seaMat.uniforms.uFogFar.value = scene.fog.far;
  seaMesh.position.x = camera.position.x;
  seaMesh.position.z = camera.position.z;
  skyMesh.position.copy(camera.position);
  skyMat.uniforms.uTime.value = state.time;

  rainMat.opacity = visW.rain;
  if (visW.rain > 0.02) {
    var cx = camera.position.x, cz = camera.position.z;
    var slant = visW.wind * 1.6 + 0.25;
    for (var i = 0; i < RAIN_N; i++) {
      var r = rainDat[i];
      r.y -= r.v * dt;
      if (r.y < -2) {
        r.x = cx + rand(-48, 48); r.z = cz + rand(-48, 48);
        r.y = camera.position.y + rand(14, 30);
        r.v = rand(36, 55);
      }
      rainPos[i * 6] = r.x; rainPos[i * 6 + 1] = r.y; rainPos[i * 6 + 2] = r.z;
      rainPos[i * 6 + 3] = r.x + slant; rainPos[i * 6 + 4] = r.y - 1.7; rainPos[i * 6 + 5] = r.z;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  var fp = foamGeo.attributes.position.array;
  for (var f = 0; f < FOAM_N; f++) {
    var d = foamDat[f];
    if (d.life > 0) {
      d.life -= dt;
      d.x += Math.sin(d.s * f * 0.13 + state.time * 2) * dt * 1.5;
      d.z += Math.cos(d.s * f * 0.17 + state.time * 2) * dt * 1.5;
      var wy = waveH(d.x, d.z, state.time, visW.amp);
      fp[f * 3] = d.x; fp[f * 3 + 1] = d.life > 0 ? wy + 0.18 : -999; fp[f * 3 + 2] = d.z;
    } else fp[f * 3 + 1] = -999;
  }
  foamGeo.attributes.position.needsUpdate = true;

  for (var sp2 = 0; sp2 < SPARK_N; sp2++) {
    var sk = sparkPool[sp2];
    if (sk.t > 0) {
      sk.t -= dt * 2;
      var k2 = 1 - Math.max(0, sk.t);
      sk.spr.scale.setScalar(sk.base + k2 * 4);
      sk.spr.material.opacity = Math.max(0, sk.t) * 0.85;
      sk.spr.position.y += dt * 1.6;
      if (sk.t <= 0) sk.spr.visible = false;
    }
  }

  for (var g = 0; g < gulls.length; g++) {
    var gu = gulls[g].userData;
    gu.a += gu.sp * dt;
    var gx = state.boat.x + Math.cos(gu.a) * gu.r;
    var gz = state.boat.z + Math.sin(gu.a) * gu.r;
    gulls[g].position.set(gx, gu.h + Math.sin(state.time * 1.2 + gu.ph) * 1.4, gz);
    gulls[g].rotation.y = -gu.a + Math.PI / 2;
    var flap = Math.sin(state.time * 9 + gu.ph) * 0.55;
    gu.wL.rotation.y = flap;
    gu.wR.rotation.y = -flap;
  }
  for (var c = 0; c < clouds.length; c++) {
    var cl = clouds[c];
    cl.position.x += cl.userData.vx * dt;
    if (cl.position.x > 800) cl.position.x = -800;
  }
  for (var il = 0; il < islands.length; il++) {
    var fm2 = islands[il].userData.foam;
    if (fm2) {
      var fs = 1 + Math.sin(state.time * 1.5 + il * 1.3) * 0.03;
      fm2.scale.set(fs, fs, 1);
      fm2.material.opacity = 0.35 + Math.sin(state.time * 1.5 + il * 1.3) * 0.15;
    }
    var beam = islands[il].userData.beam;
    if (beam) {
      beam.visible = (state.nightF || 0) > 0.22;
      beam.rotation.y += dt * 0.55;
    }
  }
  for (var dp = 0; dp < dolphins.length; dp++) {
    var dol = dolphins[dp];
    if (dolphinOn > 0) {
      dol.visible = true;
      var du = dol.userData;
      var prog = state.time * 0.9 + du.off;
      var dr = 9 + Math.sin(prog * 0.7) * 3;
      var dx2 = state.boat.x - Math.sin(state.boat.heading) * 4 + Math.cos(prog) * dr * du.side;
      var dz2 = state.boat.z - Math.cos(state.boat.heading) * 4 + Math.sin(prog) * dr;
      var jump = Math.max(0, Math.sin(prog * 1.6 + du.ph));
      var jy = waveH(dx2, dz2, state.time, visW.amp) - 0.3 + jump * jump * 2.6;
      dol.position.set(dx2, jy, dz2);
      var pitchA = Math.cos(prog * 1.6 + du.ph) * 0.8 * (jump > 0.1 ? 1 : 0);
      dol.rotation.set(-pitchA, -prog + Math.PI / 2 * du.side, 0);
    } else dol.visible = false;
  }
  boat.userData.lampGlow.scale.setScalar(0.9 + state.lv.lamp * 0.3);
}

function step(dt) {
  state.time += dt;
  state.playSec += dt;
  updateDayNight(dt);
  updateWeather(dt);
  updateBoat(dt);
  updateFloaters(dt);
  updateSurvival(dt);
  updateExplore(dt);
  updateEvents(dt);
  updateCamera(dt);
  musicT -= dt;
  if (musicT <= 0) {
    musicT = rand(2.4, 4.6);
    if (!state.mute && state.settings.music !== false && AC && state.weather.cur !== 'storm') sfxPluck(pick(MNOTES), Math.random() < 0.35);
  }
  hudT -= dt;
  if (hudT <= 0) {
    hudT = 0.25;
    updateHUD();
    updateQuestHUD();
    checkQuests();
    updateBuffHUD();
  }
  achT -= dt;
  if (achT <= 0) { achT = 1.0; checkAch(); }
  miniT -= dt;
  if (miniT <= 0) { miniT = 0.3; drawMini(); }
  saveT -= dt;
  if (saveT <= 0) { saveT = 10; save(); }
}

var menuA = 0;
function menuIdle(dt) {
  state.time += dt * 0.5;
  menuA += dt * 0.1;
  var b = state.boat;
  var wh = waveH(b.x, b.z, state.time, 0.55);
  boat.position.set(0, wh + 0.32, 0);
  boat.rotation.set(Math.sin(state.time * 0.7) * 0.03, menuA * 1.4 + 2.2, Math.sin(state.time * 0.5) * 0.05);
  boat.userData.sail.scale.set(1.05, 0.78, 0.72);
  boat.userData.stripe.scale.set(1.05, 1, 0.72);
  boat.userData.foreSail.scale.set(1, 1, 0.7);
  var cd = 13.5;
  camera.position.set(Math.sin(menuA * 2) * cd, 4.6 + Math.sin(state.time * 0.3) * 0.5, Math.cos(menuA * 2) * cd);
  camera.lookAt(0, 2.2, 0);
  visW.rain = 0;
}

function resetWorld() {
  for (var i = islands.length - 1; i >= 0; i--) islands[i].userData.found = false;
  while (floaters.length) removeFloater(floaters[0]);
  if (merchant) { scene.remove(merchant); merchant = null; hideTradeCard(); }
  if (whale) { scene.remove(whale); whale = null; }
  if (rainbow) { scene.remove(rainbow); rainbow = null; }
  dolphinOn = 0;
  dolphinT = 70; whaleT = 140; merchantT = 110;
  stormSurviveFlag = false;
  wakePts = [];
  for (var wp = 0; wp < WAKE_N; wp++) wakePts.push({ x: state.boat.x, z: state.boat.z, h: 0 });
  boat.userData.cargoN = -1;
  updateCargoVisual();
  placeWhirlpools(state.day);
  for (var ci = 0; ci < islandCaches.length; ci++) {
    islandCaches[ci].userData.taken = false;
    islandCaches[ci].userData.hold = 0;
    islandCaches[ci].visible = true;
  }
  state.burst = 0;
  state.burstCd = 0;
  hidePrompt();
}

function newGame() {
  clearSave();
  var keepMute = state.mute, keepTime = state.time, keepNightF = state.nightF || 0, keepSet = state.settings;
  state = {
    phase: 'play', time: keepTime, day: 1, dayT: 0.3, nightF: keepNightF,
    boat: { x: 0, z: 0, heading: rand(0, 6.28), speed: 0, sail: 0 },
    res: { wood: 10, food: 6, water: 6, gold: 0 },
    stats: { hunger: 100, thirst: 100, hull: 100 },
    lv: { sail: 1, hull: 1, hold: 1, lamp: 1, net: 1, rudder: 1, lookout: 1 },
    weather: { cur: 'sun', prev: 'sun', next: pickWeatherNext('sun'), t: 55, warnT: 0, blend: 0 },
    explored: {}, islandsFound: {},
    cnt: { pickup: 0, fish: 0, storms: 0, chests: 0, bottles: 0, trade: 0, cacheOpen: 0, whirlEsc: 0, letters: 0 },
    dist: 0, quest: 0, luck: 0, windfall: 0, letterDay: 0, freeplay: 0,
    burst: 0, burstCd: 0,
    ach: {}, islandDock: {}, caches: {}, settings: keepSet,
    mute: keepMute, playSec: 0, hintShown: {}
  };
  resetWorld();
  for (var s = 0; s < 7; s++) {
    var a = rand(0, 6.28), dd = rand(15, 55);
    spawnFloater(pick(['wood', 'food', 'water', 'wood', 'gold', 'fish']), Math.cos(a) * dd, Math.sin(a) * dd);
  }
  boat.userData.camYaw = state.boat.heading + Math.PI;
  updateWeatherHUD();
  updateHUD();
  updateQuestHUD();
  updateBuffHUD();
  drawMini();
  $('menu').classList.add('off');
  $('hud').classList.add('on');
  $('over').classList.remove('on');
  $('vignette').style.opacity = 0;
  state.phase = 'play';
  setTimeout(function () { toast('跟着左侧目标卡走，W 升帆出发'); }, 600);
  setTimeout(function () { toast('停靠小岛可以补给，停稳在鱼群上可以捕鱼'); }, 4600);
}

function loadGame(d) {
  var keepMute = state.mute, keepTime = state.time, keepSet = state.settings;
  state = {
    phase: 'play', time: keepTime, day: d.day, dayT: d.dayT, nightF: 0,
    boat: d.boat, res: d.res, stats: d.stats,
    lv: { sail: 1, hull: 1, hold: 1, lamp: 1, net: 1, rudder: 1, lookout: 1 },
    weather: { cur: d.weather.cur, prev: d.weather.cur, next: pickWeatherNext(d.weather.cur), t: d.weather.t, warnT: 0, blend: 0 },
    explored: d.explored, islandsFound: d.islandsFound,
    cnt: Object.assign({ cacheOpen: 0, whirlEsc: 0, letters: 0 }, d.cnt || { pickup: 0, fish: 0, storms: 0, chests: 0, bottles: 0, trade: 0 }),
    dist: d.dist || 0, quest: d.quest || 0, luck: d.luck || 0,
    windfall: 0, letterDay: d.day || 1, freeplay: d.freeplay || 0,
    ach: d.ach || {}, islandDock: d.islandDock || {}, caches: d.caches || {}, settings: d.settings || keepSet,
    mute: d.mute !== undefined ? d.mute : keepMute,
    playSec: d.playSec || 0, hintShown: { ate: 1 }
  };
  var lvSrc = d.lv || {};
  for (var lk in state.lv) if (lvSrc[lk]) state.lv[lk] = lvSrc[lk];
  var def = WDEF[state.weather.cur];
  visW.amp = def.amp; visW.sunI = def.sunI;
  visW.skyTop = new THREE.Color(def.sky[0]);
  visW.skyBot = new THREE.Color(def.sky[1]);
  visW.seaDeep = new THREE.Color(def.sea[0]);
  visW.seaShal = new THREE.Color(def.sea[1]);
  visW.rain = state.weather.cur === 'storm' ? 0.5 : 0;
  visW.wind = def.w;
  resetWorld();
  for (var i = 0; i < islands.length; i++) islands[i].userData.found = !!state.islandsFound[islands[i].userData.id];
  for (var ci = 0; ci < islandCaches.length; ci++) {
    if (state.caches[islandCaches[ci].userData.islId]) {
      islandCaches[ci].userData.taken = true;
      islandCaches[ci].visible = false;
    }
  }
  boat.userData.camYaw = state.boat.heading + Math.PI;
  updateWeatherHUD();
  updateHUD();
  updateQuestHUD();
  updateBuffHUD();
  drawMini();
  $('menu').classList.add('off');
  $('hud').classList.add('on');
  $('over').classList.remove('on');
  state.phase = 'play';
  toast('欢迎回来，继续你的航行');
}

var lastT = performance.now();
var fpsN = 0, fpsT = 0, autoDropped = 0;
function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  var ts = window.__ts || 1;
  if (state.phase === 'play') { for (var k = 0; k < ts; k++) step(dt * timeScale); }
  else if (state.phase === 'menu') menuIdle(dt);
  fpsN++;
  fpsT += dt;
  if (fpsT >= 5) {
    var fps = fpsN / fpsT;
    fpsN = 0; fpsT = 0;
    if (fps < 26 && state.settings.hiRes && state.playSec > 15 && now - autoDropped > 20000) {
      autoDropped = now;
      state.settings.hiRes = false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      toast('已自动降低画质，让航行更流畅');
    }
  }
  updateFX(state.phase === 'pause' ? 0 : dt);
  renderer.render(scene, camera);
}

function boot() {
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  var saved = loadSave();
  if (saved && saved.settings) {
    state.settings = saved.settings;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.settings.hiRes ? 2 : 1.25));
  }
  if (saved && (saved.v === 3 || saved.v === 2)) $('btnResume').classList.add('on');
  $('btnStart').onclick = function () { initAudio(); newGame(); };
  $('btnResume').onclick = function () { initAudio(); var d = loadSave(); if (d) loadGame(d); else newGame(); };
  $('btnHelp').onclick = function () {
    var h = $('mhelp');
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
  };
  $('btnUpgrade').onclick = function () { if (state.phase === 'play') togglePanel(); };
  $('upclose').onclick = togglePanel;
  $('panelWrap').addEventListener('click', function (e) { if (e.target === this) togglePanel(); });
  $('btnLog').onclick = function () { if (state.phase === 'play') { if (logOpen) closeLog(); else openLog(); } };
  $('logclose').onclick = closeLog;
  $('logWrap').addEventListener('click', function (e) { if (e.target === this) closeLog(); });
  $('btnMute').onclick = function () { setMute(!state.mute); renderLog(); };
  $('btnMusic').onclick = function () {
    state.settings.music = state.settings.music === false;
    renderLog();
    save();
  };
  $('btnHiRes').onclick = function () {
    state.settings.hiRes = !state.settings.hiRes;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.settings.hiRes ? 2 : 1.25));
    renderLog();
    save();
  };
  $('btnReset').onclick = function () {
    var now = performance.now();
    if (now - resetArm < 2500) {
      closeLog();
      clearSave();
      newGame();
    } else {
      resetArm = now;
      toast('再点一次「重新开始」确认重开');
    }
  };
  $('btnPause').onclick = togglePause;
  $('burstBtn').onclick = tryBurst;
  $('btnRestart').onclick = function () {
    if (overMode === 'pause') { togglePause(); return; }
    clearSave();
    newGame();
  };
  $('btnFree').onclick = freeplay;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.phase === 'play') { save(); togglePause(); }
  });
  if ('ontouchstart' in window) {
    var ch = document.querySelector('#ctrlhint');
    if (ch) ch.innerHTML = '左侧滑动 升帆转向 · 右侧拖动 转视角 · <b style="color:#ef6f3c">船坞</b> 按钮升级';
  }
  $('loadnote').classList.add('off');
  requestAnimationFrame(loop);
}
boot();
