var DAYLEN = 150;
var WORLD_R = 880;
var CELL = 64;
var GRID_R = Math.ceil(WORLD_R / CELL);
var LUCK_T = 60;

var state = {
  phase: 'menu',
  time: 0,
  day: 1,
  dayT: 0.25,
  nightF: 0,
  boat: { x: 0, z: 0, heading: 0, speed: 0, sail: 0 },
  res: { wood: 10, food: 6, water: 6, gold: 0 },
  stats: { hunger: 100, thirst: 100, hull: 100 },
  lv: { sail: 1, hull: 1, hold: 1, lamp: 1, net: 1, rudder: 1 },
  weather: { cur: 'sun', prev: 'sun', next: 'breeze', t: 60, warnT: 0, blend: 0 },
  explored: {},
  islandsFound: {},
  cnt: { pickup: 0, fish: 0, storms: 0, chests: 0, bottles: 0, trade: 0, cacheOpen: 0, whirlEsc: 0, letters: 0 },
  dist: 0,
  quest: 0,
  luck: 0,
  windfall: 0,
  letterDay: 0,
  freeplay: 0,
  burst: 0,
  burstCd: 0,
  caches: {},
  ach: {},
  islandDock: {},
  settings: { hiRes: true, music: true },
  mute: false,
  playSec: 0,
  hintShown: {}
};

var UPG = {
  sail: {
    name: '船帆', icon: 'ui-sail', max: 5, svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 4c6 1 11 5 12 10-4 1-9-1-12-4V4z" fill="currentColor" opacity=".8"/><path d="M6 12c3 .6 5.5 2.5 7 5-3.2.5-5.5-.8-7-3v-2z" fill="currentColor" opacity=".5"/></svg>',
    eff: function (l) { return '航速 ' + (6.5 + l * 1.4).toFixed(1) + ' 节 · 帆面更大'; },
    costG: [25, 55, 95, 150, 220],
    costW: [8, 15, 25, 40, 60]
  },
  hull: {
    name: '船体', icon: 'ui-hull', max: 5, svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 12l2-4h14l2 4-4 6H7l-4-6z" fill="currentColor" opacity=".8"/><path d="M5 8l1-3h12l1 3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 12h8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></svg>',
    eff: function (l) { return '耐久上限 ' + (100 + (l - 1) * 35) + ' · 抗浪+' + ((l - 1) * 18) + '%'; },
    costG: [20, 45, 85, 140, 210],
    costW: [12, 22, 36, 55, 80]
  },
  hold: {
    name: '货舱', icon: 'ui-hold', max: 5, svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="9" width="16" height="11" rx="2" fill="currentColor" opacity=".8"/><path d="M4 10l8-6 8 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="13" width="4" height="4" rx="1" fill="#fff" opacity=".7"/></svg>',
    eff: function (l) { var c = holdCap(l); return '木材' + c[0] + ' 食物' + c[1] + ' 淡水' + c[2]; },
    costG: [15, 35, 70, 120, 180],
    costW: [5, 10, 18, 30, 45]
  },
  lamp: {
    name: '船灯', icon: 'ui-lamp', max: 3, svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3h6v5l2.5 9h-11L9 8V3z" fill="currentColor" opacity=".85"/><circle cx="12" cy="14" r="2.5" fill="#fff" opacity=".85"/><path d="M6 21h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    eff: function (l) { return '雾中视野 ' + (260 + (l - 1) * 130) + ' 米 · 灯光更亮'; },
    costG: [30, 70, 130],
    costW: [4, 8, 14]
  },
  net: {
    name: '渔网', icon: 'ui-net', max: 3, svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 6c6 3 12 3 18 0M3 11c6 3 12 3 18 0M3 16c6 3 12 3 18 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="12" cy="13" rx="7" ry="4" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="13" r="1.2" fill="currentColor"/></svg>',
    eff: function (l) { return '打捞半径 ' + (3.2 + l * 2.6).toFixed(1) + ' 米 · 船停稳可撒网捕鱼'; },
    costG: [40, 90, 160],
    costW: [6, 12, 20]
  },
  rudder: {
    name: '舵轮', icon: 'ui-rud', max: 3, svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5 5l2.8 2.8M16.2 16.2L19 19M19 5l-2.8 2.8M7.8 16.2L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    eff: function (l) { return '转向灵敏度 +' + Math.round((l - 1) * 18) + '%'; },
    costG: [30, 80, 150],
    costW: [6, 12, 24]
  },
  lookout: {
    name: '瞭望台', icon: 'ui-look', max: 3, svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20L14 10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12.5 4.5l7 7-3 3-7-7 3-3z" fill="currentColor" opacity=".85"/><path d="M17.5 3l3.5 3.5-1.8 1.8-3.5-3.5L17.5 3z" fill="currentColor" opacity=".55"/></svg>',
    eff: function (l) { return '发现岛屿距离 +' + Math.round((l - 1) * 40) + '%'; },
    costG: [40, 90, 160],
    costW: [6, 14, 26]
  }
};

var BUILD_NEED = { sail: 3, hull: 3, wood: 120, gold: 150 };

var QUESTS = [
  { id: 'pickup', name: '初试身手', desc: '打捞 3 个漂浮物', target: 3, rg: 15 },
  { id: 'supply', name: '备足淡水口粮', desc: '同时持有食物 10 与淡水 10', target: 10, rg: 15 },
  { id: 'sail2', name: '快一点，再快一点', desc: '把船帆升到 2 级', target: 2, rg: 0, rw: 20 },
  { id: 'island2', name: '岛屿勘测员', desc: '发现 2 座岛屿', target: 2, rg: 30 },
  { id: 'fish2', name: '满载而归', desc: '在鱼群上停船撒网捕鱼 2 次', target: 2, rg: 25 },
  { id: 'storm1', name: '风暴挑战者', desc: '完整挺过一场雷暴天气', target: 1, rg: 40 },
  { id: 'net2', name: '大网撒开', desc: '把渔网升到 2 级', target: 2, rg: 0, rw: 25 },
  { id: 'exp20', name: '绘制海图', desc: '海图探索达到 20%', target: 20, rg: 60 }
];

var ACHS = [
  { id: 'catch1', name: '初试身手', desc: '打捞第一个漂浮物', rew: 10, t: function () { return state.cnt.pickup >= 1; } },
  { id: 'chest1', name: '寻宝猎人', desc: '打捞第一个漂流宝箱', rew: 30, t: function () { return state.cnt.chests >= 1; } },
  { id: 'fish5', name: '开心的渔夫', desc: '捕鱼攒渔获', rew: 30, t: function () { return state.cnt.fish >= 5; }, p: function () { return [Math.min(state.cnt.fish, 5), 5]; } },
  { id: 'storm3', name: '风暴老手', desc: '完整挺过雷暴', rew: 50, t: function () { return state.cnt.storms >= 3; }, p: function () { return [Math.min(state.cnt.storms, 3), 3]; } },
  { id: 'isl5', name: '群岛贵客', desc: '发现岛屿', rew: 50, t: function () { return Object.keys(state.islandsFound).length >= 5; }, p: function () { return [Math.min(Object.keys(state.islandsFound).length, 5), 5]; } },
  { id: 'dist10', name: '远航者', desc: '累计航行 10 公里', rew: 40, t: function () { return state.dist >= 10000; }, p: function () { return [Math.min(Math.round(state.dist / 100) / 10, 10), 10]; } },
  { id: 'maxsail', name: '满帆疾驰', desc: '船帆升到满级', rew: 60, t: function () { return state.lv.sail >= 5; }, p: function () { return [Math.min(state.lv.sail, 5), 5]; } },
  { id: 'rich', name: '小有积蓄', desc: '同时持有 300 金币', rew: 20, t: function () { return state.res.gold >= 300; } },
  { id: 'bottle3', name: '漂流瓶笔友', desc: '捡到漂流瓶', rew: 40, t: function () { return state.cnt.bottles >= 3; }, p: function () { return [Math.min(state.cnt.bottles, 3), 3]; } },
  { id: 'exp50', name: '大制图师', desc: '海图探索达到 50%', rew: 80, t: function () { return explorePct() >= 50; }, p: function () { return [Math.min(explorePct(), 50), 50]; } },
  { id: 'whirl1', name: '漩口余生', desc: '第一次逃出漩涡引力', rew: 30, t: function () { return state.cnt.whirlEsc >= 1; } },
  { id: 'cache3', name: '藏宝图大师', desc: '打开岛屿宝藏', rew: 50, t: function () { return state.cnt.cacheOpen >= 3; }, p: function () { return [Math.min(state.cnt.cacheOpen, 3), 3]; } },
  { id: 'rich2', name: '海上富商', desc: '同时持有 800 金币', rew: 60, t: function () { return state.res.gold >= 800; } },
  { id: 'ready', name: '巨轮在望', desc: '船帆与船体都升到 3 级', rew: 50, t: function () { return state.lv.sail >= 3 && state.lv.hull >= 3; }, p: function () { return [Math.min(state.lv.sail, 3) + Math.min(state.lv.hull, 3), 6]; } }
];

var TRADES = [
  { id: 't1', label: '10 木材 → 32 金币', give: { wood: 10 }, get: { gold: 32 } },
  { id: 't2', label: '18 金币 → 12 食物 + 12 淡水', give: { gold: 18 }, get: { food: 12, water: 12 } },
  { id: 't3', label: '25 金币 → 35 木材', give: { gold: 25 }, get: { wood: 35 } }
];

var WDEF = {
  sun: { name: '晴朗', desc: '风平浪静，适合航行', amp: 0.55, fogFar: 760, sunI: 1.0, sky: ['#7ec8ee', '#eaf7fd'], sea: ['#37a7d8', '#8fd8ef'], w: 0.62 },
  breeze: { name: '起风', desc: '浪渐增大，航速提升', amp: 1.0, fogFar: 640, sunI: 0.92, sky: ['#8fcbe8', '#eef6f8'], sea: ['#2f9ccc', '#84cfe8'], w: 0.24 },
  fog: { name: '浓雾', desc: '视野受限，小心礁石', amp: 0.7, fogFar: 0, sunI: 0.75, sky: ['#b8d2de', '#eef3f5'], sea: ['#4f9fbf', '#93c4d4'], w: 0.14 },
  drizzle: { name: '细雨', desc: '蒙蒙细雨，淡水自生', amp: 0.8, fogFar: 560, sunI: 0.85, sky: ['#9db8c8', '#dfe9ee'], sea: ['#3395bd', '#7fc3da'], w: 0.35 },
  storm: { name: '雷暴', desc: '巨浪拍船！打捞有加成', amp: 2.1, fogFar: 420, sunI: 0.55, sky: ['#5f7f9a', '#a8bfd0'], sea: ['#2a7ba6', '#6fb0c9'], w: 0 }
};

var WSEQ = { sun: ['breeze', 'fog', 'drizzle'], breeze: ['sun', 'fog', 'storm'], fog: ['sun', 'breeze', 'drizzle'], drizzle: ['sun', 'breeze'], storm: ['breeze', 'sun'] };
var WTIME = { sun: [70, 110], breeze: [50, 85], fog: [36, 58], drizzle: [40, 70], storm: [30, 46] };
(function () {
  for (var k in WDEF) {
    WDEF[k].skyC = [new THREE.Color(WDEF[k].sky[0]), new THREE.Color(WDEF[k].sky[1])];
    WDEF[k].seaC = [new THREE.Color(WDEF[k].sea[0]), new THREE.Color(WDEF[k].sea[1])];
  }
})();

var WSVG = {
  sun: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.6" fill="#ffd75e"/><g stroke="#f5b93c" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19"/></g></svg>',
  breeze: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 9a3.4 3.4 0 0 1 0-6.8c1.6 0 2.6 1 3 2.2" stroke="#5b8fb5" stroke-width="2" stroke-linecap="round"/><path d="M7 9h9.5a3 3 0 1 1 0 6H8" stroke="#5b8fb5" stroke-width="2" stroke-linecap="round"/><path d="M5 15h6.5" stroke="#8fc3e5" stroke-width="2" stroke-linecap="round"/></svg>',
  fog: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8c2.5-2.2 5.5-2.2 8 0s5.5 2.2 8 0" stroke="#7fa0b8" stroke-width="2.2" stroke-linecap="round"/><path d="M4 13c2.5-2.2 5.5-2.2 8 0s5.5 2.2 8 0" stroke="#9db9cc" stroke-width="2.2" stroke-linecap="round"/><path d="M6 18c2-1.6 4.4-1.6 6.4 0s4 1.6 5.6 0" stroke="#b9d0de" stroke-width="2.2" stroke-linecap="round"/></svg>',
  drizzle: '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 12a4.2 4.2 0 0 1 .5-8.4 5.4 5.4 0 0 1 10.2 1.3A3.8 3.8 0 0 1 17.3 12H6.5z" fill="#7d9cb5"/><g stroke="#5fa8d6" stroke-width="2" stroke-linecap="round"><path d="M8 15.5l-1 2.6M12.5 15.5l-1 2.6M17 15.5l-1 2.6"/></g></svg>',
  storm: '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 14a4 4 0 0 1 .5-8 5.2 5.2 0 0 1 9.8 1.2A3.6 3.6 0 0 1 17 14H6.5z" fill="#5c7d99"/><path d="M12.5 14l-3 4.4h2.6l-1.6 3.8 4.7-5.3h-2.5l1.8-2.9h-2z" fill="#ffd75e"/></svg>'
};

function holdCap(l) { return [50 + (l - 1) * 30, 20 + (l - 1) * 12, 20 + (l - 1) * 12]; }
function maxHull() { return 100 + (state.lv.hull - 1) * 35; }
function boatSpeedMax() { return 6.5 + state.lv.sail * 1.4; }
function pickupR() { return state.lv.net === 0 ? 0 : 3.2 + state.lv.net * 2.6; }
function fogFarBase() { return 260 + (state.lv.lamp - 1) * 130; }
function turnMult() { return 1 + (state.lv.rudder - 1) * 0.18; }

function save() {
  try {
    var d = {
      v: 4, time: state.time, day: state.day, dayT: state.dayT,
      boat: state.boat, res: state.res, stats: state.stats, lv: state.lv,
      weather: { cur: state.weather.cur, t: state.weather.t },
      explored: state.explored, islandsFound: state.islandsFound,
      cnt: state.cnt, dist: state.dist, quest: state.quest, luck: state.luck,
      ach: state.ach, islandDock: state.islandDock, caches: state.caches,
      settings: state.settings,
      playSec: state.playSec, mute: state.mute
    };
    localStorage.setItem('nuhai_save', JSON.stringify(d));
  } catch (e) { }
}
function loadSave() {
  try {
    var s = localStorage.getItem('nuhai_save');
    if (!s) return null;
    var d = JSON.parse(s);
    if (!d || (d.v !== 4 && d.v !== 3 && d.v !== 2 && d.v !== 1)) return null;
    return d;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem('nuhai_save'); } catch (e) { } }

var AC = null, masterG = null, ambG = null, ambSrc = null, ambFilter = null;
var rainG = null, rainSrc = null, rainFilter = null;
function makeNoiseSrc() {
  var len = AC.sampleRate * 2;
  var buf = AC.createBuffer(1, len, AC.sampleRate);
  var ch = buf.getChannelData(0);
  var last = 0;
  for (var i = 0; i < len; i++) { var wn = Math.random() * 2 - 1; last = (last + 0.02 * wn) / 1.02; ch[i] = last * 3.2; }
  var src = AC.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterG = AC.createGain();
    masterG.gain.value = state.mute ? 0 : 0.8;
    masterG.connect(AC.destination);
    ambSrc = makeNoiseSrc();
    ambFilter = AC.createBiquadFilter(); ambFilter.type = 'lowpass'; ambFilter.frequency.value = 420;
    ambG = AC.createGain(); ambG.gain.value = 0.05;
    ambSrc.connect(ambFilter); ambFilter.connect(ambG); ambG.connect(masterG);
    ambSrc.start();
    rainSrc = makeNoiseSrc();
    rainFilter = AC.createBiquadFilter(); rainFilter.type = 'highpass'; rainFilter.frequency.value = 1800;
    rainG = AC.createGain(); rainG.gain.value = 0;
    rainSrc.connect(rainFilter); rainFilter.connect(rainG); rainG.connect(masterG);
    rainSrc.start();
  } catch (e) { AC = null; }
}
function setMute(m) {
  state.mute = m;
  if (masterG) masterG.gain.value = m ? 0 : 0.8;
}
function blip(freq, dur, type, vol, slide) {
  if (!AC || state.mute) return;
  try {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), AC.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g); g.connect(masterG);
    o.start(); o.stop(AC.currentTime + dur + 0.02);
  } catch (e) { }
}
var MNOTES = [523.25, 587.33, 659.25, 783.99, 880.0];
function sfxPluck(f, harmony) {
  if (!AC || state.mute) return;
  try {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.045, AC.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 1.1);
    var fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1600;
    o.connect(fl); fl.connect(g); g.connect(masterG);
    o.start(); o.stop(AC.currentTime + 1.15);
    if (harmony) setTimeout(function () { sfxPluck(f * 1.26, false); }, 95);
  } catch (e) { }
}
function sfxPickup(kind) {
  if (kind === 'gold') blip(880, 0.22, 'triangle', 0.2, 1320);
  else if (kind === 'chest') { blip(520, 0.3, 'triangle', 0.22, 780); setTimeout(function () { blip(780, 0.35, 'triangle', 0.2, 1170); }, 140); }
  else if (kind === 'bottle') { blip(620, 0.25, 'sine', 0.18, 930); }
  else if (kind === 'fish') { blip(300, 0.18, 'sine', 0.18, 540); setTimeout(function () { blip(540, 0.2, 'sine', 0.15, 720); }, 130); }
  else blip(440 + Math.random() * 120, 0.16, 'sine', 0.16, 620);
}
function sfxUp() { blip(392, 0.16, 'triangle', 0.18); setTimeout(function () { blip(523, 0.16, 'triangle', 0.18); }, 120); setTimeout(function () { blip(659, 0.3, 'triangle', 0.18); }, 240); }
function sfxQuest() {
  var seq = [523.25, 659.25, 783.99, 1046.5];
  for (var i = 0; i < seq.length; i++) (function (f, d) { setTimeout(function () { sfxPluck(f, i === 3); }, d); })(seq[i], i * 130);
}
function sfxGull() { blip(1180 + Math.random() * 300, 0.14, 'sawtooth', 0.045, 1600); setTimeout(function () { blip(1000 + Math.random() * 200, 0.1, 'sawtooth', 0.035, 700); }, 150); }
function sfxThunder() {
  if (!AC || state.mute) return;
  try {
    var dur = 1.6, len = Math.floor(AC.sampleRate * dur);
    var buf = AC.createBuffer(1, len, AC.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { var t = i / len; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * (t < 0.04 ? t / 0.04 : 1); }
    var src = AC.createBufferSource(); src.buffer = buf;
    var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
    var g = AC.createGain(); g.gain.value = 0.6;
    src.connect(f); f.connect(g); g.connect(masterG); src.start();
  } catch (e) { }
}
function sfxCrash() { blip(120, 0.4, 'sawtooth', 0.25, 55); }
function sfxLose() { blip(330, 0.5, 'sine', 0.2, 165); setTimeout(function () { blip(220, 0.9, 'sine', 0.2, 82); }, 350); }
function sfxWin() {
  var seq = [523, 659, 784, 1046];
  for (var i = 0; i < seq.length; i++) (function (f, d) { setTimeout(function () { blip(f, 0.35, 'triangle', 0.2); }, d); })(seq[i], i * 180);
}
function sfxDolphin() { blip(980, 0.12, 'sine', 0.14, 1400); setTimeout(function () { blip(1180, 0.1, 'sine', 0.12, 1500); }, 110); }
function sfxBurst() {
  if (!AC || state.mute) return;
  try {
    var dur = 0.7, len = Math.floor(AC.sampleRate * dur);
    var buf = AC.createBuffer(1, len, AC.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var t = i / len;
      ch[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
    }
    var src = AC.createBufferSource(); src.buffer = buf;
    var f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    var g = AC.createGain(); g.gain.value = 0.3;
    src.connect(f); f.connect(g); g.connect(masterG); src.start();
    blip(340, 0.4, 'sine', 0.1, 620);
  } catch (e) { }
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function angLerp(a, b, t) {
  var d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function fmtClock(dayT) {
  var h = Math.floor(dayT * 24), m = Math.floor((dayT * 24 - h) * 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function waveH(x, z, t, amp) {
  return (Math.sin(x * 0.055 + t * 1.1) + Math.sin(z * 0.047 - t * 0.9) + Math.sin((x + z) * 0.031 + t * 0.6) * 1.3) * amp * 0.62;
}
function waveSlope(x, z, t, amp) {
  var e = 0.6;
  var hx = waveH(x + e, z, t, amp) - waveH(x - e, z, t, amp);
  var hz = waveH(x, z + e, t, amp) - waveH(x, z - e, t, amp);
  return { x: hx / (2 * e), z: hz / (2 * e) };
}
function ringDist(x, z) { return Math.sqrt(x * x + z * z); }
function hashSeed(n) {
  var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { }
}
