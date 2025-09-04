/* SUPER6 Simulator skeleton (draft)
 * - Fixed-timestep loop
 * - Minimal Tank/Bullet model
 * - Placeholder rules; to be aligned with platform
 */

'use strict';

const TAU = Math.PI * 2;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

class Tank {
  constructor(id, x, y, type = 'NORMAL') {
    this.id = id; this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hp = (type === 'TANKER') ? 200 : 100;
    this.type = type; this.cool = 0; this.alive = true;
  }
}

class Bullet {
  constructor(x, y, ang, speed = 6, owner = -1) {
    this.x = x; this.y = y; this.vx = Math.cos(ang) * speed; this.vy = Math.sin(ang) * speed;
    this.owner = owner; this.alive = true;
  }
}

class Sim {
  constructor({ W = 1000, H = 1000, dt = 0.1 } = {}) {
    this.W = W; this.H = H; this.dt = dt; this.time = 0;
    this.tanks = []; this.bullets = [];
  }
  addTank(t) { this.tanks.push(t); }
  step() {
    const dt = this.dt; this.time += dt;
    // Move bullets
    for (const b of this.bullets) {
      if (!b.alive) continue; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0 || b.x > this.W || b.y < 0 || b.y > this.H) b.alive = false;
    }
    // Simple collision: bullet vs tank
    for (const b of this.bullets) {
      if (!b.alive) continue;
      for (const t of this.tanks) {
        if (!t.alive) continue; if (b.owner === t.id) continue;
        const dx = t.x - b.x, dy = t.y - b.y; if (dx*dx + dy*dy < 12*12) {
          t.hp -= 20; b.alive = false; if (t.hp <= 0) t.alive = false;
        }
      }
    }
    // Remove dead bullets
    this.bullets = this.bullets.filter(b => b.alive);
  }
}

function main() {
  const sim = new Sim();
  sim.addTank(new Tank(0, 200, 500, 'TANKER'));
  sim.addTank(new Tank(1, 800, 500, 'DEALER'));
  for (let i = 0; i < 100; i++) sim.step();
  console.log('draft done:', {
    time: sim.time.toFixed(1),
    tanks: sim.tanks.map(t => ({ id: t.id, hp: t.hp, alive: t.alive }))
  });
}

if (require.main === module) main();

