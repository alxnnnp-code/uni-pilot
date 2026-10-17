// smoke.js - test headless del preview: canvas 2D falso + DOM minimo.
// Ejecuta las 4 skills y comprueba que no hay errores y que se generan VFX.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = __dirname;
const vfxSrc = fs.readFileSync(path.join(dir, "vfx.js"), "utf8");
const engineSrc = fs.readFileSync(path.join(dir, "engine.js"), "utf8");

// ===== canvas 2D falso =====
function makeCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, setTransform: noop,
    clearRect: noop, fillRect: noop, strokeRect: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
    fillText: noop, strokeText: noop, setLineDash: noop,
    createRadialGradient: () => grad, createLinearGradient: () => grad,
    globalAlpha: 1, globalCompositeOperation: "source-over",
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineJoin: "", lineCap: "",
    font: "", textAlign: ""
  };
}

function makeEl(tag) {
  const el = {
    tagName: tag, dataset: {}, style: {}, children: [], textContent: "",
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    insertAdjacentHTML: () => {}, querySelector: () => makeEl("span"),
    appendChild: (child) => { el.children.push(child); return child; },
    addEventListener: (type, fn) => { (el.handlers[type] = el.handlers[type] || []).push(fn); },
    handlers: {},
    getContext: () => makeCtx(),
    clientWidth: 1280, clientHeight: 720, width: 1280, height: 720
  };
  el.childNodes = el.children;
  return el;
}

const buttons = ["ThunderStep", "LightningOrbs", "ThunderPursuit", "ThunderFiend"].map((name) => {
  const b = makeEl("button");
  b.dataset.skill = name;
  return b;
});

const elements = { game: makeEl("canvas"), dmg: makeEl("b"), crits: makeEl("b"), enemies: makeEl("b") };

const window = {
  devicePixelRatio: 1,
  addEventListener: () => {},
  requestAnimationFrame: (fn) => { pendingFrames.push(fn); },
  setTimeout: (fn, ms) => { timers.push({ fn, at: now + (ms || 0) }); return timers.length; }
};
const document = {
  getElementById: (id) => elements[id],
  querySelectorAll: (sel) => (sel.indexOf("#bar") === 0 ? buttons : []),
  createElement: (tag) => makeEl(tag),
  addEventListener: () => {}
};

let now = 0;
const pendingFrames = [];
const timers = [];

const sandbox = {
  window, document, console,
  performance: { now: () => now },
  requestAnimationFrame: window.requestAnimationFrame,
  setTimeout: window.setTimeout,
  Math, Date, Object, Array, JSON, Number, String, Boolean, isNaN, parseInt, parseFloat
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

// En un navegador, window ES el objeto global: refleja window.* como globales.
for (const key of ["VFX"]) {
  Object.defineProperty(sandbox, key, {
    get: () => window[key],
    set: (v) => { window[key] = v; },
    configurable: true
  });
}

const ctx = vm.createContext(sandbox);
vm.runInContext(vfxSrc, ctx, { filename: "vfx.js" });
vm.runInContext(engineSrc, ctx, { filename: "engine.js" });

// ===== simular ~15 s de juego disparando todas las skills =====
const VFX = sandbox.window.VFX;
const step = 1 / 60;
let frames = 0;
const events = [];
const errors = [];

function runTimers() {
  for (let i = timers.length - 1; i >= 0; i--) {
    if (timers[i].at <= now) { const t = timers.splice(i, 1)[0]; t.fn(); }
  }
}

function runFrame(dtSeconds) {
  now += dtSeconds * 1000;
  runTimers();
  const pending = pendingFrames.splice(0, pendingFrames.length);
  for (const fn of pending) { fn(now); frames++; }
}

const skillOrder = ["ThunderStep", "LightningOrbs", "ThunderPursuit", "ThunderFiend"];
let castAt = 0;
let skillIdx = 0;
const TOTAL_FRAMES = 60 * 15;

for (let s = 0; s < TOTAL_FRAMES; s++) {
  const st = sandbox.window.__luckState;

  // el jugador "camina" hacia el enemigo mas cercano (usa el mismo camino que el input)
  if (st && st.enemies.length) {
    let best = null, bestD = Infinity;
    for (const e of st.enemies) {
      const d = Math.hypot(e.x - st.player.x, e.y - st.player.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (best && bestD > 90) {
      const nx = (best.x - st.player.x) / bestD;
      const ny = (best.y - st.player.y) / bestD;
      st.keys[nx > 0.3 ? "d" : nx < -0.3 ? "a" : "x"] = true;
      st.keys[ny > 0.3 ? "s" : ny < -0.3 ? "w" : "x"] = true;
      st.aimAngle = Math.atan2(ny, nx);
      st.aim = { x: nx, y: ny };
    } else {
      st.keys = {};
    }
  }

  // dispara una skill cada 1.2 s (recorre las 4 en bucle)
  if (s >= castAt) {
    const name = skillOrder[skillIdx % skillOrder.length];
    skillIdx++;
    castAt = s + 72;
    const btn = buttons.find((b) => b.dataset.skill === name);
    const handler = btn.handlers.click && btn.handlers.click[0];
    if (!handler) { errors.push(new Error("sin handler de click en " + name)); break; }
    events.push("cast " + name + " @ " + (s / 60).toFixed(1) + "s");
    try { handler(); } catch (e) { errors.push(e); break; }
  }
  try { runFrame(step); } catch (e) { errors.push(e); break; }
}

const report = {
  frames: frames,
  seconds: +(now / 1000).toFixed(2),
  errors: errors.map((e) => String((e && e.message) || e)),
  particles: VFX.particles.length,
  bolts: VFX.boltPool.length,
  texts: VFX.texts.length,
  casts: events.length,
  sample: events.slice(0, 10)
};

// ===== comprobaciones de gameplay =====
const st = sandbox.window.__luckState;
if (st) {
  report.damageDealt = st.dmgTotal;
  report.crits = st.crits;
  report.kills = st.kills;
  report.enemiesAlive = st.enemies.length;
  report.playerHp = Math.round(st.player.hp);
  report.cooldownsRunning = Object.keys(st.cooldowns).filter((k) => st.cooldowns[k] > st.time).length;
  if (st.dmgTotal <= 0) errors.push(new Error("no se aplico daño en 15 s de simulación"));
  if (frames < 890) errors.push(new Error("el bucle de render no corrio todos los frames: " + frames));
} else {
  errors.push(new Error("el engine no expuso __luckState"));
}
report.errors = errors.map((e) => String((e && e.message) || e));

console.log(JSON.stringify(report, null, 2));
process.exit(report.errors.length ? 1 : 0);
