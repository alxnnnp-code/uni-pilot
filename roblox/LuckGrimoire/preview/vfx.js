// vfx.js - simulacion de los VFX de LuckVFX.lua en canvas 2D
// Mismos colores y misma logica de rayos/particulas que el modulo de Roblox.
(function (global) {
  "use strict";

  const TAU = Math.PI * 2;

  const VFX = {
    CORE: "#ffffeb",
    GLOW: "#ffdc3c",
    DEEP: "#ffa014",
    ScreenShake: true,

    rand(a, b) { return a + Math.random() * (b - a); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },

    // Paleta de una particula: nucleo -> amarillo -> naranja
    particleColor(t) {
      if (t < 0.4) return "#ffffeb";
      if (t < 0.75) return "#ffdc3c";
      return "#ffa014";
    },

    // ===== sistema de particulas =====
    particles: [],

    emit(x, y, opts) {
      opts = opts || {};
      const count = opts.count || 12;
      const spread = opts.spread === undefined ? Math.PI : opts.spread;
      for (let i = 0; i < count; i++) {
        const ang = opts.angle === undefined
          ? VFX.rand(0, TAU)
          : opts.angle + VFX.rand(-spread, spread);
        const spd = VFX.rand(opts.speedMin || 40, opts.speedMax || 160);
        VFX.particles.push({
          x: x, y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          decay: VFX.rand(1.6, 3.2),
          size: VFX.rand(opts.sizeMin || 2, opts.sizeMax || 6),
          drag: opts.drag === undefined ? 3.2 : opts.drag,
          gravity: opts.gravity || 0
        });
      }
    },

    updateParticles(dt) {
      const list = VFX.particles;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },

    drawParticles(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of VFX.particles) {
        ctx.globalAlpha = VFX.clamp(p.life, 0, 1);
        ctx.fillStyle = VFX.particleColor(1 - p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    },

    // ===== rayos procedurales (equivalente a VFX.Bolt) =====
    boltPoints(x1, y1, x2, y2, jitter) {
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const segs = VFX.clamp(Math.floor(dist / 26), 4, 24);
      const pts = [{ x: x1, y: y1 }];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const falloff = Math.sin(Math.PI * t); // mas caotico en el centro
        pts.push({
          x: VFX.lerp(x1, x2, t) + VFX.rand(-1, 1) * jitter * falloff,
          y: VFX.lerp(y1, y2, t) + VFX.rand(-1, 1) * jitter * falloff
        });
      }
      pts.push({ x: x2, y: y2 });
      return pts;
    },

    strokePath(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    },

    drawBolt(ctx, x1, y1, x2, y2, opts) {
      opts = opts || {};
      const width = opts.width || 3;
      const jitter = opts.jitter || 14;
      const alpha = opts.alpha === undefined ? 1 : opts.alpha;
      if (alpha <= 0 || width <= 0.1) return;
      const pts = VFX.boltPoints(x1, y1, x2, y2, jitter);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.strokeStyle = VFX.GLOW;                 // halo
      ctx.globalAlpha = alpha * 0.35;
      ctx.lineWidth = width * 3.2;
      VFX.strokePath(ctx, pts);

      ctx.strokeStyle = VFX.CORE;                 // nucleo
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      VFX.strokePath(ctx, pts);

      if (opts.branches !== false) {              // ramas
        for (let i = 0; i < pts.length - 1; i++) {
          if (Math.random() > 0.3) continue;
          const a = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) + VFX.rand(-0.9, 0.9);
          const bl = VFX.rand(18, 52);
          VFX.drawBolt(ctx, pts[i].x, pts[i].y,
            pts[i].x + Math.cos(a) * bl, pts[i].y + Math.sin(a) * bl,
            { width: width * 0.45, jitter: jitter * 0.6, alpha: alpha * 0.8, branches: false });
        }
      }
      ctx.restore();
    },

    // Rayos temporales que se dibujan con fade
    boltPool: [],

    spawnBolt(x1, y1, x2, y2, opts) {
      opts = opts || {};
      VFX.boltPool.push({
        x1: x1, y1: y1, x2: x2, y2: y2, t: 0,
        dur: opts.life || 0.3,
        width: opts.width || 3,
        jitter: opts.jitter || 14,
        flicker: opts.flicker !== false
      });
      if (opts.flicker !== false) { // segundo destello con otra forma
        const copy = VFX.boltPool[VFX.boltPool.length - 1];
        setTimeout(function () {
          if (copy) VFX.spawnBolt(x1, y1, x2, y2, { life: copy.dur * 0.6, width: copy.width * 0.7, jitter: copy.jitter, flicker: false });
        }, copy.dur * 350);
      }
    },

    updateBolts(dt) {
      for (let i = VFX.boltPool.length - 1; i >= 0; i--) {
        const b = VFX.boltPool[i];
        b.t += dt;
        if (b.t >= b.dur) VFX.boltPool.splice(i, 1);
      }
    },

    drawBolts(ctx) {
      for (const b of VFX.boltPool) {
        const a = 1 - b.t / b.dur;
        VFX.drawBolt(ctx, b.x1, b.y1, b.x2, b.y2, {
          width: b.width * a, jitter: b.jitter, alpha: a, branches: b.width > 2.2
        });
      }
    },

    // Esfera + anillo + chispas + arcos radiales (equivalente a VFX.Impact)
    impact(list, x, y, scale) {
      scale = scale || 1;
      list.push({ kind: "impact", x: x, y: y, t: 0, dur: 0.5, scale: scale });
      VFX.emit(x, y, { count: Math.floor(30 * scale), speedMin: 80 * scale, speedMax: 260 * scale });
      VFX.emit(x, y, { count: 8, speedMin: 10, speedMax: 45, sizeMin: 6, sizeMax: 14, drag: 1.2 });
      for (let i = 0; i < 3; i++) {
        const a = VFX.rand(0, TAU);
        VFX.spawnBolt(x, y, x + Math.cos(a) * VFX.rand(40, 90) * scale,
          y + Math.sin(a) * VFX.rand(40, 90) * scale, { life: 0.22, width: 2, jitter: 8, flicker: false });
      }
    },

    shockwave(list, x, y, size, life) {
      list.push({ kind: "ring", x: x, y: y, t: 0, dur: life || 0.45, size: size || 140 });
    },

    afterimage(list, parts, life) {
      list.push({ kind: "afterimage", x: parts[0].x, y: parts[0].y, t: 0, dur: life || 0.35, parts: parts });
    },

    aura(list, entity, duration) {
      list.push({ kind: "aura", entity: entity, t: 0, dur: duration, x: entity.x, y: entity.y, r: entity.r + 10 });
    },

    updateEffects(list, dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        e.t += dt;
        if (e.entity) { e.x = e.entity.x; e.y = e.entity.y; e.r = e.entity.r + 10; }
        if (e.t >= e.dur) list.splice(i, 1);
      }
    },

    drawEffects(ctx, list) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const e of list) {
        const k = VFX.clamp(e.t / e.dur, 0, 1);
        const fade = 1 - k;

        if (e.kind === "impact") {
          const r = (18 + 90 * Math.pow(k, 0.45)) * e.scale;
          const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
          g.addColorStop(0, "rgba(255,255,235," + (0.95 * fade) + ")");
          g.addColorStop(0.45, "rgba(255,220,60," + (0.5 * fade) + ")");
          g.addColorStop(1, "rgba(255,160,20,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, TAU);
          ctx.fill();
        } else if (e.kind === "ring") {
          const r = e.size * Math.pow(k, 0.5);
          ctx.globalAlpha = fade * 0.85;
          ctx.strokeStyle = VFX.GLOW;
          ctx.lineWidth = 5 * fade + 1;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = fade * 0.4;
          ctx.strokeStyle = VFX.CORE;
          ctx.lineWidth = 2 * fade + 1;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.82, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (e.kind === "afterimage") {
          ctx.globalAlpha = fade * 0.5;
          ctx.strokeStyle = VFX.GLOW;
          ctx.lineWidth = 3;
          for (const p of e.parts) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * (1 + 0.15 * k), 0, TAU);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        } else if (e.kind === "aura") {
          ctx.globalAlpha = 0.4 * fade;
          ctx.strokeStyle = VFX.GLOW;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + Math.sin(e.t * 22) * 4, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    },

    // Texto flotante de daño
    texts: [],
    floatText(x, y, text, crit) {
      VFX.texts.push({ x: x, y: y, text: text, crit: crit, t: 0, dur: crit ? 1.4 : 1 });
    },
    updateTexts(dt) {
      for (let i = VFX.texts.length - 1; i >= 0; i--) {
        const t = VFX.texts[i];
        t.t += dt;
        t.y -= 34 * dt;
        if (t.t >= t.dur) VFX.texts.splice(i, 1);
      }
    },
    drawTexts(ctx) {
      ctx.save();
      ctx.textAlign = "center";
      for (const t of VFX.texts) {
        const fade = 1 - t.t / t.dur;
        const pop = t.crit ? 1 + 0.4 * Math.max(0, 1 - t.t * 6) : 1;
        ctx.globalAlpha = VFX.clamp(fade, 0, 1);
        ctx.font = (t.crit ? "800 " : "700 ") + Math.round((t.crit ? 26 : 20) * pop) + "px Segoe UI, sans-serif";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.crit ? "#ff5a5a" : VFX.CORE;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    },

    reset() {
      VFX.particles.length = 0;
      VFX.boltPool.length = 0;
      VFX.texts.length = 0;
    }
  };

  global.VFX = VFX;
})(window);
