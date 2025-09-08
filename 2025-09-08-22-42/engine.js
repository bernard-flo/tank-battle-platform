// 간이 시뮬레이터 엔진 (Node 환경)
// tank_battle_platform.html의 로직을 최대한 가깝게 반영

const vm = require('vm');

// 시드 기반 RNG (LCG)
function makeRNG(seed = 123456789) {
  let s = (seed >>> 0) || 1;
  return function rand() {
    // Numerical Recipes LCG
    s = (1664525 * s + 1013904223) >>> 0;
    return (s >>> 8) / 0x01000000; // [0,1)
  };
}

const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };
const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, size: 35, speed: 5, damage: 5 },
  [Type.TANKER]: { energy: 150, size: 45, speed: 3, damage: 4.5 },
  [Type.DEALER]: { energy: 80, size: 33, speed: 6, damage: 6.5 },
};

const ARENA = { W: 900, H: 600 };
const BULLET_SPEED = 8; // per tick
const TICK_MS = 50;
const FIRE_COOLDOWN_MS = 500;

class Tank {
  constructor(id, team, playerName, tankType, code) {
    this.id = id; // 'R1' ~ 'B6'
    this.team = team; // 'red' | 'blue'
    this.playerName = playerName;
    this.tankType = tankType;
    const cfg = TANK_CONFIGS[tankType];

    // 위치는 buildTeam 에서 설정
    this.x = 0;
    this.y = 0;
    this.angle = Math.random() * 360;
    this.gunAngle = this.angle;

    this.health = cfg.energy;
    this.energy = cfg.energy;
    this.size = cfg.size;
    this.speed = cfg.speed;
    this.damage = cfg.damage;

    this.alive = true;
    this.lastFireAt = -Infinity; // in ms timeline
    this.moveAttempts = 0;
    this.hasMoved = false;
    this.code = code || '';
  }

  resetMoveFlag() {
    this.hasMoved = false;
    this.moveAttempts = 0;
  }

  move(direction, tanks) {
    if (!this.alive || this.hasMoved) return false;
    this.moveAttempts = (this.moveAttempts || 0) + 1;
    if (this.moveAttempts > 10) return true; // 엔진과 동일하게 더 이상 이동 불가 처리

    const rad = (direction * Math.PI) / 180;
    const newX = this.x + Math.cos(rad) * this.speed;
    const newY = this.y + Math.sin(rad) * this.speed;

    const r = this.size / 2;
    if (newX - r < 0 || newX + r > ARENA.W || newY - r < 0 || newY + r > ARENA.H) {
      return false;
    }

    for (const t of tanks) {
      if (t.id === this.id || !t.alive) continue;
      const distance = Math.hypot(t.x - newX, t.y - newY);
      const combined = (this.size + t.size) / 2 + 5;
      if (distance < combined) return false;
    }

    this.hasMoved = true;
    this.angle = direction;
    this.x = newX;
    this.y = newY;
    return true;
  }

  fire(angle, nowMs, bullets) {
    if (!this.alive) return false;
    if (nowMs - this.lastFireAt < FIRE_COOLDOWN_MS) return false;
    if (angle === undefined || angle === null) return false;

    this.lastFireAt = nowMs;
    const rad = (angle * Math.PI) / 180;
    bullets.push({
      x: this.x,
      y: this.y,
      vx: Math.cos(rad) * BULLET_SPEED,
      vy: Math.sin(rad) * BULLET_SPEED,
      team: this.team,
      owner: this.id,
      damage: this.damage,
      ownerType: this.tankType,
    });
    return true;
  }

  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}

function spawnPositions(team, rng) {
  // 플랫폼은 랜덤 배치이나 팀별 영역 느낌을 살짝 반영
  // red: 좌측, blue: 우측에 치우치게 생성
  const arr = [];
  for (let i = 0; i < 6; i++) {
    const margin = 60;
    if (team === 'red') {
      arr.push({
        x: margin + rng() * (ARENA.W / 2 - 2 * margin),
        y: margin + rng() * (ARENA.H - 2 * margin),
      });
    } else {
      arr.push({
        x: ARENA.W / 2 + rng() * (ARENA.W / 2 - margin),
        y: margin + rng() * (ARENA.H - 2 * margin),
      });
    }
  }
  return arr;
}

function buildTeam(team, codes, rng) {
  // codes: [{name, type, code}], length 6
  const positions = spawnPositions(team, rng);
  const tanks = [];
  for (let i = 0; i < 6; i++) {
    const id = (team === 'red' ? 'R' : 'B') + (i + 1);
    const t = new Tank(id, team, codes[i].name, codes[i].type, codes[i].code);
    t.x = positions[i].x;
    t.y = positions[i].y;
    tanks.push(t);
  }
  return tanks;
}

function parseCodeBlocks(bigCode) {
  // result 파일의 코드: 여러 로봇이 function name()/type()/update() 블록으로 이어짐
  // HTML의 split 로직과 유사하게 분리
  const parts = bigCode.split(/(?=function\s+name\s*\(\s*\))/);
  const blocks = [];
  for (const part of parts) {
    const s = part.trim();
    if (!s) continue;
    if (!/function\s+name\s*\(\s*\)/.test(s)) continue;
    // 구분자 제거
    const clean = s.replace(/\/\/\s*=+.*?=+/g, '').trim();
    blocks.push(clean);
  }
  return blocks;
}

function compileBot(block) {
  // block에는 function name()/type()/update() 정의가 포함
  // 샌드박스로 이름/타입/업데이트 추출
  const wrapper = `(function(){\n${block}\nreturn { name: name(), type: type(), update: update };\n})()`;
  const script = new vm.Script(wrapper);
  const context = vm.createContext({ Type });
  const fn = script.runInContext(context, { timeout: 50 });
  const res = fn;
  const name = String(res.name || 'Player');
  const type = [Type.NORMAL, Type.TANKER, Type.DEALER].includes(res.type)
    ? res.type
    : Type.NORMAL;
  return { name, type, code: block, update: res.update };
}

function secureExecuteUpdate(tank, tanks, bullets, nowMs, rng) {
  // 엔진과 동일한 입력 생성
  const enemies = tanks
    .filter((t) => t.team !== tank.team && t.alive)
    .map((t) => ({
      x: t.x,
      y: t.y,
      distance: Math.hypot(t.x - tank.x, t.y - tank.y),
      angle: (Math.atan2(t.y - tank.y, t.x - tank.x) * 180) / Math.PI,
      health: t.health,
    }));
  const allies = tanks
    .filter((t) => t.team === tank.team && t.alive && t.id !== tank.id)
    .map((t) => ({ x: t.x, y: t.y, distance: Math.hypot(t.x - tank.x, t.y - tank.y), health: t.health }));
  const bulletInfo = bullets
    .filter((b) => b.team !== tank.team)
    .map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, distance: Math.hypot(b.x - tank.x, b.y - tank.y) }));

  const tankAPI = Object.freeze({
    move: Object.freeze((angle) => tank.move(angle, tanks)),
    fire: Object.freeze((angle) => tank.fire(angle, nowMs, bullets)),
    x: tank.x,
    y: tank.y,
    health: tank.health,
    energy: tank.energy,
    type: tank.tankType,
    size: tank.size,
  });

  // 사용자 코드 실행: HTML은 매 tick new Function 으로 감싼 뒤 실행 (무상태)
  const src = `"use strict";\n` +
    `const window=undefined, document=undefined, tanks=undefined, bullets=undefined, gameRunning=undefined, logMessage=undefined, Tank=undefined;` +
    `const Type={ NORMAL:0, TANKER:1, DEALER:2 };\n` +
    tank.code + `\nupdate(tank, enemies, allies, bulletInfo);`;

  try {
    const script = new vm.Script(src, { timeout: 20 });
    // Math.random을 시드 기반으로 대체하여 재현성 향상
    const myMath = {};
    for (const k of Object.getOwnPropertyNames(Math)) {
      myMath[k] = Math[k];
    }
    myMath.random = () => rng();

    const context = vm.createContext({ tank: tankAPI, enemies, allies, bulletInfo, Math: myMath });
    script.runInContext(context, { timeout: 20 });
  } catch (e) {
    // 사용자 코드 오류는 무시 (탱크 비활성화까지는 하지 않음)
  }
}

function updateBullets(tanks, bullets) {
  const kept = [];
  for (const b of bullets) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < 0 || b.x > ARENA.W || b.y < 0 || b.y > ARENA.H) continue;
    let hit = false;
    for (const t of tanks) {
      if (!t.alive) continue;
      const dist = Math.hypot(t.x - b.x, t.y - b.y);
      const hitRadius = t.size / 2 + 2;
      if (dist < hitRadius) {
        if (t.team !== b.team) t.takeDamage(b.damage);
        hit = true;
        break;
      }
    }
    if (!hit) kept.push(b);
  }
  return kept;
}

function simulateMatch(teamA, teamB, { durationMs = 13000, seed = 0 } = {}) {
  // teamA/teamB: array of 6 code blocks (string) or objects with .code
  // 컴파일 -> 팀 생성 -> 루프
  const compile = (blk) => compileBot(blk);
  const A = teamA.map(compile);
  const B = teamB.map(compile);

  const rng = makeRNG(seed >>> 0);

  const red = buildTeam('red', A, rng);
  const blue = buildTeam('blue', B, rng);
  const tanks = red.concat(blue);
  let bullets = [];

  const start = 0;
  let now = 0;
  const end = durationMs;
  while (now - start < end) {
    // 탱크 업데이트
    for (const t of tanks) t.resetMoveFlag();
    for (const t of tanks) {
      if (!t.alive) continue;
      secureExecuteUpdate(t, tanks, bullets, now, rng);
    }
    // 총알 업데이트
    bullets = updateBullets(tanks, bullets);

    // 조기 종결
    const aliveRed = red.filter((t) => t.alive).length;
    const aliveBlue = blue.filter((t) => t.alive).length;
    if (aliveRed === 0 || aliveBlue === 0) break;

    now += TICK_MS;
  }

  const sumHealth = (arr) => arr.reduce((s, t) => s + (t.alive ? Math.max(0, t.health) : 0), 0);
  const scoreRed = sumHealth(red);
  const scoreBlue = sumHealth(blue);
  const winner = scoreRed > scoreBlue ? 'red' : scoreBlue > scoreRed ? 'blue' : 'draw';
  return { winner, scoreRed, scoreBlue, red, blue };
}

module.exports = {
  Type,
  parseCodeBlocks,
  simulateMatch,
};

