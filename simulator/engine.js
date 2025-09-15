// Headless simulator for Tech of Tank battle rules
// Mirrors tank_battle_platform.html mechanics without DOM rendering.

const Type = {
  NORMAL: 0,
  TANKER: 1,
  DEALER: 2,
};

const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, size: 35, speed: 5, damage: 5 },
  [Type.TANKER]: { energy: 150, size: 45, speed: 3, damage: 4.5 },
  [Type.DEALER]: { energy: 80, size: 33, speed: 6, damage: 6.5 },
};

class Tank {
  constructor(engine, id, x, y, team, playerName, tankType = Type.NORMAL) {
    this.engine = engine;
    this.id = id;
    this.x = x;
    this.y = y;
    this.team = team; // 'red' | 'blue'
    this.playerName = playerName;
    this.tankType = tankType;

    const config = TANK_CONFIGS[tankType];
    // 초기 포신 각도는 시드 기반 RNG 사용(브라우저는 Math.random)
    this.angle = this.engine.random() * 360;
    this.health = config.energy;
    this.energy = config.energy;
    this.gunAngle = this.angle;
    this.speed = config.speed;
    this.size = config.size;
    this.damage = config.damage;

    this.alive = true;
    // HTML은 Date.now() 기준으로 lastFire=0이라도 즉시 발사가 가능하다.
    // 엔진 시간(nowMs) 기준과 동기화하려면 초기에는 즉시 발사가 가능해야 하므로 -Infinity로 설정한다.
    this.lastFire = -Infinity; // ms, 시작 즉시 발사 가능
    this.code = '';
    this.hasMoved = false;
    this.moveAttempts = 0;
  }

  move(direction) {
    if (!this.alive || this.hasMoved) return false;

    this.moveAttempts = (this.moveAttempts || 0) + 1;
    if (this.moveAttempts > 10) {
      return true; // block further moves; considered as done
    }

    const rad = (direction * Math.PI) / 180;
    const newX = this.x + Math.cos(rad) * this.speed;
    const newY = this.y + Math.sin(rad) * this.speed;

    const tankRadius = this.size / 2;
    const W = this.engine.width;
    const H = this.engine.height;
    if (newX - tankRadius < 0 || newX + tankRadius > W || newY - tankRadius < 0 || newY + tankRadius > H) {
      return false;
    }

    for (const tank of this.engine.tanks) {
      if (tank.id === this.id || !tank.alive) continue;
      const dx = tank.x - newX;
      const dy = tank.y - newY;
      const distance = Math.hypot(dx, dy);
      const combinedRadius = (this.size + tank.size) / 2 + 5;
      if (distance < combinedRadius) {
        return false;
      }
    }

    this.hasMoved = true;
    this.angle = direction;
    this.x = newX;
    this.y = newY;
    return true;
  }

  fire(angle, nowMs) {
    if (!this.alive || (this.lastFire >= 0 && nowMs - this.lastFire < 500)) return false;
    if (angle === undefined || angle === null) return false;

    this.lastFire = nowMs;
    const rad = (angle * Math.PI) / 180;
    const bullet = {
      x: this.x,
      y: this.y,
      vx: Math.cos(rad) * 8,
      vy: Math.sin(rad) * 8,
      team: this.team,
      owner: this.id,
      damage: this.damage,
      ownerType: this.tankType,
    };
    this.engine.bullets.push(bullet);
    return true;
  }

  takeDamage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  resetMoveFlag() {
    this.hasMoved = false;
    this.moveAttempts = 0;
  }
}

class Engine {
  constructor(opts = {}) {
    this.width = 900;
    this.height = 600;
    this.tickMs = opts.tickMs ?? 50;
    this.timeMs = 0;
    this.tanks = [];
    this.bullets = [];
    this.logs = [];
    this.random = createRng(opts.seed);
    this.fast = !!opts.fast; // fast 모드: Object.freeze 생략 등으로 성능 최적화

    // Recording (replay) options
    this.record = !!opts.record;
    this.recordEvery = Math.max(1, opts.recordEvery ? parseInt(opts.recordEvery, 10) || 1 : 1);
    this.frames = [];
    this.meta = {
      width: this.width,
      height: this.height,
      tickMs: this.tickMs,
      seed: opts.seed ?? null,
      players: [],
    };
  }

  addTank(tank) {
    this.tanks.push(tank);
  }

  getTeamStats() {
    const redTanks = this.tanks.filter((t) => t.team === 'red');
    const blueTanks = this.tanks.filter((t) => t.team === 'blue');
    const redAlive = redTanks.filter((t) => t.alive).length;
    const blueAlive = blueTanks.filter((t) => t.alive).length;
    const redEnergy = redTanks.filter((t) => t.alive).reduce((s, t) => s + Math.max(0, t.health), 0);
    const blueEnergy = blueTanks.filter((t) => t.alive).reduce((s, t) => s + Math.max(0, t.health), 0);
    return { redAlive, blueAlive, redEnergy, blueEnergy };
  }

  executeTankAI(tank) {
    if (!tank.alive) return;

    tank.resetMoveFlag();

    // Secure data snapshots
    const freezer = this.fast ? (x) => x : Object.freeze;
    const enemies = this.tanks
      .filter((t) => t.team !== tank.team && t.alive)
      .map((t) =>
        freezer({
          x: t.x,
          y: t.y,
          distance: Math.hypot(t.x - tank.x, t.y - tank.y),
          angle: (Math.atan2(t.y - tank.y, t.x - tank.x) * 180) / Math.PI,
          health: t.health,
        })
      );
    const allies = this.tanks
      .filter((t) => t.team === tank.team && t.alive && t.id !== tank.id)
      .map((t) =>
        freezer({ x: t.x, y: t.y, distance: Math.hypot(t.x - tank.x, t.y - tank.y), health: t.health })
      );
    const bulletInfo = this.bullets
      .filter((b) => b.team !== tank.team)
      .map((b) =>
        freezer({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, distance: Math.hypot(b.x - tank.x, b.y - tank.y) })
      );

    const tankAPI = freezer({
      move: freezer((angle) => tank.move(angle)),
      fire: freezer((angle) => tank.fire(angle, this.timeMs)),
      x: tank.x,
      y: tank.y,
      health: tank.health,
      energy: tank.energy,
      type: tank.tankType,
      size: tank.size,
    });

    try {
      // The runner is a precompiled function like the browser's secure Function
      if (typeof tank._runner === 'function') {
        tank._runner(tankAPI, freezer(enemies), freezer(allies), freezer(bulletInfo));
      }
    } catch (err) {
      // Ignore user errors to keep simulation running
      this.logs.push({ t: this.timeMs, type: 'error', msg: `AI error in ${tank.id}: ${String(err)}` });
    }
  }

  updateBullets() {
    const W = this.width;
    const H = this.height;
    const tanks = this.tanks;
    const newBullets = [];
    bulletLoop: for (const bullet of this.bullets) {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      if (bullet.x < 0 || bullet.x > W || bullet.y < 0 || bullet.y > H) {
        continue; // drop bullet
      }

      for (const tank of tanks) {
        if (!tank.alive) continue;
        const distance = Math.hypot(tank.x - bullet.x, tank.y - bullet.y);
        const hitRadius = tank.size / 2 + 2;
        if (distance < hitRadius) {
          if (tank.team !== bullet.team) {
            tank.takeDamage(bullet.damage);
          } else {
            // friendly pass-through; keep bullet and stop further tank checks for this bullet
            newBullets.push(bullet);
            continue bulletLoop;
          }
          // enemy hit -> bullet removed
          continue bulletLoop;
        }
      }

      newBullets.push(bullet);
    }
    this.bullets = newBullets;
  }

  step() {
    // Execute AI in tank array order
    for (const tank of this.tanks) {
      if (tank.alive) this.executeTankAI(tank);
    }
    this.updateBullets();
    this.timeMs += this.tickMs;
    if (this.record) this.maybeRecordFrame();
  }

  maybeRecordFrame() {
    const tick = Math.floor(this.timeMs / this.tickMs);
    if (tick % this.recordEvery !== 0) return;
    this.frames.push(this.snapshot());
  }

  snapshot() {
    return {
      t: this.timeMs,
      tanks: this.tanks.map((t) => ({
        id: t.id,
        team: t.team,
        x: t.x,
        y: t.y,
        angle: t.angle,
        health: Math.max(0, t.health),
        energy: t.energy,
        alive: t.alive,
        type: t.tankType,
        size: t.size,
      })),
      bullets: this.bullets.map((b) => ({ x: b.x, y: b.y, team: b.team })),
    };
  }

  getReplay() {
    return {
      meta: this.meta,
      frames: this.frames,
    };
  }
}

function createEngineWithTeams(playerData, opts = {}) {
  const engine = new Engine(opts);
  // meta players
  engine.meta.players = playerData.map((p) => ({ id: p.id, name: p.name, team: p.team, type: p.type }));
  // Red team layout
  for (let i = 0; i < 6; i++) {
    const p = playerData[i];
    const row = Math.floor(i / 2);
    let col = i % 2;
    col = 1 - col; // invert
    const x = 140 + col * 100;
    const y = 90 + row * 120;
    const tank = new Tank(engine, p.id, x, y, 'red', p.name, p.type);
    tank.code = p.code;
    tank._runner = p.runner;
    engine.addTank(tank);
  }
  // Blue team layout
  for (let i = 0; i < 6; i++) {
    const p = playerData[i + 6];
    const x = 660 + (i % 2) * 100;
    const y = 90 + Math.floor(i / 2) * 120;
    const tank = new Tank(engine, p.id, x, y, 'blue', p.name, p.type);
    tank.code = p.code;
    tank._runner = p.runner;
    engine.addTank(tank);
  }
  // initial frame at t=0 if recording
  if (engine.record) engine.frames.push(engine.snapshot());
  return engine;
}

function runMatch(playerData, opts = {}) {
  // const maxTicks = opts.maxTicks ?? 5000; // 5000 ticks ~ 250s
  const maxTicks = 20 * 180; // 3min
  const engine = createEngineWithTeams(playerData, opts);
  for (let tick = 0; tick < maxTicks; tick++) {
    engine.step();
    const { redAlive, blueAlive } = engine.getTeamStats();
    if ((redAlive === 0 && blueAlive > 0) || (blueAlive === 0 && redAlive > 0)) {
      break;
    }
  }
  const stats = engine.getTeamStats();
  let winner = 'draw';
  if (stats.redAlive === 0 && stats.blueAlive > 0) winner = 'blue';
  else if (stats.blueAlive === 0 && stats.redAlive > 0) winner = 'red';
  else if (stats.blueEnergy > stats.redEnergy) winner = 'blue';
  else if (stats.redEnergy > stats.blueEnergy) winner = 'red';
  const result = { winner, ticks: Math.floor(engine.timeMs / engine.tickMs), stats, engine };
  if (engine.record) {
    result.replay = engine.getReplay();
  }
  return result;
}

function createRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  return function rng() {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 0x100000000) / 0x100000000;
  };
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

module.exports = {
  Type,
  TANK_CONFIGS,
  Tank,
  Engine,
  runMatch,
  createEngineWithTeams,
};
