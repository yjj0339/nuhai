var canvas = document.getElementById('c3d');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeaf7fd, 60, 760);
var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 14, -22);

var hemi = new THREE.HemisphereLight(0xbfe8ff, 0xe8d9b8, 0.85);
scene.add(hemi);
var sun = new THREE.DirectionalLight(0xfff4dd, 1.25);
sun.position.set(120, 200, 80);
scene.add(sun);

var skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    uTop: { value: new THREE.Color('#7ec8ee') },
    uBot: { value: new THREE.Color('#eaf7fd') },
    uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3) },
    uSunC: { value: new THREE.Color('#fff2c0') },
    uNight: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(-0.5, 0.5, -0.4) },
    uTime: { value: 0 }
  },
  vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.0);}',
  fragmentShader: [
    'uniform vec3 uTop,uBot,uSunC;uniform vec3 uSunDir,uMoonDir;uniform float uNight,uTime;varying vec3 vD;',
    'float h3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}',
    'void main(){vec3 d=normalize(vD);float h=clamp(d.y*0.5+0.5,0.0,1.0);',
    'vec3 col=mix(uBot,uTop,pow(h,0.85));',
    'float s=max(dot(d,normalize(uSunDir)),0.0);',
    'col+=uSunC*(pow(s,320.0)*1.4+pow(s,7.0)*0.14);',
    'float m=max(dot(d,normalize(uMoonDir)),0.0);',
    'col+=vec3(0.92,0.95,1.0)*(smoothstep(0.99935,0.99965,m)*0.85+pow(m,150.0)*0.3)*max(uNight*1.2,0.12);',
    'if(d.y>0.02&&uNight>0.01){vec3 g=floor(d*160.0);float st=h3(g);',
    'if(st>0.9975){float tw=0.55+0.45*sin(uTime*2.5+st*80.0);col+=vec3(0.9,0.95,1.0)*uNight*tw*smoothstep(0.02,0.25,d.y);}}',
    'gl_FragColor=vec4(col,1.0);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n')
});
var skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1400, 28, 18), skyMat);
skyMesh.renderOrder = -10;
scene.add(skyMesh);

var seaMat = new THREE.ShaderMaterial({
  fog: false,
  uniforms: {
    uTime: { value: 0 }, uAmp: { value: 0.55 },
    cDeep: { value: new THREE.Color('#37a7d8') },
    cShallow: { value: new THREE.Color('#8fd8ef') },
    cFog: { value: new THREE.Color('#eaf7fd') },
    uSun: { value: new THREE.Vector3(0.4, 0.7, 0.3) },
    uFogFar: { value: 760 }
  },
  vertexShader: [
    'uniform float uTime,uAmp;varying vec3 vW;varying float vWave;',
    'float wav(vec2 p,float t){return (sin(p.x*0.055+t*1.1)+sin(p.y*0.047-t*0.9)+sin((p.x+p.y)*0.031+t*0.6)*1.3)*uAmp*0.62;}',
    'void main(){vec4 wp=modelMatrix*vec4(position,1.0);float h=wav(wp.xz,uTime);wp.y+=h;vW=wp.xyz;vWave=h;',
    'gl_Position=projectionMatrix*viewMatrix*wp;}'
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 cDeep,cShallow,cFog,uSun;uniform float uTime,uFogFar,uAmp;varying vec3 vW;varying float vWave;',
    'void main(){float t=clamp(vWave*0.35+0.5,0.0,1.0);',
    'vec3 col=mix(cDeep,cShallow,t*0.7+0.12);',
    'vec2 rv=vec2(sin(vW.x*0.9+uTime*2.0)+sin(vW.z*1.13-uTime*1.7),cos(vW.x*0.71-uTime*1.3)+cos(vW.z*0.83+uTime*1.1));',
    'col+=vec3(0.055)*smoothstep(1.2,2.6,rv.x+rv.y);',
    'col=mix(col,vec3(0.97,0.99,1.0),smoothstep(2.05,3.05,vWave/max(uAmp*0.62,0.001))*min(uAmp,1.4)*0.26);',
    'vec3 vd=normalize(cameraPosition-vW);vec3 sn=normalize(vec3(rv.x*0.08,1.0,rv.y*0.08));',
    'vec3 rf=reflect(-normalize(uSun),sn);float sp=pow(max(dot(vd,rf),0.0),70.0);',
    'col+=vec3(1.0,0.95,0.8)*sp*0.85;',
    'float fd=distance(cameraPosition,vW);col=mix(col,cFog,smoothstep(uFogFar*0.35,uFogFar,fd));',
    'gl_FragColor=vec4(col,1.0);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n')
});
var seaGeo = new THREE.PlaneGeometry(2400, 2400, 120, 120);
seaGeo.rotateX(-Math.PI / 2);
var seaMesh = new THREE.Mesh(seaGeo, seaMat);
scene.add(seaMesh);

var MAT = {
  hull: new THREE.MeshPhongMaterial({ color: 0xb5763c, flatShading: true, shininess: 18 }),
  hullDk: new THREE.MeshPhongMaterial({ color: 0x8a5a2e, flatShading: true }),
  hullRd: new THREE.MeshPhongMaterial({ color: 0xd8955a, flatShading: true }),
  deck: new THREE.MeshPhongMaterial({ color: 0xe2c391, flatShading: true }),
  mast: new THREE.MeshPhongMaterial({ color: 0x9a6a38, flatShading: true }),
  rope: new THREE.LineBasicMaterial({ color: 0x6e4c26, transparent: true, opacity: 0.85 }),
  sail: new THREE.MeshLambertMaterial({ color: 0xfdfdf8, side: THREE.DoubleSide }),
  sailGold: new THREE.MeshLambertMaterial({ color: 0xfbf0d0, side: THREE.DoubleSide }),
  sailStripe: new THREE.MeshLambertMaterial({ color: 0xf2b56a, side: THREE.DoubleSide }),
  flag: new THREE.MeshLambertMaterial({ color: 0xef6f3c, side: THREE.DoubleSide }),
  rock: new THREE.MeshPhongMaterial({ color: 0x5e7d8e, flatShading: true }),
  rockDk: new THREE.MeshPhongMaterial({ color: 0x49657a, flatShading: true }),
  sand: new THREE.MeshPhongMaterial({ color: 0xf4e2b2, flatShading: true }),
  grass: new THREE.MeshPhongMaterial({ color: 0x8fc95e, flatShading: true }),
  grassDk: new THREE.MeshPhongMaterial({ color: 0x6fb24a, flatShading: true }),
  trunk: new THREE.MeshPhongMaterial({ color: 0xa9743f, flatShading: true }),
  leaf: new THREE.MeshPhongMaterial({ color: 0x5cb548, flatShading: true }),
  leafDk: new THREE.MeshPhongMaterial({ color: 0x47a038, flatShading: true }),
  coconut: new THREE.MeshPhongMaterial({ color: 0x6e4a26 }),
  barrel: new THREE.MeshPhongMaterial({ color: 0xc98d4e, flatShading: true }),
  barrelDark: new THREE.MeshPhongMaterial({ color: 0x9a6a38, flatShading: true }),
  ironBand: new THREE.MeshPhongMaterial({ color: 0x55606a, shininess: 60 }),
  crate: new THREE.MeshPhongMaterial({ color: 0xd8a86a, flatShading: true }),
  crateDk: new THREE.MeshPhongMaterial({ color: 0xb0824a, flatShading: true }),
  water: new THREE.MeshPhongMaterial({ color: 0x59b8e8, shininess: 80 }),
  goldM: new THREE.MeshPhongMaterial({ color: 0xf2c14e, emissive: 0x664c10, shininess: 90 }),
  chest: new THREE.MeshPhongMaterial({ color: 0x9a6a38, flatShading: true }),
  chestGold: new THREE.MeshPhongMaterial({ color: 0xffd75e, emissive: 0x8a6a10 }),
  bottleG: new THREE.MeshPhongMaterial({ color: 0x5fae72, shininess: 100, transparent: true, opacity: 0.92 }),
  corkM: new THREE.MeshPhongMaterial({ color: 0xc9a06a }),
  fishM: new THREE.MeshPhongMaterial({ color: 0x7ac4e8, shininess: 80 }),
  fishM2: new THREE.MeshPhongMaterial({ color: 0x9ad8f0, shininess: 80 }),
  dolphinM: new THREE.MeshPhongMaterial({ color: 0x8fb8d8, flatShading: true }),
  dolphinB: new THREE.MeshPhongMaterial({ color: 0xe8f2f8, flatShading: true }),
  whaleM: new THREE.MeshPhongMaterial({ color: 0x4a6a8a, flatShading: true }),
  canopyA: new THREE.MeshPhongMaterial({ color: 0xef8a5a, side: THREE.DoubleSide, flatShading: true }),
  canopyB: new THREE.MeshPhongMaterial({ color: 0xfff4e8, side: THREE.DoubleSide, flatShading: true }),
  glowM: new THREE.MeshBasicMaterial({ color: 0xbff0d8, transparent: true, opacity: 0.9 }),
  white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  ring: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false }),
  ringGold: new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.5, depthWrite: false }),
  ringFish: new THREE.MeshBasicMaterial({ color: 0x9fe8b8, transparent: true, opacity: 0.45, depthWrite: false }),
  wake: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending }),
  foamRing: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })
};

function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function cyl(rt, rb, h, m, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), m); }
function sph(r, m, ws, hs) { return new THREE.Mesh(new THREE.SphereGeometry(r, ws || 10, hs || 8), m); }

var glowTex = (function () {
  var cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  var ctx = cv.getContext('2d');
  var g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  var t = new THREE.CanvasTexture(cv);
  return t;
})();
function makeGlow(size, color) {
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color || 0xffe9a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1);
  return s;
}
function makeRopeLine(pts) {
  var g = new THREE.BufferGeometry().setFromPoints(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
  return new THREE.Line(g, MAT.rope);
}

function sculptBoatHull() {
  var geo = new THREE.BoxGeometry(2.55, 1.25, 5.9, 7, 4, 18);
  var pos = geo.attributes.position;
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    var t = z / 2.95;
    var wS = t > 0 ? 1 - Math.pow(t, 2.5) * 0.97 : 1 - Math.pow(-t, 2.3) * 0.45;
    x *= Math.max(0.03, wS);
    if (y < 0) {
      var dn = 1 - Math.abs(t) * 0.55;
      y *= dn;
      y += Math.pow(Math.abs(t), 2.7) * 0.5 * Math.min(1, -y * 2.2);
    }
    if (y > 0.35) y += Math.pow(Math.abs(t), 2.0) * 0.5;
    pos.setX(i, x); pos.setY(i, y); pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

var boat = new THREE.Group();
(function buildBoat() {
  var hullMesh = new THREE.Mesh(sculptBoatHull(), MAT.hull);
  hullMesh.position.y = 0.42;
  boat.add(hullMesh);
  var keel = box(0.34, 0.3, 4.6, MAT.hullDk);
  keel.position.y = -0.28; boat.add(keel);
  var rubL = box(0.16, 0.2, 4.4, MAT.hullRd);
  rubL.position.set(1.16, 1.0, -0.2); rubL.rotation.x = -0.06; boat.add(rubL);
  var rubR = rubL.clone(); rubR.position.x = -1.16; boat.add(rubR);
  var waleL = box(0.1, 0.12, 4.2, MAT.hullDk);
  waleL.position.set(1.22, 0.72, -0.25); boat.add(waleL);
  var waleR = waleL.clone(); waleR.position.x = -1.22; boat.add(waleR);

  var deckShape = new THREE.Shape();
  deckShape.absellipse(0, 0, 1.05, 2.55, 0, Math.PI * 2);
  var deck = new THREE.Mesh(new THREE.ShapeGeometry(deckShape, 20), MAT.deck);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.68;
  boat.add(deck);
  var deckTrim = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 22), MAT.hullDk);
  deckTrim.rotation.x = -Math.PI / 2;
  deckTrim.scale.y = 2.4;
  deckTrim.position.y = 0.7;
  boat.add(deckTrim);

  var bowDeco = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 6), MAT.hullRd);
  bowDeco.rotation.x = Math.PI / 2 - 0.5;
  bowDeco.position.set(0, 1.25, 2.85);
  boat.add(bowDeco);

  var cabin = box(1.5, 0.95, 1.35, MAT.hullDk);
  cabin.position.set(0, 1.15, -1.65); boat.add(cabin);
  var cabinRoof = box(1.72, 0.16, 1.55, MAT.deck);
  cabinRoof.position.set(0, 1.68, -1.65); boat.add(cabinRoof);
  var win = box(1.56, 0.34, 0.06, MAT.water);
  win.position.set(0, 1.28, -0.95); boat.add(win);
  var door = box(0.5, 0.62, 0.06, MAT.mast);
  door.position.set(0.35, 1.05, -2.34); boat.add(door);

  var mast = cyl(0.085, 0.13, 5.6, MAT.mast, 8);
  mast.position.set(0, 3.35, 0.3); boat.add(mast);
  var crow = cyl(0.34, 0.26, 0.3, MAT.hullDk, 8);
  crow.position.set(0, 4.5, 0.3); boat.add(crow);
  var crowRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 12), MAT.hullDk);
  crowRim.rotation.x = Math.PI / 2; crowRim.position.set(0, 4.66, 0.3); boat.add(crowRim);
  var yard = cyl(0.055, 0.055, 3.1, MAT.mast, 8);
  yard.rotation.z = Math.PI / 2; yard.position.set(0, 5.35, 0.28); boat.add(yard);

  var sailGeo = new THREE.PlaneGeometry(2.95, 3.6, 12, 9);
  var sp = sailGeo.attributes.position;
  for (var si = 0; si < sp.count; si++) {
    var sx = sp.getX(si) / 1.475;
    var sy = sp.getY(si) / 1.8;
    sp.setZ(si, Math.sin((sx + 1) / 2 * Math.PI) * 0.55 * (1 - Math.abs(sy) * 0.35));
  }
  sailGeo.computeVertexNormals();
  var sail = new THREE.Mesh(sailGeo, MAT.sail);
  sail.position.set(0, 3.5, 0.24);
  boat.add(sail);
  boat.userData.sail = sail;
  var stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 0.42, 12, 1), MAT.sailStripe);
  stripe.position.set(0, 4.35, 0.36);
  boat.add(stripe);
  boat.userData.stripe = stripe;
  var stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 0.42, 12, 1), MAT.sailStripe);
  stripe2.position.set(0, 2.62, 0.36);
  stripe2.visible = false;
  boat.add(stripe2);
  boat.userData.stripe2 = stripe2;
  var goldEdge = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 0.16, 12, 1), MAT.goldM);
  goldEdge.position.set(0, 5.22, 0.32);
  goldEdge.visible = false;
  boat.add(goldEdge);
  boat.userData.goldEdge = goldEdge;

  var foreMast = cyl(0.06, 0.09, 3.6, MAT.mast, 8);
  foreMast.position.set(0, 2.4, 2.55); boat.add(foreMast);
  var jibShape = new THREE.Shape();
  jibShape.moveTo(0, 0); jibShape.lineTo(0, 2.1); jibShape.lineTo(1.15, 0.1); jibShape.closePath();
  var jib = new THREE.Mesh(new THREE.ShapeGeometry(jibShape), MAT.sail);
  jib.rotation.y = Math.PI / 2;
  jib.position.set(0, 2.55, 2.55);
  boat.add(jib);
  boat.userData.foreSail = jib;

  boat.add(makeRopeLine([[0, 5.6, 0.3], [0, 1.35, 2.7]]));
  boat.add(makeRopeLine([[0.09, 5.2, 0.3], [1.1, 1.0, -0.4]]));
  boat.add(makeRopeLine([[-0.09, 5.2, 0.3], [-1.1, 1.0, -0.4]]));
  boat.add(makeRopeLine([[0, 3.9, 0.3], [0.8, 1.0, -1.6]]));
  boat.add(makeRopeLine([[0, 3.9, 0.3], [-0.8, 1.0, -1.6]]));

  var flag = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.45, 6, 1), MAT.flag);
  flag.position.set(0.52, 5.75, 0.3);
  boat.add(flag);
  boat.userData.flag = flag;
  var flagTop = sph(0.09, MAT.goldM, 6, 5);
  flagTop.position.set(0, 5.98, 0.3); boat.add(flagTop);

  var lampPole = cyl(0.045, 0.045, 1.3, MAT.mast, 6);
  lampPole.position.set(0, 1.3, -2.55); boat.add(lampPole);
  var lampArm = box(0.5, 0.07, 0.07, MAT.mast);
  lampArm.position.set(0.2, 1.92, -2.55); boat.add(lampArm);
  var lantern = new THREE.Group();
  var lantBody = cyl(0.14, 0.17, 0.3, MAT.ironBand, 6);
  lantern.add(lantBody);
  var lantTop = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 6), MAT.ironBand);
  lantTop.position.y = 0.22; lantern.add(lantTop);
  var bulb = sph(0.1, new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 8, 6);
  lantern.add(bulb);
  lantern.position.set(0.42, 1.82, -2.55);
  boat.add(lantern);
  var lampGlow = makeGlow(1.6, 0xffdf90);
  lampGlow.position.set(0.42, 1.82, -2.55);
  boat.add(lampGlow);
  boat.userData.lampBulb = bulb;
  boat.userData.lampGlow = lampGlow;
  var lampLight = new THREE.PointLight(0xffdf90, 0, 30, 2);
  lampLight.position.set(0.42, 2.1, -2.4);
  boat.add(lampLight);
  boat.userData.lampLight = lampLight;

  var wheel = new THREE.Group();
  var wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 14), MAT.hullDk);
  wheel.add(wheelRim);
  for (var wi = 0; wi < 4; wi++) {
    var spoke = box(0.055, 0.62, 0.055, MAT.hullDk);
    spoke.rotation.z = wi * Math.PI / 4;
    wheel.add(spoke);
  }
  wheel.position.set(0, 1.1, -2.45);
  wheel.rotation.x = 0.5;
  boat.add(wheel);
  boat.userData.wheel = wheel;

  var rudder = box(0.09, 0.85, 0.55, MAT.hullDk);
  rudder.position.set(0, -0.2, -2.95); boat.add(rudder);

  var cargo = new THREE.Group();
  cargo.position.set(-0.55, 0.74, -0.55);
  boat.add(cargo);
  boat.userData.cargo = cargo;
  boat.userData.cargoN = -1;

  var anchorS = new THREE.Group();
  var ancS = cyl(0.04, 0.04, 0.7, MAT.ironBand, 6);
  anchorS.add(ancS);
  var ancA = box(0.5, 0.06, 0.06, MAT.ironBand);
  ancA.position.y = -0.3; anchorS.add(ancA);
  anchorS.position.set(1.05, 0.5, 1.7);
  anchorS.rotation.z = 0.5;
  boat.add(anchorS);
})();
scene.add(boat);

function updateCargoVisual() {
  var n = state.lv.hold;
  if (n === boat.userData.cargoN) return;
  boat.userData.cargoN = n;
  while (boat.userData.cargo.children.length) boat.userData.cargo.remove(boat.userData.cargo.children[0]);
  var spots = [[0, 0, 0], [0.62, 0, 0.25], [-0.1, 0, 0.75], [0.5, 0.4, 0.1], [0.05, 0.42, 0.6]];
  for (var i = 0; i < Math.min(n + 1, 5); i++) {
    var c = i % 2 === 0 ? box(0.5, 0.38, 0.5, i % 4 === 1 ? MAT.crate : MAT.crateDk) : cyl(0.24, 0.28, 0.42, MAT.barrel, 9);
    c.position.set(spots[i][0], spots[i][1] + 0.2, spots[i][2]);
    c.rotation.y = i * 0.8;
    boat.userData.cargo.add(c);
  }
}

var WAKE_N = 26;
var wakeGeo = new THREE.BufferGeometry();
var wakePos = new Float32Array(WAKE_N * 2 * 3);
var wakeCol = new Float32Array(WAKE_N * 2 * 3);
wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePos, 3));
wakeGeo.setAttribute('color', new THREE.BufferAttribute(wakeCol, 3));
var wakeIdx = [];
for (var wi = 0; wi < WAKE_N - 1; wi++) {
  var a = wi * 2, b = wi * 2 + 1, c = wi * 2 + 2, d = wi * 2 + 3;
  wakeIdx.push(a, b, c, b, d, c);
}
wakeGeo.setIndex(wakeIdx);
var wakeMesh = new THREE.Mesh(wakeGeo, MAT.wake);
wakeMesh.frustumCulled = false;
scene.add(wakeMesh);
var wakePts = [];
for (var wp = 0; wp < WAKE_N; wp++) wakePts.push({ x: 0, z: 0, h: 0 });

var ISLAND_NAMES = ['椰风屿', '海鸥岩', '星沙洲', '月牙湾', '翠竹屿', '浪花礁', '晨曦岛', '迷雾洲', '珊瑚屿', '望归崖', '白帆洲', '鲸背岛'];
var islands = [];
function makePalm(seed) {
  var g = new THREE.Group();
  var lean = (hashSeed(seed) - 0.5) * 0.5;
  var segs = 4, h = 0;
  var px = 0, pz = 0;
  for (var i = 0; i < segs; i++) {
    var seg = cyl(0.13 - i * 0.015, 0.16 - i * 0.015, 1.05, MAT.trunk, 7);
    px += lean * 0.28 * (i + 1) * 0.25;
    h += 0.52;
    seg.position.set(px, h, pz);
    seg.rotation.z = -lean * 0.24 * (i + 1) * 0.3;
    g.add(seg);
    h += 0.52;
  }
  var topY = h + 0.15;
  for (var l = 0; l < 7; l++) {
    var la = (l / 7) * Math.PI * 2 + hashSeed(seed + l) * 0.5;
    var leaf = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.7, 4), l % 2 ? MAT.leaf : MAT.leafDk);
    leaf.scale.y = 1;
    leaf.position.set(px + Math.cos(la) * 0.95, topY - 0.12, pz + Math.sin(la) * 0.95);
    leaf.rotation.set(Math.sin(la) * 1.25, 0, -Math.cos(la) * 1.25 + Math.PI / 2);
    g.add(leaf);
  }
  for (var co = 0; co < 3; co++) {
    var nut = sph(0.16, MAT.coconut, 7, 6);
    var na = hashSeed(seed + 40 + co) * Math.PI * 2;
    nut.position.set(px + Math.cos(na) * 0.25, topY - 0.42, pz + Math.sin(na) * 0.25);
    g.add(nut);
  }
  return g;
}
function makeIsland(i, ix, iz, r, rocky) {
  var g = new THREE.Group();
  var seed = i * 13.7 + 1;
  var base = sph(r, MAT.sand, 11, 7);
  base.scale.y = 0.3;
  base.position.y = -r * 0.17;
  g.add(base);
  var hillGeo = new THREE.ConeGeometry(r * 0.72, r * (rocky ? 1.05 : 0.68), 9, 3);
  var hp = hillGeo.attributes.position;
  for (var v = 0; v < hp.count; v++) {
    var hy = hp.getY(v);
    if (hy <= -r * 0.5 + 0.01) continue;
    var k = 1 + (hashSeed(seed + v) - 0.5) * (rocky ? 0.55 : 0.32);
    hp.setX(v, hp.getX(v) * k);
    hp.setZ(v, hp.getZ(v) * k);
  }
  hillGeo.computeVertexNormals();
  var hill = new THREE.Mesh(hillGeo, rocky ? MAT.rock : MAT.grass);
  hill.position.y = r * 0.1;
  g.add(hill);
  if (!rocky) {
    var hillTop = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, r * 0.42, 8, 2), MAT.grassDk);
    hillTop.position.y = r * 0.48;
    g.add(hillTop);
    var nPalm = 3 + Math.floor(hashSeed(seed) * 3);
    for (var p = 0; p < nPalm; p++) {
      var palm = makePalm(seed + p * 7.3);
      var pa = hashSeed(seed + p * 3.1) * Math.PI * 2;
      var pr = r * (0.28 + hashSeed(seed + p * 5.7) * 0.3);
      palm.position.set(Math.cos(pa) * pr, 0.3, Math.sin(pa) * pr);
      palm.rotation.y = hashSeed(seed + p) * 6.28;
      var ps = 0.8 + hashSeed(seed + p * 11) * 0.5;
      palm.scale.set(ps, ps, ps);
      g.add(palm);
    }
  } else {
    for (var rk = 0; rk < 4; rk++) {
      var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r * (0.14 + hashSeed(seed + rk) * 0.16), 0), MAT.rockDk);
      var ra = hashSeed(seed + rk * 2) * Math.PI * 2;
      rock.position.set(Math.cos(ra) * r * 0.4, r * 0.25 + hashSeed(seed + rk * 3) * r * 0.3, Math.sin(ra) * r * 0.4);
      rock.rotation.set(hashSeed(seed + rk) * 3, hashSeed(seed + rk * 7) * 3, 0);
      g.add(rock);
    }
  }
  var shallow = new THREE.Mesh(new THREE.RingGeometry(r * 1.02, r * 1.85, 26), new THREE.MeshBasicMaterial({ color: 0xa8e4d8, transparent: true, opacity: 0.4, depthWrite: false }));
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = -0.4;
  g.add(shallow);
  var foam = new THREE.Mesh(new THREE.RingGeometry(r * 1.78, r * 1.98, 26), MAT.foamRing);
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.02;
  g.add(foam);
  g.userData = { x: ix, z: iz, r: r + 3, name: ISLAND_NAMES[i % ISLAND_NAMES.length], id: 'is' + i, found: false, foam: foam };
  g.position.set(ix, 0, iz);
  scene.add(g);
  return g;
}
(function buildIslands() {
  for (var i = 0; i < 11; i++) {
    var ang = (i / 11) * Math.PI * 2 + rand(-0.2, 0.2);
    var dist = 210 + (i % 5) * 135 + rand(-40, 40);
    var ix = Math.cos(ang) * dist, iz = Math.sin(ang) * dist;
    var r = rand(14, 22);
    islands.push(makeIsland(i, ix, iz, r, i % 3 === 2));
  }
})();

var whirlpools = [];
function makeWhirlpool(idx) {
  var g = new THREE.Group();
  var core = new THREE.Mesh(new THREE.CircleGeometry(2.6, 22), new THREE.MeshBasicMaterial({ color: 0x1d4a66, transparent: true, opacity: 0.75, depthWrite: false }));
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.06;
  g.add(core);
  var rings = [];
  var cols = [0x2a6a8e, 0x3a86ac, 0x5aa8cc];
  for (var i = 0; i < 3; i++) {
    var seg = new THREE.Mesh(
      new THREE.RingGeometry(3 + i * 2.6, 4.6 + i * 2.6, 26, 1, idx * 2 + i * 1.4, Math.PI * 1.45),
      new THREE.MeshBasicMaterial({ color: cols[i], transparent: true, opacity: 0.62 - i * 0.12, depthWrite: false, side: THREE.DoubleSide })
    );
    seg.rotation.x = -Math.PI / 2;
    seg.position.y = 0.12 + i * 0.06;
    g.add(seg);
    rings.push(seg);
  }
  var foamPts = [];
  for (var f = 0; f < 8; f++) {
    var fp = makeGlow(1.1, 0xd8f0fa);
    fp.material.opacity = 0.5;
    g.add(fp);
    foamPts.push(fp);
  }
  g.userData = { rings: rings, foamPts: foamPts, ph: idx * 2.1, idx: idx };
  scene.add(g);
  whirlpools.push(g);
  return g;
}
function placeWhirlpools(day) {
  for (var i = 0; i < 3; i++) {
    if (!whirlpools[i]) makeWhirlpool(i);
    var w = whirlpools[i];
    var ang = hashSeed(day * 17.3 + i * 7.7) * Math.PI * 2;
    var dist = 170 + hashSeed(day * 5.1 + i * 13.9) * 520;
    w.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    w.userData.driftA = rand(0, 6.28);
    w.userData.baseX = w.position.x;
    w.userData.baseZ = w.position.z;
  }
}
(function initWhirlpools() { for (var i = 0; i < 3; i++) makeWhirlpool(i); })();

var islandCaches = [];
(function buildIslandCaches() {
  for (var i = 0; i < islands.length; i++) {
    var u = islands[i].userData;
    var ang = hashSeed(i * 31.7 + 3) * Math.PI * 2;
    var cx = u.x + Math.cos(ang) * (u.r + 5.5);
    var cz = u.z + Math.sin(ang) * (u.r + 5.5);
    var g = new THREE.Group();
    var boxM = box(0.9, 0.5, 0.6, MAT.chest);
    boxM.position.y = 0.25; g.add(boxM);
    var lidM = box(0.94, 0.18, 0.64, MAT.ironBand);
    lidM.position.y = 0.56; g.add(lidM);
    var lockM = box(0.14, 0.18, 0.08, MAT.goldM);
    lockM.position.set(0, 0.42, 0.32); g.add(lockM);
    var gl = makeGlow(2.2, 0xffd75e);
    gl.position.y = 0.7;
    gl.material.opacity = 0.6;
    g.add(gl);
    var ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.6, 22), MAT.ringGold);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    g.position.set(cx, 0, cz);
    g.userData = { islId: u.id, x: cx, z: cz, taken: false, gl: gl, ring: ring, ph: rand(0, 6.28), hold: 0 };
    scene.add(g);
    islandCaches.push(g);
  }
})();

var rocks = [];
(function buildRocks() {
  for (var i = 0; i < 34; i++) {
    var ang = rand(0, Math.PI * 2);
    var dist = rand(120, WORLD_R - 60);
    var m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1.6, 3.4), 0), i % 3 ? MAT.rock : MAT.rockDk);
    var rx = Math.cos(ang) * dist, rz = Math.sin(ang) * dist;
    m.position.set(rx, rand(-1.2, -0.4), rz);
    m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    m.scale.y = rand(0.7, 1.3);
    m.userData = { x: rx, z: rz, r: 3 };
    scene.add(m); rocks.push(m);
  }
})();

var clouds = [];
(function buildClouds() {
  var cm = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.94 });
  for (var i = 0; i < 10; i++) {
    var g = new THREE.Group();
    var n = randi(5, 7);
    for (var j = 0; j < n; j++) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(rand(6, 13), 9, 7), cm);
      s.position.set(rand(-17, 17), rand(-1.5, 3) + Math.abs(j - n / 2) * 0.8, rand(-8, 8));
      s.scale.y = 0.52;
      g.add(s);
    }
    g.position.set(rand(-750, 750), rand(95, 155), rand(-750, 750));
    g.userData = { vx: rand(1.2, 2.6) };
    scene.add(g); clouds.push(g);
  }
})();

var gulls = [];
(function buildGulls() {
  var bm = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false });
  var om = new THREE.MeshLambertMaterial({ color: 0xf2b56a, fog: false });
  for (var i = 0; i < 5; i++) {
    var g = new THREE.Group();
    var body = sph(0.22, bm, 8, 6);
    body.scale.set(1, 0.9, 1.7); g.add(body);
    var head = sph(0.13, bm, 7, 5);
    head.position.set(0, 0.14, 0.32); g.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), om);
    beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.12, 0.48); g.add(beak);
    var tail = box(0.16, 0.05, 0.3, bm);
    tail.position.set(0, 0.02, -0.4); g.add(tail);
    var wL = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.42), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false }));
    wL.position.set(-0.58, 0.08, 0);
    var wR = wL.clone(); wR.position.x = 0.58;
    g.add(wL); g.add(wR);
    g.userData = { a: rand(0, Math.PI * 2), r: rand(20, 40), h: rand(9, 16), sp: rand(0.25, 0.45), wL: wL, wR: wR, ph: rand(0, 6) };
    scene.add(g); gulls.push(g);
  }
})();

var floaters = [];
function makeLogStack() {
  var g = new THREE.Group();
  var spots = [[-0.32, 0.26, 0.1], [0.32, 0.26, -0.1], [0, 0.72, 0.05], [-0.3, 0.26, 0.95]];
  for (var i = 0; i < spots.length; i++) {
    var log = cyl(0.24, 0.24, 2.0, MAT.trunk, 9);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = spots[i][2];
    log.position.set(spots[i][0], spots[i][1], i === 3 ? -0.45 : 0);
    g.add(log);
    var capL = cyl(0.19, 0.19, 0.05, MAT.deck, 9);
    capL.rotation.z = Math.PI / 2;
    capL.position.set(spots[i][0] - 1.0 * Math.cos(spots[i][2]), spots[i][1], -1.0 * Math.sin(spots[i][2]));
    g.add(capL);
  }
  var rope = makeRopeLine([[-0.9, 0.5, 0], [0, 0.95, 0], [0.9, 0.5, 0]]);
  g.add(rope);
  return g;
}
function makeCrateBox() {
  var g = new THREE.Group();
  var body = box(1.3, 0.85, 1.3, MAT.crate);
  body.position.y = 0.45; g.add(body);
  var lid = box(1.42, 0.16, 1.42, MAT.crateDk);
  lid.position.y = 0.95; g.add(lid);
  for (var i = 0; i < 4; i++) {
    var edge = box(0.14, 0.9, 0.14, MAT.crateDk);
    edge.position.set(i < 2 ? 0.62 : -0.62, 0.46, i % 2 ? 0.62 : -0.62);
    g.add(edge);
  }
  var band = box(1.34, 0.12, 0.2, MAT.crateDk);
  band.position.y = 0.5; g.add(band);
  return g;
}
function makeWaterBarrel() {
  var g = new THREE.Group();
  var bar = cyl(0.58, 0.5, 1.15, MAT.barrel, 13);
  bar.position.y = 0.55; g.add(bar);
  var b1 = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.045, 6, 14), MAT.ironBand);
  b1.rotation.x = Math.PI / 2; b1.position.y = 0.32; g.add(b1);
  var b2 = b1.clone(); b2.position.y = 0.82; g.add(b2);
  var cap = cyl(0.48, 0.48, 0.07, MAT.water, 13);
  cap.position.y = 1.14; g.add(cap);
  var tap = cyl(0.06, 0.06, 0.2, MAT.ironBand, 6);
  tap.rotation.z = Math.PI / 2; tap.position.set(0.62, 0.75, 0); g.add(tap);
  return g;
}
function makeGoldBag() {
  var g = new THREE.Group();
  var bag = sph(0.6, MAT.crateDk, 10, 8);
  bag.scale.y = 0.92; bag.position.y = 0.5; g.add(bag);
  var neck = cyl(0.2, 0.3, 0.22, MAT.crateDk, 8);
  neck.position.y = 1.05; g.add(neck);
  var knot = sph(0.13, MAT.trunk, 6, 5);
  knot.position.y = 1.2; g.add(knot);
  for (var i = 0; i < 3; i++) {
    var coin = cyl(0.24, 0.24, 0.07, MAT.goldM, 12);
    coin.position.set(rand(-0.55, 0.55), 0.12 + i * 0.06, rand(-0.55, 0.55));
    coin.rotation.set(rand(0.3, 1.2), rand(0, 3), rand(0.3, 1.2));
    g.add(coin);
  }
  var glint = makeGlow(1.3, 0xffd75e);
  glint.position.y = 0.8;
  glint.material.opacity = 0.5;
  g.add(glint);
  return g;
}
function makeChest() {
  var g = new THREE.Group();
  var body = box(1.5, 0.75, 1.0, MAT.chest);
  body.position.y = 0.38; g.add(body);
  var lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 10, 1, false, 0, Math.PI), MAT.chest);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = 0.76;
  lid.rotation.x = -0.45;
  lid.position.z = -0.18;
  g.add(lid);
  var bandV = box(0.14, 0.78, 1.06, MAT.ironBand);
  bandV.position.y = 0.39; g.add(bandV);
  var lock = box(0.2, 0.26, 0.12, MAT.goldM);
  lock.position.set(0, 0.62, 0.52); g.add(lock);
  var shine = box(1.1, 0.1, 0.72, MAT.chestGold);
  shine.position.y = 0.79; shine.rotation.x = -0.42;
  g.add(shine);
  var gl = makeGlow(2.2, 0xffd75e);
  gl.position.y = 0.9;
  gl.material.opacity = 0.65;
  gl.name = 'glow';
  g.add(gl);
  return g;
}
function makeBottle() {
  var g = new THREE.Group();
  var body = cyl(0.3, 0.34, 0.9, MAT.bottleG, 10);
  body.position.y = 0.3; g.add(body);
  var neck = cyl(0.13, 0.3, 0.4, MAT.bottleG, 10);
  neck.position.y = 0.9; g.add(neck);
  var cork = cyl(0.12, 0.14, 0.16, MAT.corkM, 8);
  cork.position.y = 1.16; g.add(cork);
  var paper = cyl(0.17, 0.17, 0.5, MAT.white, 8);
  paper.position.y = 0.35; g.add(paper);
  g.rotation.z = 1.35;
  g.position.y = 0.18;
  var wrap = new THREE.Group();
  wrap.add(g);
  var gl = makeGlow(1.4, 0xa8f0c8);
  gl.position.y = 0.5;
  gl.material.opacity = 0.4;
  gl.name = 'glow';
  wrap.add(gl);
  return wrap;
}
function makeGlowBuoy() {
  var g = new THREE.Group();
  var orb = sph(0.42, MAT.glowM, 12, 9);
  orb.position.y = 0.55; g.add(orb);
  var bandM = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 6, 16), MAT.ironBand);
  bandM.rotation.x = Math.PI / 2; bandM.position.y = 0.55; g.add(bandM);
  var spikeUp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 6), MAT.ironBand);
  spikeUp.position.y = 1.05; g.add(spikeUp);
  var gl = makeGlow(3.2, 0x9fe8d8);
  gl.position.y = 0.6;
  gl.name = 'glow';
  g.add(gl);
  return g;
}
function makeFishSchool() {
  var g = new THREE.Group();
  for (var i = 0; i < 5; i++) {
    var f = new THREE.Group();
    var body = sph(0.22, i % 2 ? MAT.fishM : MAT.fishM2, 7, 5);
    body.scale.set(0.55, 0.7, 1.6); f.add(body);
    var tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), i % 2 ? MAT.fishM2 : MAT.fishM);
    tail.rotation.x = -Math.PI / 2;
    tail.scale.x = 0.4;
    tail.position.z = -0.4; f.add(tail);
    f.name = 'fish' + i;
    g.add(f);
  }
  var ripple = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 22), MAT.ringFish);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.08;
  ripple.name = 'ripple';
  g.add(ripple);
  return g;
}
function buildFloater(kind) {
  var g;
  if (kind === 'wood') g = makeLogStack();
  else if (kind === 'food') g = makeCrateBox();
  else if (kind === 'water') g = makeWaterBarrel();
  else if (kind === 'gold') g = makeGoldBag();
  else if (kind === 'chest') g = makeChest();
  else if (kind === 'bottle') g = makeBottle();
  else if (kind === 'glow') g = makeGlowBuoy();
  else g = makeFishSchool();
  var rm = kind === 'chest' || kind === 'glow' ? MAT.ringGold : kind === 'fish' ? MAT.ringFish : MAT.ring;
  var ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.85, 26), rm);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1;
  ring.name = 'ring';
  g.add(ring);
  var ring2 = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.16, 26), rm);
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.1;
  ring2.name = 'ring2';
  g.add(ring2);
  return g;
}
var FLOTPL = {};
function makeFloater(kind) {
  if (!FLOTPL[kind]) FLOTPL[kind] = buildFloater(kind);
  var g = FLOTPL[kind].clone();
  g.userData = { kind: kind, ph: rand(0, 6.28), drift: rand(0, Math.PI * 2), hold: 0 };
  g.userData.ring = g.getObjectByName('ring');
  g.userData.ring2 = g.getObjectByName('ring2');
  var gl = g.getObjectByName('glow');
  if (gl) { gl.material = gl.material.clone(); g.userData.glow = gl; }
  if (kind === 'fish') {
    g.userData.ripple = g.getObjectByName('ripple');
    g.userData.fishes = [];
    for (var fi = 0; fi < 5; fi++) {
      var ff = g.getObjectByName('fish' + fi);
      ff.userData = { orbit: rand(0.5, 1.6), sp: rand(1.8, 3.2), ph: rand(0, 6.28) };
      g.userData.fishes.push(ff);
    }
  }
  return g;
}
function spawnFloater(kind, x, z) {
  var m = makeFloater(kind);
  m.position.set(x, 0, z);
  scene.add(m);
  floaters.push(m);
  return m;
}
function removeFloater(m) {
  var i = floaters.indexOf(m);
  if (i >= 0) floaters.splice(i, 1);
  scene.remove(m);
}

var merchant = null;
function spawnMerchant(x, z) {
  if (merchant) scene.remove(merchant);
  var g = new THREE.Group();
  for (var i = 0; i < 7; i++) {
    var log = cyl(0.34, 0.34, 5.6, MAT.trunk, 8);
    log.rotation.x = Math.PI / 2;
    log.position.set(0, 0.36, -1.7 + i * 0.58);
    g.add(log);
  }
  var mastM = cyl(0.09, 0.11, 3.4, MAT.mast, 7);
  mastM.position.set(-0.6, 2.0, 0.4); g.add(mastM);
  for (var s = 0; s < 6; s++) {
    var seg = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.6, 3, 1, false, s * Math.PI / 3, Math.PI / 3), s % 2 ? MAT.canopyA : MAT.canopyB);
    seg.position.set(-0.6, 3.55, 0.4);
    g.add(seg);
  }
  var capM = sph(0.16, MAT.goldM, 6, 5);
  capM.position.set(-0.6, 3.78, 0.4); g.add(capM);
  var c1 = box(0.9, 0.7, 0.9, MAT.crateDk);
  c1.position.set(1.2, 0.9, -0.9); g.add(c1);
  var c2 = box(0.7, 0.55, 0.7, MAT.crate);
  c2.position.set(1.15, 1.5, -0.85); g.add(c2);
  var barrelM = cyl(0.42, 0.36, 0.85, MAT.barrel, 10);
  barrelM.position.set(1.3, 0.85, 0.9); g.add(barrelM);
  var lampM = makeGlow(1.8, 0xffdf90);
  lampM.position.set(1.9, 1.4, 0);
  g.add(lampM);
  var gl = makeGlow(3, 0xffe9a8);
  gl.position.y = 1;
  gl.material.opacity = 0.35;
  g.add(gl);
  g.position.set(x, 0, z);
  g.userData = { life: 90, ph: rand(0, 6.28), glow: gl };
  scene.add(g);
  merchant = g;
  return g;
}

var dolphins = [];
function makeDolphin() {
  var g = new THREE.Group();
  var body = sph(0.5, MAT.dolphinM, 10, 7);
  body.scale.set(0.55, 0.6, 1.75); g.add(body);
  var snout = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 7), MAT.dolphinM);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.02, 1.05); g.add(snout);
  var finD = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5), MAT.dolphinM);
  finD.position.set(0, 0.36, 0.1); g.add(finD);
  var fluke = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 5), MAT.dolphinM);
  fluke.rotation.x = -Math.PI / 2 + 0.2;
  fluke.scale.x = 2.2;
  fluke.position.set(0, 0.05, -0.95); g.add(fluke);
  var flipL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 5), MAT.dolphinB);
  flipL.rotation.z = Math.PI / 2.4;
  flipL.position.set(-0.32, -0.12, 0.45); g.add(flipL);
  var flipR = flipL.clone();
  flipR.rotation.z = -Math.PI / 2.4;
  flipR.position.x = 0.32; g.add(flipR);
  var belly = sph(0.42, MAT.dolphinB, 8, 6);
  belly.scale.set(0.5, 0.42, 1.55);
  belly.position.y = -0.14; g.add(belly);
  g.visible = false;
  return g;
}
(function buildDolphins() {
  for (var i = 0; i < 3; i++) {
    var d = makeDolphin();
    d.userData = { off: i * 2.1, side: i % 2 ? -1 : 1, ph: rand(0, 6.28) };
    scene.add(d); dolphins.push(d);
  }
})();

var whale = null;
function makeWhale() {
  var g = new THREE.Group();
  var back = sph(3.2, MAT.whaleM, 10, 7);
  back.scale.set(1, 0.55, 1.9);
  back.position.y = -1.3;
  g.add(back);
  var finW = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 5), MAT.whaleM);
  finW.scale.set(0.4, 1, 1);
  finW.rotation.z = Math.PI / 2;
  finW.position.set(-2.4, -1.7, 0.3); g.add(finW);
  var finW2 = finW.clone(); finW2.rotation.z = -Math.PI / 2; finW2.position.x = 2.4; g.add(finW2);
  var tailW = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 5), MAT.whaleM);
  tailW.scale.set(2.0, 0.5, 1);
  tailW.position.set(0, -1.5, -6.2); g.add(tailW);
  var spout = makeGlow(2.5, 0xe8f6ff);
  spout.position.set(0, 0.8, 2.2);
  spout.material.opacity = 0;
  g.add(spout);
  g.userData = { life: 26, spout: spout, dir: rand(0, 6.28) };
  return g;
}

var RAIN_N = 1200;
var rainGeo = new THREE.BufferGeometry();
var rainPos = new Float32Array(RAIN_N * 6);
var rainDat = [];
for (var ri = 0; ri < RAIN_N; ri++) rainDat.push({ x: 0, y: -100, z: 0, v: 0 });
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
var rainMat = new THREE.LineBasicMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.0 });
var rainMesh = new THREE.LineSegments(rainGeo, rainMat);
rainMesh.frustumCulled = false;
scene.add(rainMesh);

var FOAM_N = 170;
var foamGeo = new THREE.BufferGeometry();
var foamPos = new Float32Array(FOAM_N * 3);
var foamDat = [];
for (var fi = 0; fi < FOAM_N; fi++) foamDat.push({ life: 0, x: 0, y: 0, z: 0, vy: 0 });
foamGeo.setAttribute('position', new THREE.BufferAttribute(foamPos, 3));
var foamMat = new THREE.PointsMaterial({ map: glowTex, color: 0xffffff, size: 0.85, transparent: true, opacity: 0.9, depthWrite: false });
var foamMesh = new THREE.Points(foamGeo, foamMat);
foamMesh.frustumCulled = false;
scene.add(foamMesh);

var rainbow = null;
var rainbowTex = (function () {
  var cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  var ctx = cv.getContext('2d');
  var g = ctx.createRadialGradient(128, 128, 128 * 0.28, 128, 128, 128);
  g.addColorStop(0.00, 'rgba(255,120,90,0)');
  g.addColorStop(0.16, 'rgba(255,90,70,0.55)');
  g.addColorStop(0.30, 'rgba(255,170,60,0.6)');
  g.addColorStop(0.44, 'rgba(255,240,110,0.62)');
  g.addColorStop(0.58, 'rgba(120,225,120,0.6)');
  g.addColorStop(0.72, 'rgba(90,180,245,0.58)');
  g.addColorStop(0.86, 'rgba(160,115,235,0.5)');
  g.addColorStop(1.00, 'rgba(200,160,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
})();
function spawnRainbow() {
  if (rainbow) return;
  var geo = new THREE.RingGeometry(70, 108, 60, 1, 0, Math.PI);
  var mat = new THREE.MeshBasicMaterial({ map: rainbowTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 0 });
  rainbow = new THREE.Mesh(geo, mat);
  var a = state.boat.heading + Math.PI + rand(-0.7, 0.7);
  rainbow.position.set(state.boat.x + Math.sin(a) * 185, 0, state.boat.z + Math.cos(a) * 185);
  rainbow.rotation.y = a + Math.PI;
  rainbow.userData = { life: 0 };
  scene.add(rainbow);
}

var camCtl = { dist: 16, yaw: 0, pitch: 0.42, user: 0 };
