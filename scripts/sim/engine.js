// Lightweight Node sim engine matching tank_battle_platform.html rules (subset)
// - No DOM, pure logic for self-play evaluations

const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };

// Mirror of TANK_CONFIGS in HTML
const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, speed: 6, size: 35, damage: 10 },
  [Type.TANKER]: { energy: 150, speed: 4, size: 45, damage: 9 },
  [Type.DEALER]: { energy: 80, speed: 8, size: 30, damage: 12 }
};

class Tank {
  constructor(id, x, y, team, name, tankType = Type.NORMAL) {
    const cfg = TANK_CONFIGS[tankType];
    this.id = id;
    this.x = x; this.y = y; this.team = team;
    this.playerName = name; this.tankType = tankType;
    this.angle = Math.random() * 360;
    this.gunAngle = this.angle;
    this.energy = cfg.energy; this.health = cfg.energy;
    this.speed = cfg.speed; this.size = cfg.size; this.damage = cfg.damage;
    this.alive = true; this.hasMoved = false; this.moveAttempts = 0;
    this.lastFireTick = -9999; // tick-based cooldown (10 ticks ~= 500ms)
    this.code = '';
  }
  resetMoveFlag() { this.hasMoved = false; this.moveAttempts = 0; }
}

function createAPI(tank, state) {
  // state: { tanks, bullets, tick }
  return Object.freeze({
    move: Object.freeze((angle) => {
      if (!tank.alive || tank.hasMoved) return false;
      tank.moveAttempts = (tank.moveAttempts || 0) + 1;
      if (tank.moveAttempts > 10) return true; // match HTML behavior
      const rad = (angle * Math.PI) / 180;
      const newX = tank.x + Math.cos(rad) * tank.speed;
      const newY = tank.y + Math.sin(rad) * tank.speed;
      const r = tank.size / 2;
      if (newX - r < 0 || newX + r > 900 || newY - r < 0 || newY + r > 600) return false;
      for (const other of state.tanks) {
        if (other.id === tank.id || !other.alive) continue;
        const d = Math.hypot(other.x - newX, other.y - newY);
        const cr = (tank.size + other.size) / 2 + 5;
        if (d < cr) return false;
      }
      tank.x = newX; tank.y = newY; tank.angle = angle; tank.hasMoved = true; return true;
    }),
    fire: Object.freeze((angle) => {
      if (!tank.alive) return false;
      if (angle === undefined || angle === null) return false;
      // 10-tick cooldown approximates 500ms at 50ms/tick
      if (state.tick - tank.lastFireTick < 10) return false;
      tank.lastFireTick = state.tick;
      const rad = (angle * Math.PI) / 180;
      state.bullets.push({
        x: tank.x, y: tank.y, vx: Math.cos(rad) * 8, vy: Math.sin(rad) * 8,
        team: tank.team, owner: tank.id, damage: tank.damage, ownerType: tank.tankType
      });
      return true;
    }),
    x: tank.x, y: tank.y, health: tank.health, energy: tank.energy,
    type: tank.tankType, size: tank.size
  });
}

function secureRun(code, tank, enemies, allies, bulletInfo, state) {
  const tankAPI = createAPI(tank, state);
  const frozenEnemies = Object.freeze(enemies.map(e => Object.freeze(e)));
  const frozenAllies = Object.freeze(allies.map(a => Object.freeze(a)));
  const frozenBullets = Object.freeze(bulletInfo.map(b => Object.freeze(b)));
  const sandbox = new Function(
    'tank', 'enemies', 'allies', 'bulletInfo',
    '"use strict";\n' +
    'const tanks = undefined; const bullets = undefined; const logMessage = undefined;\n' +
    'const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };\n' +
    'const console = Object.freeze({ log(){}, warn(){}, error(){} });\n' +
    code + '\nupdate(tank, enemies, allies, bulletInfo);'
  );
  sandbox(tankAPI, frozenEnemies, frozenAllies, frozenBullets);
}

function step(state, codes) {
  // Execute AI
  for (const tank of state.tanks) {
    if (!tank.alive) continue;
    tank.resetMoveFlag();
    try {
      const enemies = state.tanks.filter(t => t.team !== tank.team && t.alive).map(t => ({
        x: t.x, y: t.y,
        distance: Math.hypot(t.x - tank.x, t.y - tank.y),
        angle: Math.atan2(t.y - tank.y, t.x - tank.x) * 180 / Math.PI,
        health: t.health
      }));
      const allies = state.tanks.filter(t => t.team === tank.team && t.alive && t.id !== tank.id).map(t => ({
        x: t.x, y: t.y, distance: Math.hypot(t.x - tank.x, t.y - tank.y), health: t.health
      }));
      const bulletInfo = state.bullets.filter(b => b.team !== tank.team).map(b => ({
        x: b.x, y: b.y, vx: b.vx, vy: b.vy, distance: Math.hypot(b.x - tank.x, b.y - tank.y)
      }));
      secureRun(codes[tank.id], tank, enemies, allies, bulletInfo, state);
    } catch (e) {
      // disable on error, and log for diagnosis
      console.error(`[engine] AI error for ${tank.id}: ${e && e.message ? e.message : e}`);
      tank.alive = false;
    }
  }

  // Move bullets and handle collisions
  const nextBullets = [];
  for (const b of state.bullets) {
    const nx = b.x + b.vx; const ny = b.y + b.vy;
    if (nx < 0 || nx > 900 || ny < 0 || ny > 600) continue;
    let hit = false;
    for (const t of state.tanks) {
      if (!t.alive) continue;
      const d = Math.hypot(t.x - nx, t.y - ny);
      const hitR = t.size / 2 + 2;
      if (d < hitR) {
        if (t.team !== b.team) {
          t.health -= b.damage;
          if (t.health <= 0) t.alive = false;
          hit = true; break;
        }
      }
    }
    if (!hit) nextBullets.push({ ...b, x: nx, y: ny });
  }
  state.bullets = nextBullets;
  state.tick += 1;
}

function seedRandom(seed) {
  // simple LCG
  let s = (seed >>> 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000;
}

function initMatch(teamA, teamB, rng) {
  const tanks = []; const codes = {};
  // Red team (left)
  for (let i = 0; i < 6; i++) {
    const row = Math.floor(i / 2); let col = i % 2; col = 1 - col;
    const id = `R${i+1}`; const name = `R${i+1}`;
    const meta = teamA[i];
    const t = new Tank(id, 140 + col * 100, 90 + row * 120, 'red', name, meta.type);
    tanks.push(t); codes[id] = meta.code;
  }
  // Blue team (right)
  for (let i = 0; i < 6; i++) {
    const id = `B${i+1}`; const name = `B${i+1}`;
    const meta = teamB[i];
    const t = new Tank(id, 640 + (i % 2) * 100, 90 + Math.floor(i / 2) * 120, 'blue', name, meta.type);
    tanks.push(t); codes[id] = meta.code;
  }
  return { tanks, bullets: [], tick: 0, rng };
}

function resultFromState(state, maxTicks) {
  const redAlive = state.tanks.filter(t => t.team === 'red' && t.alive).length;
  const blueAlive = state.tanks.filter(t => t.team === 'blue' && t.alive).length;
  if (redAlive > 0 && blueAlive === 0) return 'red';
  if (blueAlive > 0 && redAlive === 0) return 'blue';
  if (state.tick >= maxTicks) {
    // energy tiebreaker
    const redEnergy = state.tanks.filter(t => t.team === 'red' && t.alive).reduce((s,t)=>s+t.health,0);
    const blueEnergy = state.tanks.filter(t => t.team === 'blue' && t.alive).reduce((s,t)=>s+t.health,0);
    if (redEnergy > blueEnergy) return 'red';
    if (blueEnergy > redEnergy) return 'blue';
    return 'draw';
  }
  return null;
}

function splitRobotCodes(bundle) {
  const parts = bundle.split(/(?=function\s+name\s*\(\s*\))/);
  const robots = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!/function\s+name\s*\(/.test(trimmed)) continue;
    const clean = trimmed.replace(/\/\/\s*=+.*?=+/g, '').trim();
    // extract type synchronously with Type injected
    let type = Type.NORMAL;
    try {
      const f = new Function('Type', clean + '\nreturn { n: name(), t: type() };');
      const r = f(Type); type = r.t;
    } catch(_) {}
    robots.push({ code: clean, type });
  }
  return robots;
}

function getBaselineCode() {
  return `function name(){return 'Baseline';}\nfunction type(){return Type.NORMAL;}\nfunction update(tank,enemies,allies,bulletInfo){\n if(enemies.length){let n=enemies[0];for(const e of enemies){if(e.distance<n.distance)n=e;}\n const a=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(a); if(!tank.move(a+180)){tank.move(a+90)||tank.move(a-90)||tank.move(Math.random()*360);} }}`;
}

function simulateMatch(bundleA, bundleB, opts = {}) {
  const { seed = 1, maxTicks = 1200 } = opts;
  const rng = seedRandom(seed);
  let teamA = splitRobotCodes(bundleA).slice(0,6);
  let teamB = splitRobotCodes(bundleB).slice(0,6);
  const base = getBaselineCode();
  while (teamA.length < 6) teamA.push({ code: base, type: Type.NORMAL });
  while (teamB.length < 6) teamB.push({ code: base, type: Type.NORMAL });
  const state = initMatch(teamA, teamB, rng);
  while (true) {
    step(state, Object.fromEntries(state.tanks.map(t => [t.id, (t.team==='red'?teamA:teamB)[parseInt(t.id.slice(1))-1].code])));
    const winner = resultFromState(state, maxTicks);
    if (winner) return { winner, tick: state.tick };
  }
}

module.exports = { Type, TANK_CONFIGS, splitRobotCodes, simulateMatch };
