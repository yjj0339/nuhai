var keys = {};
window.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (e.code === 'KeyE' && state.phase === 'play') togglePanel();
  if (e.code === 'KeyM') { setMute(!state.mute); toast(state.mute ? '声音已关闭' : '声音已开启'); }
  if ((e.code === 'KeyP' || e.code === 'Escape') && (state.phase === 'play' || state.phase === 'pause')) togglePause();
  if (e.code === 'Space' && state.phase === 'play') e.preventDefault();
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });

canvas.addEventListener('wheel', function (e) {
  e.preventDefault();
  camCtl.dist = clamp(camCtl.dist + e.deltaY * 0.012, 9, 34);
}, { passive: false });

var touch = { joy: null, cam: null, steer: 0, sailIn: 0 };
var joyBase = null, joyKnob = null;
function joyShow(x, y) {
  if (!joyBase) { joyBase = document.getElementById('joyBase'); joyKnob = document.getElementById('joyKnob'); }
  joyBase.style.display = 'block';
  joyBase.style.left = x + 'px';
  joyBase.style.top = y + 'px';
  joyKnob.style.transform = 'translate(-50%,-50%)';
}
function joyMove(x, y) {
  if (!joyBase) return;
  joyKnob.style.transform = 'translate(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px))';
}
function joyHide() { if (joyBase) joyBase.style.display = 'none'; }

canvas.addEventListener('touchstart', function (e) {
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (t.clientX < window.innerWidth * 0.55 && !touch.joy) {
      touch.joy = { id: t.identifier, x0: t.clientX, y0: t.clientY };
      joyShow(t.clientX, t.clientY);
    }
    else if (!touch.cam) touch.cam = { id: t.identifier, x: t.clientX };
  }
}, { passive: false });
canvas.addEventListener('touchmove', function (e) {
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (touch.joy && t.identifier === touch.joy.id) {
      var dx = t.clientX - touch.joy.x0, dy = t.clientY - touch.joy.y0;
      touch.steer = clamp(dx / 62, -1, 1);
      touch.sailIn = clamp(-dy / 62, -1, 1);
      var len = Math.hypot(dx, dy);
      if (len > 40) { dx = dx / len * 40; dy = dy / len * 40; }
      joyMove(dx, dy);
    } else if (touch.cam && t.identifier === touch.cam.id) {
      camCtl.user -= (t.clientX - touch.cam.x) * 0.008;
      touch.cam.x = t.clientX;
    }
  }
}, { passive: false });
function touchEnd(e) {
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (touch.joy && t.identifier === touch.joy.id) { touch.joy = null; touch.steer = 0; touch.sailIn = 0; joyHide(); }
    if (touch.cam && t.identifier === touch.cam.id) touch.cam = null;
  }
}
canvas.addEventListener('touchend', touchEnd);
canvas.addEventListener('touchcancel', touchEnd);

var visW = {
  amp: 0.55, fogFar: 760, sunI: 1.0,
  skyTop: new THREE.Color('#7ec8ee'), skyBot: new THREE.Color('#eaf7fd'),
  seaDeep: new THREE.Color('#37a7d8'), seaShal: new THREE.Color('#8fd8ef'),
  fogC: new THREE.Color('#eaf7fd'), rain: 0, wind: 0.62
};
var lightning = { t: 5, flash: 0 };
var hitCD = 0, edgeCD = 0, eatT = 0, drinkT = 0, fixT = 0, spawnT = 1.5, expT = 0, fullHintCD = 0;
var windAng = 0;
var dolphinT = 70, whaleT = 140, merchantT = 110, dolphinOn = 0;
var stormSurviveFlag = false;

function pickWeatherNext(cur) {
  var n = pick(WSEQ[cur]);
  var d = ringDist(state.boat.x, state.boat.z);
  if (n === 'storm' && d < 300 && Math.random() < 0.45) n = 'breeze';
  if (n !== 'storm' && n !== 'fog' && d > 620 && Math.random() < 0.22) n = 'storm';
  return n;
}

function updateWeather(dt) {
  var w = state.weather;
  w.t -= dt;
  if (w.t <= 8 && w.t + dt > 8 && w.next !== w.cur) showWarn(w.next);
  if (w.t <= 0) {
    w.prev = w.cur; w.cur = w.next;
    if (w.prev === 'storm' && stormSurviveFlag) {
      state.cnt.storms++;
      stormSurviveFlag = false;
      checkQuests();
    }
    if (w.cur === 'storm') stormSurviveFlag = true;
    w.next = pickWeatherNext(w.cur);
    w.t = rand(WTIME[w.cur][0], WTIME[w.cur][1]);
    if (w.prev === 'storm' && (w.cur === 'sun' || w.cur === 'breeze') && state.dayT > 0.27 && state.dayT < 0.78) {
      spawnRainbow();
      toast('风暴过去了，天边挂起一道彩虹', 'gold');
    }
    hideWarn();
    onWeatherChange();
  }
  var def = WDEF[w.cur];
  var targetFar = w.cur === 'fog' ? fogFarBase() : def.fogFar;
  visW.amp = lerp(visW.amp, def.amp, dt * 0.5);
  visW.fogFar = lerp(visW.fogFar, targetFar, dt * 0.5);
  visW.sunI = lerp(visW.sunI, def.sunI, dt * 0.5);
  visW.skyTop.lerp(def.skyC[0], dt * 0.5);
  visW.skyBot.lerp(def.skyC[1], dt * 0.5);
  visW.seaDeep.lerp(def.seaC[0], dt * 0.5);
  visW.seaShal.lerp(def.seaC[1], dt * 0.5);
  visW.fogC.copy(visW.skyBot);
  var rainT = w.cur === 'storm' ? 0.5 : w.cur === 'drizzle' ? 0.22 : 0;
  visW.rain = lerp(visW.rain, rainT, dt * 0.8);
  if (rainG) rainG.gain.value = visW.rain * 0.14;
  visW.wind = lerp(visW.wind, def.w, dt * 0.4);

  if (w.cur === 'storm') {
    var dmg = Math.max(0.3, 1.55 - (state.lv.hull - 1) * 0.24);
    state.stats.hull -= dmg * dt;
    state.res.water = Math.min(holdCap(state.lv.hold)[2], state.res.water + 1.5 * dt);
    lightning.t -= dt;
    if (lightning.t <= 0) {
      lightning.t = rand(2.5, 8);
      lightning.flash = 1;
      sfxThunder();
    }
  }
  lightning.flash = Math.max(0, lightning.flash - dt * 2.8);
  windAng += dt * 0.12;
  if (rainbow) {
    rainbow.userData.life += dt / 24;
    var rlt = rainbow.userData.life;
    if (rlt >= 1) {
      scene.remove(rainbow);
      rainbow = null;
    } else {
      var rop = rlt < 0.12 ? rlt / 0.12 : rlt > 0.7 ? Math.max(0, (1 - rlt) / 0.3) : 1;
      rainbow.material.opacity = rop * 0.85;
    }
  }
}

function onWeatherChange() {
  var w = state.weather;
  var msgs = {
    sun: '天气转晴，海面平静',
    breeze: '起风了，正好扬帆',
    fog: '浓雾来袭，打开船灯慢行',
    storm: '雷暴来袭！挺过去就是胜利'
  };
  toast(msgs[w.cur], w.cur === 'storm' ? 'gold' : '');
  if (w.cur === 'storm' && !state.hintShown.stormTip) {
    state.hintShown.stormTip = 1;
    toast('雷暴中打捞收益 +50%，风险与机遇并存');
  }
  if (ambG) ambG.gain.value = w.cur === 'storm' ? 0.16 : w.cur === 'breeze' ? 0.08 : 0.05;
  if (ambFilter) ambFilter.frequency.value = w.cur === 'storm' ? 700 : 420;
  updateWeatherHUD();
}

var _cNightTop = new THREE.Color('#1c3a5e').lerp(new THREE.Color('#0f2440'), 0.35);
var _cNightBot = new THREE.Color('#41678e');
var _cDuskTop = new THREE.Color('#7a6f96');
var _cDuskBot = new THREE.Color('#f4c99a');
var _cNightFog = new THREE.Color('#3d5c7e');
var _sunDirBack = new THREE.Vector3(-0.3, 0.5, -0.4);
var _sunDir = new THREE.Vector3();
var _cTop = new THREE.Color();
var _cBot = new THREE.Color();
var _cNightSea = new THREE.Color('#1e4a6e');
var _cSea1 = new THREE.Color();
var _cSea2 = new THREE.Color();

function updateDayNight(dt) {
  state.dayT += dt / DAYLEN;
  if (state.dayT >= 1) { state.dayT -= 1; state.day++; toast('第 ' + state.day + ' 天开始了', 'gold'); placeWhirlpools(state.day); }
  var elev = Math.sin((state.dayT - 0.25) * Math.PI * 2);
  var night = clamp(-elev * 1.8, 0, 1);
  var dusk = clamp(1 - Math.abs(elev) * 2.6, 0, 1);
  var sunA = (state.dayT - 0.25) * Math.PI * 2;
  var sd = _sunDir.set(Math.cos(sunA) * 0.7, Math.max(0.12, Math.sin(sunA)), 0.45).normalize();
  var moonA = sunA + Math.PI;
  skyMat.uniforms.uMoonDir.value.set(Math.cos(moonA) * 0.7, Math.max(0.12, Math.sin(moonA)), 0.45).normalize();
  skyMat.uniforms.uSunDir.value.copy(elev > 0 ? sd : _sunDirBack);
  seaMat.uniforms.uSun.value.copy(skyMat.uniforms.uSunDir.value);

  _cTop.copy(visW.skyTop).lerp(_cDuskTop, dusk).lerp(_cNightTop, night);
  _cBot.copy(visW.skyBot).lerp(_cDuskBot, dusk).lerp(_cNightBot, night);
  skyMat.uniforms.uTop.value.copy(_cTop);
  skyMat.uniforms.uBot.value.copy(_cBot);
  skyMat.uniforms.uNight.value = night;

  _cBot.copy(visW.fogC).lerp(_cNightFog, night * 0.8);
  scene.fog.color.copy(_cBot);
  scene.fog.far = visW.fogFar * (1 - night * 0.3);
  scene.fog.near = scene.fog.far * 0.09;

  hemi.intensity = lerp(0.85 * visW.sunI + 0.25, 0.62, night);
  hemi.color.set(night > 0.5 ? '#8fb4d8' : '#bfe8ff');
  if (elev > -0.08) {
    sun.color.set(night > 0.4 ? '#a8c8ee' : dusk > 0.4 ? '#ffd9a8' : '#fff4dd');
    sun.intensity = lerp(Math.max(0.25, visW.sunI * 1.25), 0.5, night) + lightning.flash * 2.2;
    sun.position.copy(sd).multiplyScalar(260);
  } else {
    sun.color.set('#a8c8ee');
    sun.intensity = 0.42 + lightning.flash * 2.2;
    sun.position.set(-90, 140, -120);
  }
  var lampOn = night > 0.25 || state.weather.cur === 'fog' || state.weather.cur === 'storm';
  boat.userData.lampLight.intensity = lampOn ? 0.9 + Math.sin(state.time * 7) * 0.06 : 0;
  boat.userData.lampBulb.material.color.set(lampOn ? '#ffe9a8' : '#d8c9a0');
  boat.userData.lampGlow.material.opacity = lampOn ? 0.75 : 0.12;
  state.nightF = night;
}

function tryBurst() {
  if (state.phase !== 'play') return;
  if (state.burstCd > 0 || state.burst > 0) return;
  state.burst = 2.5;
  state.burstCd = 25;
  sfxBurst();
  toast('乘风突进！');
}

function updateBoat(dt) {
  var b = state.boat;
  if (keys.Space) tryBurst();
  state.burst = Math.max(0, state.burst - dt);
  state.burstCd = Math.max(0, state.burstCd - dt);
  var up = (keys.KeyW || keys.ArrowUp || touch.sailIn > 0.15) ? 1 : 0;
  var dn = (keys.KeyS || keys.ArrowDown || touch.sailIn < -0.15) ? 1 : 0;
  var lf = (keys.KeyA || keys.ArrowLeft || touch.steer < -0.1) ? 1 : 0;
  var rt = (keys.KeyD || keys.ArrowRight || touch.steer > 0.1) ? 1 : 0;
  b.sail = clamp(b.sail + (up - dn) * dt * 0.75, 0, 1);
  var maxS = boatSpeedMax() * (state.weather.cur === 'breeze' ? 1.1 : state.weather.cur === 'storm' ? 0.82 : 1);
  if (state.windfall > 0) maxS *= 1.15;
  if (state.burst > 0) maxS *= 1.55;
  var target = b.sail * maxS;
  var oldX = b.x, oldZ = b.z;
  b.speed = lerp(b.speed, target, dt * (target > b.speed ? 0.32 : 0.5));
  var rud = rt - lf;
  if (touch.steer !== 0) rud = touch.steer;
  b.rud = b.rud === undefined ? 0 : lerp(b.rud, rud, Math.min(1, dt * 7));
  var spdF = 0.35 + (b.speed / Math.max(1, boatSpeedMax())) * 0.7;
  b.heading -= b.rud * dt * 1.15 * spdF * turnMult();
  var fx = Math.sin(b.heading), fz = Math.cos(b.heading);
  b.x += fx * b.speed * dt;
  b.z += fz * b.speed * dt;
  state.dist += Math.hypot(b.x - oldX, b.z - oldZ);

  if (state.weather.cur === 'storm') {
    b.x += Math.cos(windAng) * 1.1 * dt;
    b.z += Math.sin(windAng) * 1.1 * dt;
  }

  var d = ringDist(b.x, b.z);
  if (d > WORLD_R) {
    b.x *= WORLD_R / d; b.z *= WORLD_R / d;
    edgeCD -= dt;
    if (edgeCD <= 0) { toast('已是海域尽头，调头探索别处吧'); edgeCD = 8; }
  }

  hitCD = Math.max(0, hitCD - dt);
  for (var i = 0; i < islands.length; i++) {
    var u = islands[i].userData;
    var dd = Math.hypot(b.x - u.x, b.z - u.z);
    if (dd < u.r + 2.2) {
      var nx = (b.x - u.x) / dd, nz = (b.z - u.z) / dd;
      b.x = u.x + nx * (u.r + 2.2); b.z = u.z + nz * (u.r + 2.2);
      if (hitCD <= 0 && b.speed > 2) {
        state.stats.hull -= 5; hitCD = 1.2; sfxCrash();
        toast('撞上了 ' + u.name + ' 的浅滩！');
      }
      b.speed *= 0.4;
    } else if (!u.found && dd < (u.r + 75) * (1 + (state.lv.lookout - 1) * 0.4)) {
      u.found = true;
      state.islandsFound[u.id] = 1;
      var ig = u.lighthouse ? 30 : 15;
      state.res.gold += ig;
      if (u.lighthouse) {
        toast('发现 ' + u.name + '！灯塔守望者赠予金币 +' + ig, 'gold');
      } else {
        toast('发现新岛屿：' + u.name + '，金币 +' + ig, 'gold');
      }
      if (!u.tag) {
        u.tag = textSprite(u.name);
        u.tag.position.set(u.x, r + 26, u.z);
        u.tag.userData.life = 4;
        scene.add(u.tag);
      } else {
        u.tag.userData.life = 4;
        u.tag.visible = true;
      }
      blip(660, 0.3, 'triangle', 0.2, 990);
      checkQuests();
      checkAch();
    }
  }
  var dockNear = false;
  for (var di = 0; di < islands.length; di++) {
    var du = islands[di].userData;
    var dd2 = Math.hypot(b.x - du.x, b.z - du.z);
    if (dd2 < du.r + 12 && b.speed < 1.6) {
      dockNear = true;
      du.dockT = (du.dockT || 0) + dt;
      if (du.dockT > 0.35 && du.dockT < 0.5 && state.islandDock[du.id] !== state.day) showPrompt('停在岛边，即可靠岸补给…');
      if (du.dockT >= 1.6 && state.islandDock[du.id] !== state.day) {
        state.islandDock[du.id] = state.day;
        var dc = holdCap(state.lv.hold);
        var dfd = Math.min(8, dc[1] - Math.floor(state.res.food));
        if (dfd > 0) state.res.food += dfd;
        var dwt = Math.min(8, dc[2] - Math.floor(state.res.water));
        if (dwt > 0) state.res.water += dwt;
        var dwd = Math.min(4, dc[0] - Math.floor(state.res.wood));
        if (dwd > 0) state.res.wood += dwd;
        hidePrompt();
        toast('在 ' + du.name + ' 靠岸补给：食物+8 淡水+8 木材+4（每日一次）', 'gold');
        sfxPickup('food');
        updateHUD();
        checkAch();
      }
    } else {
      du.dockT = 0;
    }
  }
  if (!dockNear) hidePrompt();
  for (var r = 0; r < rocks.length; r++) {
    var ru = rocks[r].userData;
    var rd = Math.hypot(b.x - ru.x, b.z - ru.z);
    if (rd < ru.r + 1.8) {
      var push = (ru.r + 1.8) / Math.max(rd, 0.01);
      b.x = ru.x + (b.x - ru.x) * push;
      b.z = ru.z + (b.z - ru.z) * push;
      if (hitCD <= 0 && b.speed > 2.5) {
        state.stats.hull -= 9; hitCD = 1.2; sfxCrash();
        toast('触礁了！船体受损');
      }
      b.speed *= 0.3;
    }
  }

  var wh = waveH(b.x, b.z, state.time, visW.amp);
  var sl = waveSlope(b.x, b.z, state.time, visW.amp);
  boat.position.set(b.x, wh + 0.32, b.z);
  var tPitch = clamp(sl.x * Math.cos(b.heading) + sl.z * Math.sin(b.heading), -0.4, 0.4) + (b.speed > 0.5 ? -0.05 : 0);
  var tRoll = clamp(-sl.x * Math.sin(b.heading) + sl.z * Math.cos(b.heading), -0.45, 0.45);
  if (state.weather.cur === 'storm') { tRoll += Math.sin(state.time * 1.7) * 0.06; tPitch += Math.sin(state.time * 1.3) * 0.03; }
  boat.rotation.x = lerp(boat.rotation.x, tPitch, dt * 2.5);
  boat.rotation.z = lerp(boat.rotation.z, tRoll, dt * 2.5);
  boat.rotation.y = b.heading;

  var sailW = 1 + (state.lv.sail - 1) * 0.05;
  var sailB = 0.12 + b.sail * 0.88;
  boat.userData.sail.scale.set(sailW, sailB * 0.9 + 0.1, sailB);
  boat.userData.stripe.scale.set(sailW, 1, sailB);
  boat.userData.foreSail.scale.set(1, 1, sailB);
  var slv = state.lv.sail;
  boat.userData.stripe2.visible = slv >= 3;
  boat.userData.stripe2.scale.set(sailW, 1, sailB);
  boat.userData.goldEdge.visible = slv >= 4;
  boat.userData.goldEdge.scale.set(sailW, 1, sailB);
  if (boat.userData.sailTier !== slv) {
    boat.userData.sailTier = slv;
    boat.userData.sail.material = slv >= 5 ? MAT.sailGold : MAT.sail;
    boat.userData.stripe.material = slv >= 5 ? MAT.sailGold : MAT.sailStripe;
  }
  var decoKey = (state.lv.hull >= 3 ? 1 : 0) | (state.lv.net >= 2 ? 2 : 0) | (state.lv.lookout >= 2 ? 4 : 0);
  if (boat.userData.decoKey !== decoKey) {
    boat.userData.decoKey = decoKey;
    var trims = boat.userData.goldTrims;
    for (var ti = 0; ti < trims.length; ti++) trims[ti].visible = !!(decoKey & 1);
    boat.userData.netMesh.visible = !!(decoKey & 2);
    boat.userData.pennant.visible = !!(decoKey & 4);
  }
  boat.userData.flag.rotation.y = Math.sin(state.time * 6) * 0.35;
  boat.userData.flag.scale.x = 0.5 + b.sail * 0.5;
  boat.userData.wheel.rotation.z -= b.rud * dt * 4 * spdF;
  updateCargoVisual();

  if (b.speed > boatSpeedMax() * 0.3 && Math.random() < dt * 26) spawnFoam(
    b.x - fx * 2.8 + rand(-0.9, 0.9), b.z - fz * 2.8 + rand(-0.9, 0.9), b.speed
  );
  if (state.burst > 0 && Math.random() < dt * 40) spawnFoam(
    b.x + fx * 2.2 + rand(-1.3, 1.3), b.z + fz * 2.2 + rand(-1.3, 1.3), b.speed * 1.4
  );

  var bx = b.x - fx * 2.6, bz = b.z - fz * 2.6;
  for (var wk = WAKE_N - 1; wk > 0; wk--) wakePts[wk] = wakePts[wk - 1];
  wakePts[0] = { x: bx, z: bz, h: waveH(bx, bz, state.time, visW.amp) };
  for (var wv = 0; wv < WAKE_N; wv++) {
    var wid = 0.55 + wv * 0.11;
    var px2 = wakePts[wv].x + Math.cos(b.heading) * wid;
    var pz2 = wakePts[wv].z - Math.sin(b.heading) * wid;
    var mx2 = wakePts[wv].x - Math.cos(b.heading) * wid;
    var mz2 = wakePts[wv].z + Math.sin(b.heading) * wid;
    wakePos[wv * 6] = px2; wakePos[wv * 6 + 1] = wakePts[wv].h + 0.12; wakePos[wv * 6 + 2] = pz2;
    wakePos[wv * 6 + 3] = mx2; wakePos[wv * 6 + 4] = wakePts[wv].h + 0.12; wakePos[wv * 6 + 5] = mz2;
    var fade = (1 - wv / WAKE_N) * clamp(b.speed / 5, 0, 1) * 0.9;
    wakeCol[wv * 6] = fade; wakeCol[wv * 6 + 1] = fade; wakeCol[wv * 6 + 2] = fade;
    wakeCol[wv * 6 + 3] = fade; wakeCol[wv * 6 + 4] = fade; wakeCol[wv * 6 + 5] = fade;
  }
  wakeGeo.attributes.position.needsUpdate = true;
  wakeGeo.attributes.color.needsUpdate = true;
}

function spawnFoam(x, z, sp) {
  for (var i = 0; i < FOAM_N; i++) {
    if (foamDat[i].life <= 0) {
      foamDat[i].life = rand(0.7, 1.3);
      foamDat[i].x = x; foamDat[i].z = z;
      foamDat[i].y = waveH(x, z, state.time, visW.amp) + 0.2;
      foamDat[i].vy = rand(0.8, 2.0);
      foamDat[i].s = sp;
      return;
    }
  }
}

function isNight() { return (state.nightF || 0) > 0.45; }

function floaterKindFor(d, storm) {
  var night = isNight();
  var g = d > 500 ? 0.24 : d > 250 ? 0.18 : 0.13;
  var c = storm ? 0.13 : 0.055;
  var r = Math.random();
  if (r < 0.26) return 'wood';
  if (r < 0.48) return 'food';
  if (r < 0.70) return 'water';
  if (r < 0.77) return 'fish';
  if (night && r < 0.84) return 'glow';
  if (r < 0.92 + g * 0.5) return 'gold';
  if (r < 0.95 + g * 0.5) return 'chest';
  if (r < 0.965) return 'bottle';
  return 'wood';
}

function updateFloaters(dt) {
  spawnT -= dt;
  if (state.letterDay !== state.day) {
    state.letterDay = state.day;
    var la = rand(0, 6.28);
    var ld = rand(35, 60);
    spawnFloater('letter', state.boat.x + Math.cos(la) * ld, state.boat.z + Math.sin(la) * ld);
    toast('一封金色的信随波漂来…', 'gold');
  }
  if (spawnT <= 0 && floaters.length < 42) {
    spawnT = state.weather.cur === 'storm' ? 1.4 : (state.luck > 0 ? 1.9 : 2.3);
    var ang = rand(0, Math.PI * 2);
    var dist = rand(38, 130);
    var x = state.boat.x + Math.cos(ang) * dist;
    var z = state.boat.z + Math.sin(ang) * dist;
    if (ringDist(x, z) < WORLD_R - 10) {
      spawnFloater(floaterKindFor(ringDist(x, z), state.weather.cur === 'storm'), x, z);
    }
  }
  var pr = pickupR();
  var take = [];
  var b = state.boat;
  for (var i = 0; i < floaters.length; i++) {
    var m = floaters[i];
    var u = m.userData;
    m.position.x += Math.cos(u.drift) * 0.25 * dt;
    m.position.z += Math.sin(u.drift) * 0.25 * dt;
    u.drift += Math.sin(state.time * 0.4 + u.ph) * 0.15 * dt;
    var baseY = u.kind === 'fish' ? -0.75 : 0.12;
    m.position.y = waveH(m.position.x, m.position.z, state.time, visW.amp) + baseY + Math.sin(state.time * 1.4 + u.ph) * 0.06;
    if (u.kind !== 'fish') m.rotation.y += dt * 0.25;
    var s = 1 + Math.sin(state.time * 2.2 + u.ph) * 0.09;
    u.ring.scale.set(s, s, 1);
    u.ring2.scale.set(2 - s, 2 - s, 1);
    if (u.kind === 'fish') {
      for (var fi = 0; fi < u.fishes.length; fi++) {
        var f = u.fishes[fi];
        f.userData.ph += dt * f.userData.sp;
        f.position.set(Math.cos(f.userData.ph) * f.userData.orbit, Math.sin(f.userData.ph * 2) * 0.25, Math.sin(f.userData.ph) * f.userData.orbit);
        f.rotation.y = -f.userData.ph + Math.PI / 2;
      }
      u.ripple.scale.setScalar(1 + Math.sin(state.time * 3 + u.ph) * 0.18);
      var bd = Math.hypot(m.position.x - b.x, m.position.z - b.z);
      if (bd < 6) {
        if (b.speed < 1.2) {
          u.hold += dt;
          if (u.hold > 2.2) { catchFish(m); continue; }
        } else u.hold = Math.max(0, u.hold - dt * 2);
      } else u.hold = 0;
    } else if (u.kind === 'glow' || u.kind === 'chest' || u.kind === 'bottle') {
      if (u.glow) u.glow.material.opacity = (isNight() ? 0.85 : 0.35) * (0.75 + Math.sin(state.time * 3 + u.ph) * 0.25);
    }
    var bd2 = Math.hypot(m.position.x - b.x, m.position.z - b.z);
    if (pr > 0 && u.kind !== 'fish' && bd2 < pr) take.push(m);
    else if (bd2 > 210) take.push(m);
  }
  for (var t = 0; t < take.length; t++) collectFloater(take[t]);
}

function catchFish(m) {
  var cap = holdCap(state.lv.hold);
  var got = Math.round(rand(7, 12) * (state.luck > 0 ? 1.25 : 1));
  var bf = Math.min(got, cap[1] - Math.floor(state.res.food));
  state.cnt.fish++;
  buzz(18);
  if (bf > 0) {
    state.res.food += bf;
    toast('一网捞起！食物 +' + bf, 'gold');
  } else {
    toast('鱼获满满，但货舱装不下了');
  }
  sfxPickup('fish');
  sparkle(m.position.x, m.position.y + 0.5, m.position.z, false);
  removeFloater(m);
  checkQuests();
  checkAch();
}

var BOTTLE_MSGS = [
  '瓶中纸条：「往东的礁石后有宝藏」——附了 30 金币的地图碎片',
  '瓶中纸条：「谢谢你送它回岸」——瓶子里藏着一小袋金币',
  '瓶中纸条：某位老水手的日记，夹着 25 金币书签',
  '瓶中纸条：「暴雨将至，多备木材」——随附 15 木材'
];
function collectFloater(m) {
  var k = m.userData.kind;
  var far = ringDist(m.position.x, m.position.z) > 400 ? 1.5 : 1;
  var bd = Math.hypot(m.position.x - state.boat.x, m.position.z - state.boat.z);
  if (bd > pickupR() && bd < 200) { removeFloater(m); return; }
  var cap = holdCap(state.lv.hold);
  var mult = far * (state.weather.cur === 'storm' ? 1.5 : 1) * (state.luck > 0 ? 1.25 : 1);
  var gained = false;
  state.cnt.pickup++;
  if (k === 'wood') {
    var gw = Math.round(rand(6, 10) * mult);
    var bw = Math.min(gw, cap[0] - Math.floor(state.res.wood));
    if (bw > 0) { state.res.wood += bw; gained = true; toastGet('木材 +' + bw); }
  } else if (k === 'food') {
    var gf = Math.round(rand(8, 13) * mult);
    var bf2 = Math.min(gf, cap[1] - Math.floor(state.res.food));
    if (bf2 > 0) { state.res.food += bf2; gained = true; toastGet('食物 +' + bf2); }
  } else if (k === 'water') {
    var gt = Math.round(rand(8, 13) * mult);
    var bt = Math.min(gt, cap[2] - Math.floor(state.res.water));
    if (bt > 0) { state.res.water += bt; gained = true; toastGet('淡水 +' + bt); }
  } else if (k === 'gold') {
    var gg = Math.round(rand(5, 12) * mult);
    state.res.gold += gg; gained = true; toastGet('金币 +' + gg, 'gold');
  } else if (k === 'glow') {
    var gg2 = Math.round(rand(14, 24) * mult);
    state.res.gold += gg2; gained = true;
    toast('捞起一枚发光浮标，金币 +' + gg2, 'gold');
  } else if (k === 'letter') {
    var lg = Math.round(rand(40, 80) * far);
    state.res.gold += lg;
    state.windfall = 60;
    state.cnt.letters++;
    gained = true;
    toast('顺风信件！金币 +' + lg + '，60 秒顺风加速', 'gold');
    sfxWin();
    buzz(25);
  } else if (k === 'bottle') {
    var msg = pick(BOTTLE_MSGS);
    if (msg.indexOf('木材') >= 0) { var aw = Math.min(15, cap[0] - Math.floor(state.res.wood)); state.res.wood += aw; }
    else state.res.gold += Math.round(rand(22, 35));
    state.cnt.bottles++;
    gained = true;
    toast(msg, 'gold');
    blip(740, 0.3, 'sine', 0.18, 990);
  } else {
    state.res.gold += Math.round(rand(22, 48) * mult);
    var cw = Math.min(Math.round(rand(12, 22) * mult), cap[0] - Math.floor(state.res.wood));
    if (cw > 0) state.res.wood += cw;
    state.cnt.chests++;
    gained = true;
    toast('打捞到漂流宝箱！金币与木材大丰收', 'gold');
  }
  if (gained) {
    sfxPickup(k);
    buzz(12);
    sparkle(m.position.x, m.position.y + 0.6, m.position.z, k === 'chest' || k === 'letter');
    if (fullHintCD <= 0 && (k === 'wood' && cap[0] - Math.floor(state.res.wood) <= 0 || k === 'food' && cap[1] - Math.floor(state.res.food) <= 0 || k === 'water' && cap[2] - Math.floor(state.res.water) <= 0)) {
      toast('货舱满了，去船坞升级货舱'); fullHintCD = 10;
    }
  } else if (fullHintCD <= 0) {
    toast('货舱已满，无法装载'); fullHintCD = 10;
  }
  removeFloater(m);
  checkQuests();
  checkAch();
}

function updateSurvival(dt) {
  var raining = state.weather.cur === 'storm';
  var drizzling = state.weather.cur === 'drizzle';
  var ramp = Math.min(1.5, 1 + Math.max(0, state.day - 4) * 0.04);
  state.stats.hunger -= 0.30 * dt * (raining ? 1.15 : 1) * ramp;
  state.stats.thirst -= 0.42 * dt * (raining ? 0.4 : drizzling ? -1.9 : 1) * ramp;
  eatT -= dt; drinkT -= dt; fixT -= dt; fullHintCD = Math.max(0, fullHintCD - dt);
  if (state.luck > 0) state.luck -= dt;
  if (state.windfall > 0) state.windfall -= dt;
  if (state.stats.hunger < 62 && state.res.food >= 1 && eatT <= 0) {
    state.res.food -= 1; state.stats.hunger = Math.min(100, state.stats.hunger + 16); eatT = 3.0;
    if (!state.hintShown.ate) { state.hintShown.ate = 1; toast('自动进食：饱食不足时消耗食物'); }
  }
  if (state.stats.thirst < 62 && state.res.water >= 1 && drinkT <= 0) {
    state.res.water -= 1; state.stats.thirst = Math.min(100, state.stats.thirst + 16); drinkT = 3.0;
  }
  var nearIsland = false;
  for (var i = 0; i < islands.length; i++) {
    var u = islands[i].userData;
    if (Math.hypot(state.boat.x - u.x, state.boat.z - u.z) < u.r + 55) { nearIsland = true; break; }
  }
  if (nearIsland) state.stats.hull = Math.min(maxHull(), state.stats.hull + 1.6 * dt);
  if (fixT <= 0) {
    fixT = 1.0;
    if (state.stats.hull < maxHull() - 2 && state.res.wood >= 1) {
      var use = Math.min(state.res.wood, 0.6);
      state.res.wood -= use;
      state.stats.hull = Math.min(maxHull(), state.stats.hull + use * 5);
    }
  }
  state.stats.hunger = clamp(state.stats.hunger, 0, 100);
  state.stats.thirst = clamp(state.stats.thirst, 0, 100);
  state.stats.hull = clamp(state.stats.hull, 0, maxHull());
  if (state.stats.hunger <= 0) gameOver('hunger');
  else if (state.stats.thirst <= 0) gameOver('thirst');
  else if (state.stats.hull <= 0) gameOver('hull');
}

function questProgress() {
  var q = QUESTS[state.quest];
  if (!q) return { cur: 1, max: 1 };
  var n = Object.keys(state.islandsFound).length;
  var cur = 0;
  if (q.id === 'pickup') cur = Math.min(state.cnt.pickup, q.target);
  else if (q.id === 'supply') cur = (state.res.food >= 10 && state.res.water >= 10) ? 10 : Math.min(Math.floor(Math.min(state.res.food, state.res.water)), 9);
  else if (q.id === 'sail2') cur = state.lv.sail;
  else if (q.id === 'island2') cur = Math.min(n, q.target);
  else if (q.id === 'fish2') cur = Math.min(state.cnt.fish, q.target);
  else if (q.id === 'storm1') cur = Math.min(state.cnt.storms, 1);
  else if (q.id === 'net2') cur = state.lv.net;
  else if (q.id === 'exp20') cur = Math.min(explorePct(), q.target);
  return { cur: cur, max: q.target };
}
function checkQuests() {
  var guard = 0;
  while (state.quest < QUESTS.length && guard++ < 5) {
    var q = QUESTS[state.quest];
    var p = questProgress();
    if (p.cur >= p.max) {
      var rwTxt = [];
      if (q.rg) { state.res.gold += q.rg; rwTxt.push('金币+' + q.rg); }
      if (q.rw) { state.res.wood += q.rw; rwTxt.push('木材+' + q.rw); }
      showBanner('目标达成', '「' + q.name + '」 ' + rwTxt.join(' '));
      sfxQuest();
      state.quest++;
      updateQuestHUD();
    } else break;
  }
  if (state.quest >= QUESTS.length && !state.hintShown.allq) {
    state.hintShown.allq = 1;
    toast('全部目标完成！攒够物资去船坞建造远洋巨轮', 'gold');
  }
}

function checkAch() {
  for (var i = 0; i < ACHS.length; i++) {
    var a = ACHS[i];
    if (!state.ach[a.id] && a.t()) {
      state.ach[a.id] = 1;
      state.res.gold += a.rew;
      toast('成就解锁：' + a.name + '（金币 +' + a.rew + '）', 'gold');
      sfxUp();
      updateHUD();
      if (typeof logOpen !== 'undefined' && logOpen) renderLog();
    }
  }
}

function updateExplore(dt) {
  expT -= dt;
  if (expT > 0) return;
  expT = 0.5;
  var gx = Math.round(state.boat.x / CELL), gz = Math.round(state.boat.z / CELL);
  var added = 0;
  for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) {
    var kx = gx + dx, kz = gz + dz;
    if (Math.abs(kx) > GRID_R || Math.abs(kz) > GRID_R) continue;
    var key = kx + ',' + kz;
    if (!state.explored[key]) { state.explored[key] = 1; added++; }
  }
  if (added > 0) {
    var pct = explorePct();
    var marks = [[30, 60], [60, 100], [90, 200]];
    for (var i = 0; i < marks.length; i++) {
      if (pct >= marks[i][0] && !state.hintShown['ex' + marks[i][0]]) {
        state.hintShown['ex' + marks[i][0]] = 1;
        state.res.gold += marks[i][1];
        toast('海图探索 ' + marks[i][0] + '%！奖励金币 +' + marks[i][1], 'gold');
        sfxUp();
      }
    }
  }
}
function explorePct() {
  var total = (GRID_R * 2 + 1) * (GRID_R * 2 + 1);
  var n = 0, key;
  for (key in state.explored) if (state.explored[key]) n++;
  return Math.min(100, Math.round(n / total * 100));
}

var whirlMsgT = 0;
function updateWhirlpools(dt) {
  whirlMsgT = Math.max(0, whirlMsgT - dt);
  var b = state.boat;
  for (var i = 0; i < whirlpools.length; i++) {
    var w = whirlpools[i];
    var u = w.userData;
    u.driftA += dt * 0.12;
    w.position.x = u.baseX + Math.cos(u.driftA) * 6;
    w.position.z = u.baseZ + Math.sin(u.driftA * 0.8) * 6;
    for (var r = 0; r < u.rings.length; r++) {
      u.rings[r].rotation.z += dt * (1.4 - r * 0.35) * (r % 2 ? -1 : 1);
    }
    for (var f = 0; f < u.foamPts.length; f++) {
      var fa = state.time * 1.6 + f * 0.785;
      var fr = 4.5 + (f % 3) * 2.2;
      u.foamPts[f].position.set(Math.cos(fa) * fr, 0.28, Math.sin(fa) * fr);
      u.foamPts[f].material.opacity = 0.28 + Math.sin(fa * 2) * 0.15;
    }
    var d = Math.hypot(b.x - w.position.x, b.z - w.position.z);
    if (d < 35 && !state.hintShown.whirl) {
      state.hintShown.whirl = 1;
      toast('海面的螺旋是漩涡，会吸住船体——绕开走！');
    }
    if (d < 15) {
      u.wasIn = true;
      var pullF = (1 - d / 15) * 3.4 * dt;
      b.x -= (b.x - w.position.x) / Math.max(d, 0.5) * pullF;
      b.z -= (b.z - w.position.z) / Math.max(d, 0.5) * pullF;
      b.heading += dt * 1.6 * (1 - d / 15);
      if (d < 5.5) {
        state.stats.hull -= 6.5 * dt;
        if (whirlMsgT <= 0) {
          whirlMsgT = 4;
          sfxCrash();
          toast('船被卷进漩涡了！全力驶离！');
        }
      } else if (whirlMsgT <= 0 && d < 12) {
        whirlMsgT = 6;
        toast('漩涡在吸引船身，快划出去！');
      }
    } else if (u.wasIn && d >= 15) {
      u.wasIn = false;
      state.cnt.whirlEsc++;
      toast('成功逃出漩涡引力！', 'gold');
      checkAch();
    }
  }
}

function updateCaches(dt) {
  var b = state.boat;
  for (var i = 0; i < islandCaches.length; i++) {
    var c = islandCaches[i];
    if (c.userData.taken) continue;
    c.position.y = waveH(c.userData.x, c.userData.z, state.time, visW.amp) + 0.05 + Math.sin(state.time * 1.3 + c.userData.ph) * 0.06;
    var s = 1 + Math.sin(state.time * 2.4 + c.userData.ph) * 0.1;
    c.userData.ring.scale.set(s, s, 1);
    c.userData.gl.material.opacity = (isNight() ? 0.8 : 0.45) * (0.8 + Math.sin(state.time * 3 + c.userData.ph) * 0.2);
    var d = Math.hypot(b.x - c.userData.x, b.z - c.userData.z);
    if (d < 10 && !state.hintShown.cache && state.islandsFound[c.userData.islId]) {
      state.hintShown.cache = 1;
      toast('岛边停着一座沉睡的宝藏箱，停稳船即可打开');
    }
    if (d < 4.5 && b.speed < 1.5) {
      c.userData.hold += dt;
      if (c.userData.hold > 1.2) {
        c.userData.taken = true;
        c.visible = false;
        state.caches[c.userData.islId] = 1;
        var far = ringDist(c.userData.x, c.userData.z) > 420 ? 1.5 : 1;
        var gg = Math.round(rand(35, 70) * far);
        state.res.gold += gg;
        var gw = Math.min(Math.round(rand(10, 20) * far), holdCap(state.lv.hold)[0] - Math.floor(state.res.wood));
        if (gw > 0) state.res.wood += gw;
        toast('打开岛屿宝藏！金币 +' + gg + (gw > 0 ? ' 木材 +' + gw : ''), 'gold');
        sfxPickup('chest');
        buzz(25);
        sparkle(c.userData.x, waveH(c.userData.x, c.userData.z, state.time, visW.amp), c.userData.z, true);
        updateHUD();
        checkAch();
      }
    } else {
      c.userData.hold = 0;
    }
  }
}

function updateEvents(dt) {
  updateWhirlpools(dt);
  updateCaches(dt);
  dolphinT -= dt;
  if (dolphinT <= 0 && dolphinOn <= 0) {
    dolphinT = rand(130, 220);
    dolphinOn = 25;
    state.luck = LUCK_T;
    toast('一群海豚伴你同行！60 秒内打捞收益 +25%', 'gold');
    sfxDolphin();
    updateBuffHUD();
  }
  if (dolphinOn > 0) dolphinOn -= dt;

  merchantT -= dt;
  if (merchantT <= 0 && !merchant) {
    merchantT = rand(170, 260);
    var a = rand(0, Math.PI * 2);
    var dd = rand(55, 85);
    var mx = state.boat.x + Math.cos(a) * dd;
    var mz = state.boat.z + Math.sin(a) * dd;
    if (ringDist(mx, mz) < WORLD_R - 30) {
      spawnMerchant(mx, mz);
      toast('远方漂来一座商筏，靠近看看（存在 90 秒）');
    }
  }
  if (merchant) {
    merchant.userData.life -= dt;
    if (merchant.userData.life <= 0) {
      scene.remove(merchant);
      merchant = null;
      hideTradeCard();
      toast('商筏慢慢漂远了…');
    } else {
      merchant.position.x += Math.cos(merchant.userData.ph) * 0.35 * dt;
      merchant.position.z += Math.sin(merchant.userData.ph) * 0.35 * dt;
      merchant.position.y = waveH(merchant.position.x, merchant.position.z, state.time, visW.amp) + 0.05;
      merchant.rotation.y += dt * 0.05;
      var md = Math.hypot(merchant.position.x - state.boat.x, merchant.position.z - state.boat.z);
      if (md < 14 && state.phase === 'play') showTradeCard();
      else hideTradeCard();
    }
  }

  whaleT -= dt;
  if (whaleT <= 0 && !whale) {
    whaleT = rand(150, 260);
    whale = makeWhale();
    var wa = rand(0, Math.PI * 2);
    var wd = rand(140, 220);
    whale.position.set(state.boat.x + Math.cos(wa) * wd, 0, state.boat.z + Math.sin(wa) * wd);
    whale.rotation.y = rand(0, 6.28);
    whale.userData.dir = whale.rotation.y;
    scene.add(whale);
    toast('远处海面有鲸鱼喷水！');
  }
  if (whale) {
    whale.userData.life -= dt;
    whale.position.x += Math.sin(whale.userData.dir) * 2.2 * dt;
    whale.position.z += Math.cos(whale.userData.dir) * 2.2 * dt;
    whale.position.y = waveH(whale.position.x, whale.position.z, state.time, visW.amp) - 0.2;
    whale.rotation.z = Math.sin(state.time * 0.8) * 0.04;
    var ph = (whale.userData.life % 6);
    whale.userData.spout.material.opacity = ph > 4.6 ? (6 - ph) * 0.7 : 0;
    if (whale.userData.life <= 0) { scene.remove(whale); whale = null; }
  }
}

function canTrade(t) {
  var g = t.give;
  return state.res.wood >= (g.wood || 0) && state.res.gold >= (g.gold || 0) && state.res.food >= (g.food || 0) && state.res.water >= (g.water || 0);
}
function doTrade(t) {
  if (!canTrade(t)) { toast('物资不够啦'); return; }
  var g = t.give, gt = t.get;
  if (g.wood) state.res.wood -= g.wood;
  if (g.gold) state.res.gold -= g.gold;
  var cap = holdCap(state.lv.hold);
  if (gt.gold) state.res.gold += gt.gold;
  if (gt.wood) state.res.wood = Math.min(cap[0], state.res.wood + gt.wood);
  if (gt.food) state.res.food = Math.min(cap[1], state.res.food + gt.food);
  if (gt.water) state.res.water = Math.min(cap[2], state.res.water + gt.water);
  state.cnt.trade++;
  sfxPickup('gold');
  toast('交易完成：' + t.label, 'gold');
  renderTradeCard();
}

function canUpgrade(key) {
  var u = UPG[key];
  if (state.lv[key] >= u.max) return { ok: false, why: 'max' };
  var i = state.lv[key] - 1;
  if (state.res.gold < u.costG[i] || state.res.wood < u.costW[i]) return { ok: false, why: 'cost' };
  return { ok: true };
}
function doUpgrade(key) {
  var c = canUpgrade(key);
  if (!c.ok) return false;
  var u = UPG[key];
  var i = state.lv[key] - 1;
  state.res.gold -= u.costG[i];
  state.res.wood -= u.costW[i];
  state.lv[key]++;
  if (key === 'hull') state.stats.hull = maxHull();
  sfxUp();
  toast(u.name + ' 升级到 ' + state.lv[key] + ' 级！', 'gold');
  renderUpList();
  updateHUD();
  checkQuests();
  save();
  return true;
}
function canBuild() {
  return state.lv.sail >= BUILD_NEED.sail && state.lv.hull >= BUILD_NEED.hull &&
    state.res.wood >= BUILD_NEED.wood && state.res.gold >= BUILD_NEED.gold;
}
function doBuild() {
  if (!canBuild()) return;
  state.phase = 'win';
  sfxWin();
  save();
  showOver(true);
}
