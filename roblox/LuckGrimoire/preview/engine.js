// engine.js - demo jugable del grimorio de Luck
// Replica las 4 skills de LuckSkills.lua (mismos daños, rangos y cooldowns).
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // ===== Config: identico a LuckSkills.Config =====
  const CONFIG = {
    ThunderStep:    { key: "z", Cooldown: 4,  Damage: 18, Range: 35 },
    LightningOrbs:  { key: "x", Cooldown: 7,  Damage: 10, Count: 5, Speed: 120 },
    ThunderPursuit: { key: "c", Cooldown: 10, Damage: 30, Range: 60 },
    ThunderFiend:   { key: "v", Cooldown: 25, Damage: 55, Radius: 25 }
  };
  const CRIT_CHANCE = 0.25;
  const CRIT_MULT = 1.75;
  const PX = 2.6;                 // 1 stud = 2.6 px
  const PLAYER_SPEED = 9;         // studs/s
  const ENEMY_SPEED = 4.4;
  const ENEMY_HP = 70;
  const ENEMY_DAMAGE = 9;
  const MAX_ENEMIES = 6;

  // ===== estado =====
  const state = {
    player: { x: 0, y: 0, r: 22, hp: 100, maxHp: 100, speedBonus: 0, aim: 0, hitFlash: 0 },
    enemies: [],
    orbs: [],
    effects: [],
    cooldowns: {},
    keys: {},
    aim: { x: 1, y: 0 },
    shake: { intensity: 0, t: 0, dur: 0 },
    flash: 0,
    dmgTotal: 0,
    crits: 0,
    kills: 0,
    time: 0
  };

  // ===== helpers =====
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const studs = (px) => px / PX;

  function rollDamage(base) {
    if (Math.random() < CRIT_CHANCE) return [Math.floor(base * CRIT_MULT), true];
    return [base, false];
  }

  function damage(enemy, base) {
    const roll = rollDamage(base);
    enemy.hp -= roll[0];
    state.dmgTotal += roll[0];
    if (roll[1]) state.crits++;
    VFX.floatText(enemy.x, enemy.y - enemy.r - 8, roll[1] ? "¡SUERTE! " + roll[0] : String(roll[0]), roll[1]);
    VFX.emit(enemy.x, enemy.y, { count: roll[1] ? 26 : 8, speedMin: 30, speedMax: 110 });
    if (enemy.hp <= 0) {
      state.kills++;
      VFX.impact(state.effects, enemy.x, enemy.y, 1.2);
      VFX.shockwave(state.effects, enemy.x, enemy.y, 90, 0.5);
      state.enemies.splice(state.enemies.indexOf(enemy), 1);
    }
  }

  // Enemigos a menos de N studs (equivalente a enemiesInRadius)
  function enemiesInRadius(x, y, radiusStuds) {
    const rp = radiusStuds * PX;
    return state.enemies.filter(function (e) { return Math.hypot(e.x - x, e.y - y) <= rp; });
  }

  function nearestEnemy(radiusStuds) {
    const list = enemiesInRadius(state.player.x, state.player.y, radiusStuds);
    let best = null, bestD = Infinity;
    for (const e of list) {
      const d = dist(e, state.player);
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  function shake(x, y, intensity, radiusStuds) {
    if (!VFX.ScreenShake) return;
    const cam = camera();
    const d = Math.hypot(cam.x - x, cam.y - y);
    const falloff = VFX.clamp(1 - studs(d) / (radiusStuds || 80), 0, 1);
    if (falloff <= 0) return;
    state.shake.intensity = Math.max(state.shake.intensity, intensity * falloff);
    state.shake.dur = 0.28;
    state.shake.t = 0;
    state.flash = Math.max(state.flash, 0.35 * falloff);
  }

  function afterimageParts(entity) {
    return [
      { x: entity.x, y: entity.y, r: entity.r },
      { x: entity.x - Math.cos(entity.aim || 0) * 14, y: entity.y - Math.sin(entity.aim || 0) * 14, r: entity.r * 0.6 }
    ];
  }

  // ===== skills (1:1 con LuckSkills.lua) =====
  const skills = {
    // SKILL 1: dash relampago
    ThunderStep: function () {
      const cfg = CONFIG.ThunderStep;
      const p = state.player;
      const dir = state.aim;
      const start = { x: p.x, y: p.y };
      const finish = { x: p.x + dir.x * cfg.Range * PX, y: p.y + dir.y * cfg.Range * PX };

      // carga en el punto de salida
      VFX.shockwave(state.effects, start.x, start.y, 40, 0.35);
      VFX.emit(start.x, start.y, { count: 25, speedMin: 40, speedMax: 110 });
      VFX.afterimage(state.effects, afterimageParts(p), 0.4);

      // golpea a los enemigos del recorrido
      const mid = { x: (start.x + finish.x) / 2, y: (start.y + finish.y) / 2 };
      const halfStuds = Math.hypot(finish.x - start.x, finish.y - start.y) / 2 / PX + 4;
      for (const e of enemiesInRadius(mid.x, mid.y, halfStuds)) {
        damage(e, cfg.Damage);
        VFX.impact(state.effects, e.x, e.y, 0.8);
      }

      VFX.spawnBolt(start.x, start.y, finish.x, finish.y, { life: 0.35, width: 5, jitter: 22 });
      p.x = finish.x;
      p.y = finish.y;
      VFX.afterimage(state.effects, afterimageParts(p), 0.35);

      // remolino de llegada + impacto
      VFX.emit(finish.x, finish.y, { count: 40, speedMin: 20, speedMax: 90, drag: 2.4 });
      shake(finish.x, finish.y, 0.9);
      VFX.impact(state.effects, finish.x, finish.y, 0.9);
    },

    // SKILL 2: rafaga de orbes
    LightningOrbs: function () {
      const cfg = CONFIG.LightningOrbs;
      const p = state.player;
      VFX.aura(state.effects, p, 0.55); // chispas al cargar
      for (let i = 0; i < cfg.Count; i++) {
        setTimeout(function () {
          const a = state.aimAngle + VFX.rand(-0.14, 0.14);
          state.orbs.push({
            x: p.x + Math.cos(a) * 12,
            y: p.y + Math.sin(a) * 12,
            vx: Math.cos(a) * cfg.Speed * PX,
            vy: Math.sin(a) * cfg.Speed * PX,
            r: 6,
            life: 0.7,
            trail: []
          });
          VFX.emit(p.x, p.y, { count: 14, speedMin: 30, speedMax: 90 });
        }, i * 120);
      }
    },

    // SKILL 3: teletransporte detras del enemigo mas cercano
    ThunderPursuit: function () {
      const cfg = CONFIG.ThunderPursuit;
      const p = state.player;
      const target = nearestEnemy(cfg.Range);
      if (!target) { VFX.floatText(p.x, p.y - 40, "sin objetivo", false); return false; }

      VFX.shockwave(state.effects, p.x, p.y, 60, 0.4);
      VFX.afterimage(state.effects, afterimageParts(p), 0.5);
      VFX.emit(p.x, p.y, { count: 30, speedMin: 30, speedMax: 100 });

      // aparece detras del enemigo
      const ang = target.aim + Math.PI;
      const behind = { x: target.x + Math.cos(ang) * 4 * PX, y: target.y + Math.sin(ang) * 4 * PX };
      VFX.spawnBolt(p.x, p.y, behind.x, behind.y, { life: 0.3, width: 4.5, jitter: 18 });
      p.x = behind.x;
      p.y = behind.y;
      p.aim = Math.atan2(target.y - p.y, target.x - p.x);
      state.aim = { x: Math.cos(p.aim), y: Math.sin(p.aim) };
      VFX.afterimage(state.effects, afterimageParts(p), 0.4);

      // rayo vertical + impacto
      VFX.spawnBolt(target.x, target.y - 260, target.x, target.y, { life: 0.4, width: 9, jitter: 24 });
      VFX.impact(state.effects, target.x, target.y, 1.4);
      shake(target.x, target.y, 1.6);
      damage(target, cfg.Damage);
      VFX.emit(target.x, target.y, { count: 40, speedMin: 60, speedMax: 200 });
      return true;
    },

    // SKILL 4 (ULTIMATE): tormenta en area
    ThunderFiend: function () {
      const cfg = CONFIG.ThunderFiend;
      const p = state.player;
      const center = { x: p.x, y: p.y };

      shake(center.x, center.y, 2.5, 150);
      VFX.aura(state.effects, p, 6);
      VFX.shockwave(state.effects, center.x, center.y, cfg.Radius * 1.6 * PX, 0.7);
      VFX.spawnBolt(center.x, center.y - 300, center.x, center.y, { life: 0.5, width: 14, jitter: 30 });

      p.speedBonus = 16; // modo Thunder Fiend: +velocidad 6s
      setTimeout(function () { p.speedBonus = 0; }, 6000);

      for (let wave = 0; wave < 3; wave++) {
        (function (w) {
          setTimeout(function () {
            VFX.shockwave(state.effects, center.x, center.y, cfg.Radius * (1 + (w + 1) * 0.5) * PX, 0.55);
            for (let i = 0; i < 10; i++) {
              const a = VFX.rand(0, TAU);
              const rr = VFX.rand(0, cfg.Radius * PX);
              const gx = center.x + Math.cos(a) * rr;
              const gy = center.y + Math.sin(a) * rr;
              VFX.spawnBolt(gx, gy - 260, gx, gy, { life: 0.3, width: 4.5, jitter: 20 });
              VFX.impact(state.effects, gx, gy, 0.7);
            }
            for (const e of enemiesInRadius(center.x, center.y, cfg.Radius)) {
              damage(e, Math.floor(cfg.Damage / 3));
              VFX.emit(e.x, e.y, { count: 20, speedMin: 40, speedMax: 130 });
            }
          }, w * 450);
        })(wave);
      }
    }
  };

  function cast(name) {
    const cfg = CONFIG[name];
    if (!cfg) return;
    const now = state.time;
    if ((state.cooldowns[name] || 0) > now) return;
    const ok = skills[name]();
    if (ok === false) return; // sin objetivo: no gasta cooldown
    state.cooldowns[name] = now + cfg.Cooldown;
  }

  // ===== enemigos =====
  function spawnEnemy() {
    const a = VFX.rand(0, TAU);
    const r = VFX.rand(340, 560);
    state.enemies.push({
      x: state.player.x + Math.cos(a) * r,
      y: state.player.y + Math.sin(a) * r,
      r: 18,
      hp: ENEMY_HP,
      maxHp: ENEMY_HP,
      aim: 0,
      spawn: 0.4
    });
    VFX.shockwave(state.effects, state.enemies[state.enemies.length - 1].x, state.enemies[state.enemies.length - 1].y, 50, 0.4);
  }

  function updateEnemies(dt) {
    for (const e of state.enemies) {
      if (e.spawn > 0) { e.spawn -= dt; continue; }
      const dx = state.player.x - e.x;
      const dy = state.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.aim = Math.atan2(dy, dx);
      const reach = e.r + state.player.r + 4;
      if (d > reach) {
        const step = ENEMY_SPEED * PX * dt;
        e.x += (dx / d) * step;
        e.y += (dy / d) * step;
      } else if (state.player.hitFlash <= 0) {
        state.player.hp -= ENEMY_DAMAGE;
        state.player.hitFlash = 0.6;
        VFX.emit(state.player.x, state.player.y, { count: 18, speedMin: 40, speedMax: 120 });
        VFX.floatText(state.player.x, state.player.y - 46, "-" + ENEMY_DAMAGE, true);
        shake(state.player.x, state.player.y, 0.8);
        if (state.player.hp <= 0) respawnPlayer();
      }
    }
  }

  function respawnPlayer() {
    const p = state.player;
    p.hp = p.maxHp;
    p.x = 0;
    p.y = 0;
    VFX.impact(state.effects, p.x, p.y, 1.4);
    VFX.shockwave(state.effects, p.x, p.y, 260, 0.7);
    state.enemies.length = 0;
    for (let i = 0; i < 4; i++) spawnEnemy();
  }

  // ===== input =====
  window.addEventListener("keydown", function (ev) {
    const k = ev.key.toLowerCase();
    state.keys[k] = true;
    const found = Object.keys(CONFIG).find(function (n) { return CONFIG[n].key === k; });
    if (found) { cast(found); ev.preventDefault(); }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) ev.preventDefault();
  });
  window.addEventListener("keyup", function (ev) { state.keys[ev.key.toLowerCase()] = false; });
  canvas.addEventListener("mousemove", function (ev) {
    const cam = camera();
    const wx = ev.clientX - cam.ox;
    const wy = ev.clientY - cam.oy;
    state.aimAngle = Math.atan2(wy - cam.cy, wx - cam.cx);
    state.aim = { x: Math.cos(state.aimAngle), y: Math.sin(state.aimAngle) };
  });

  document.querySelectorAll("#bar button").forEach(function (btn) {
    const key = btn.dataset.skill;
    const label = (btn.textContent || key).trim().replace(/^[A-Za-z]\s*/, "") || key;
    btn.textContent = "";
    const badge = document.createElement("b");
    badge.textContent = CONFIG[key].key.toUpperCase();
    const span = document.createElement("span");
    span.className = "label";
    span.textContent = label;
    btn.appendChild(badge);
    btn.appendChild(span);
    btn.addEventListener("click", function () { cast(key); });
  });

  // ===== HUD =====
  const el = {
    dmg: document.getElementById("dmg"),
    crits: document.getElementById("crits"),
    enemies: document.getElementById("enemies"),
    buttons: {}
  };
  document.querySelectorAll("#bar button").forEach(function (b) { el.buttons[b.dataset.skill] = b; });

  function updateHud() {
    el.dmg.textContent = state.dmgTotal;
    el.crits.textContent = state.crits;
    el.enemies.textContent = state.enemies.length;
    for (const name in el.buttons) {
      const btn = el.buttons[name];
      const left = Math.max(0, (state.cooldowns[name] || 0) - state.time);
      const total = CONFIG[name].Cooldown;
      btn.querySelector(".cd").style.transform = "scaleX(" + (left / total) + ")";
      btn.classList.toggle("cooling", left > 0);
      btn.classList.toggle("ready", left <= 0);
    }
  }

  // ===== camara =====
  function camera() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return { cx: w / 2, cy: h / 2, ox: w / 2, oy: h / 2, w: w, h: h };
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", fitCanvas);

  // ===== render =====
  function drawFloor(cam) {
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, cam.w, cam.h);

    // rejilla tipo arena (cada 10 studs)
    const cell = 10 * PX;
    const ox = ((-state.player.x) % cell + cell) % cell;
    const oy = ((-state.player.y) % cell + cell) % cell;
    ctx.strokeStyle = "rgba(90, 105, 160, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < cam.w; x += cell) { ctx.moveTo(x, 0); ctx.lineTo(x, cam.h); }
    for (let y = oy; y < cam.h; y += cell) { ctx.moveTo(0, y); ctx.lineTo(cam.w, y); }
    ctx.stroke();

    // circulo de alcance de la ulti
    ctx.strokeStyle = "rgba(255, 220, 60, 0.08)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.arc(cam.ox, cam.oy, CONFIG.ThunderFiend.Radius * PX, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawEntity(x, y, r, color, aim) {
    ctx.save();
    ctx.translate(x, y);
    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75, r * 1.1, r * 0.5, 0, 0, TAU);
    ctx.fill();
    // cuerpo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
    // indicador de direccion
    ctx.rotate(aim || 0);
    ctx.fillStyle = "#1a1400";
    ctx.beginPath();
    ctx.moveTo(r * 0.2, 0);
    ctx.lineTo(-r * 0.45, -r * 0.5);
    ctx.lineTo(-r * 0.45, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHealthBar(e) {
    const w = 46, h = 5;
    const k = VFX.clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w, h);
    ctx.fillStyle = k > 0.5 ? "#ffdc3c" : "#ff6a4d";
    ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w * k, h);
  }

  function drawOrbs(dt) {
    for (let i = state.orbs.length - 1; i >= 0; i--) {
      const o = state.orbs[i];
      o.life -= dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.trail.push({ x: o.x, y: o.y, life: 1 });
      if (o.trail.length > 14) o.trail.shift();
      for (const t of o.trail) t.life -= dt * 3.2;
      o.trail = o.trail.filter(function (t) { return t.life > 0; });

      let hit = null;
      for (const e of state.enemies) {
        if (e.spawn > 0) continue;
        if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + o.r) { hit = e; break; }
      }
      if (hit) {
        damage(hit, CONFIG.LightningOrbs.Damage);
        VFX.impact(state.effects, o.x, o.y, 1.1);
        shake(o.x, o.y, 0.35);
        state.orbs.splice(i, 1);
        continue;
      }
      if (o.life <= 0 || Math.hypot(o.x - state.player.x, o.y - state.player.y) > 1400) {
        state.orbs.splice(i, 1);
      }
    }

    // estela + nucleo (equivalente al Trail + particulas del orbe)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const o of state.orbs) {
      for (const t of o.trail) {
        ctx.globalAlpha = t.life * 0.5;
        ctx.fillStyle = VFX.particleColor(1 - t.life);
        ctx.beginPath();
        ctx.arc(t.x, t.y, o.r * t.life * 1.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 0.85;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3.4);
      g.addColorStop(0, "rgba(255,255,235,0.95)");
      g.addColorStop(0.5, "rgba(255,220,60,0.45)");
      g.addColorStop(1, "rgba(255,160,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 3.4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = VFX.CORE;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHpBar(cam) {
    const p = state.player;
    const w = 220, h = 12;
    const x = cam.w - w - 28, y = 26;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, w, h);
    const k = VFX.clamp(p.hp / p.maxHp, 0, 1);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#ffdc3c");
    g.addColorStop(1, "#ffa014");
    ctx.fillStyle = k > 0.35 ? g : "#ff5a5a";
    ctx.fillRect(x, y, w * k, h);
    ctx.strokeStyle = "rgba(255,220,60,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 12px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HP " + Math.max(0, Math.round(p.hp)) + " / " + p.maxHp, x, y + h + 16);
  }

  // ===== bucle principal =====
  function updatePlayer(dt) {
    const p = state.player;
    let mx = 0, my = 0;
    if (state.keys["a"] || state.keys["arrowleft"]) mx -= 1;
    if (state.keys["d"] || state.keys["arrowright"]) mx += 1;
    if (state.keys["w"] || state.keys["arrowup"]) my -= 1;
    if (state.keys["s"] || state.keys["arrowdown"]) my += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      const speed = (PLAYER_SPEED + p.speedBonus) * PX * dt;
      p.x += (mx / len) * speed;
      p.y += (my / len) * speed;
      p.aim = Math.atan2(my, mx);
      // chispas de los pies al correr con la ulti activa
      if (p.speedBonus > 0 && Math.random() < 0.6) {
        VFX.emit(p.x, p.y + p.r * 0.6, { count: 1, speedMin: 10, speedMax: 40, sizeMin: 1, sizeMax: 3 });
      }
    }
    if (p.hitFlash > 0) p.hitFlash -= dt;
  }

  let last = performance.now();
  let spawnTimer = 1.2;

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.time += dt;

    updatePlayer(dt);
    updateEnemies(dt);
    drawOrbs(dt);
    VFX.updateParticles(dt);
    VFX.updateBolts(dt);
    VFX.updateEffects(state.effects, dt);
    VFX.updateTexts(dt);

    // spawn progresivo de enemigos
    spawnTimer -= dt;
    if (spawnTimer <= 0 && state.enemies.length < MAX_ENEMIES) {
      spawnEnemy();
      spawnTimer = VFX.rand(1.4, 2.6);
    }

    // camara: sigue al jugador + temblor
    const cam = camera();
    let sx = 0, sy = 0;
    if (state.shake.dur > 0) {
      state.shake.t += dt;
      const fade = Math.max(0, 1 - state.shake.t / state.shake.dur);
      if (fade <= 0) {
        state.shake.dur = 0;
        state.shake.intensity = 0;
      } else {
        const a = state.shake.intensity * 6 * fade;
        sx = VFX.rand(-a, a);
        sy = VFX.rand(-a, a);
      }
    }

    ctx.save();
    ctx.clearRect(0, 0, cam.w, cam.h);
    drawFloor(cam);
    ctx.translate(cam.ox + sx, cam.oy + sy);

    // circulo de mira
    ctx.strokeStyle = "rgba(255,220,60,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, CONFIG.ThunderPursuit.Range * PX, 0, TAU);
    ctx.stroke();

    // orbes ya dibujados en drawOrbs, aqui van los cuerpos
    for (const e of state.enemies) {
      drawEntity(e.x, e.y, e.r, "#3d4670", e.aim);
      drawHealthBar(e);
    }
    drawEntity(state.player.x, state.player.y, state.player.r,
      state.player.hitFlash > 0 ? "#fff2a8" : "#ffdc3c", state.player.aim);

    VFX.drawEffects(ctx, state.effects);
    VFX.drawBolts(ctx);
    VFX.drawParticles(ctx);
    VFX.drawTexts(ctx);

    ctx.restore();

    // HUD en pantalla
    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255, 240, 170, " + (state.flash * 0.5) + ")";
      ctx.fillRect(0, 0, cam.w, cam.h);
      state.flash = Math.max(0, state.flash - dt * 2.4);
    }
    // vineta roja al recibir daño
    if (state.player.hitFlash > 0) {
      const v = ctx.createRadialGradient(cam.cx, cam.cy, cam.h * 0.25, cam.cx, cam.cy, cam.h * 0.75);
      v.addColorStop(0, "rgba(255,0,0,0)");
      v.addColorStop(1, "rgba(255,40,40," + (0.35 * state.player.hitFlash) + ")");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, cam.w, cam.h);
    }
    drawHpBar(cam);
    updateHud();

    requestAnimationFrame(tick);
  }

  // ===== arranque =====
  window.__luckState = state; // expuesto para el test headless (preview/smoke.js)
  fitCanvas();
  state.aimAngle = 0;
  for (let i = 0; i < 4; i++) spawnEnemy();
  requestAnimationFrame(tick);
})();
