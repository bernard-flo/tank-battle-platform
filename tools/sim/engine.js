// 간단한 2D 전투 엔진(60Hz 고정), Function 샌드박스 기반
import seedrandom from 'seedrandom';
import fs from 'fs';
import path from 'path';

export const CONST = {
  WIDTH: 800,
  HEIGHT: 600,
  TANK_R: 16,
  BULLET_R: 6,
  BULLET_SPEED: 400,
  FIRE_COOLDOWN: 0.5,
  SPEED: { NORMAL: 120, TANKER: 105, DEALER: 130 },
  DT: 1 / 60
};

export function createRng(seed) {
  const rng = seedrandom(String(seed));
  return { next: () => rng(), int: (n) => Math.floor(rng() * n) };
}

function spawnPositions(rng, n, side) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const x = side === 'A' ? 100 + rng.next() * 120 : CONST.WIDTH - (100 + rng.next() * 120);
    const y = 80 + rng.next() * (CONST.HEIGHT - 160);
    arr.push({ x, y });
  }
  return arr;
}

export function runMatch({ botsA, botsB, seed = 42, rounds = 1, maxTime = 60 }) {
  const rng = createRng(seed);
  const results = [];

  for (let round = 0; round < rounds; round++) {
    const state = initState(botsA, botsB, rng);
    const end = simulate(state, rng, maxTime);
    results.push(end);
  }
  return results;
}

function initState(botsA, botsB, rng) {
  const tanks = [];
  const bullets = [];
  const posA = spawnPositions(rng, botsA.length, 'A');
  const posB = spawnPositions(rng, botsB.length, 'B');

  const mkTank = (id, side, bot, pos) => ({
    id, side, name: bot.name, type: bot.type, code: bot.code,
    x: pos.x, y: pos.y, angle: 0, alive: true, lastFire: -Infinity,
    size: CONST.TANK_R * 2, damage: dmgByType(bot.type),
    speed: speedByType(bot.type), health: hpByType(bot.type), energy: hpByType(bot.type),
    key: bot.key, params: loadParams(bot.key)
  });

  botsA.forEach((b, i) => tanks.push(mkTank(`A${i+1}`, 'A', b, posA[i])));
  botsB.forEach((b, i) => tanks.push(mkTank(`B${i+1}`, 'B', b, posB[i])));

  return { t: 0, tanks, bullets };
}

function speedByType(t) { return t === 1 ? CONST.SPEED.TANKER : (t === 2 ? CONST.SPEED.DEALER : CONST.SPEED.NORMAL); }
function hpByType(t) { return t === 1 ? 150 : (t === 2 ? 80 : 100); }
function dmgByType(t) { return t === 1 ? 4.5 : (t === 2 ? 6.5 : 5); }

function simulate(state, rng, maxTime) {
  const { DT } = CONST;
  const steps = Math.floor(maxTime / DT);
  for (let i = 0; i < steps; i++) {
    state.t = i * DT;
    stepAI(state);
    stepPhysics(state, DT);
    if (isEnded(state)) break;
  }
  const scoreA = state.tanks.filter(t => t.side === 'A' && t.alive).length;
  const scoreB = state.tanks.filter(t => t.side === 'B' && t.alive).length;
  return { time: state.t, aliveA: scoreA, aliveB: scoreB };
}

function stepAI(state) {
  const { tanks, bullets } = state;
  // moveAttempts 리셋
  tanks.forEach(t => { t.hasMoved = false; t.moveAttempts = 0; });

  for (const t of tanks) {
    if (!t.alive) continue;
    const enemies = tanks.filter(o => o.side !== t.side && o.alive).map(o => ({
      x: o.x, y: o.y,
      distance: Math.hypot(o.x - t.x, o.y - t.y),
      angle: Math.atan2(o.y - t.y, o.x - t.x) * 180 / Math.PI,
      health: o.health
    }));
    const allies = tanks.filter(o => o.side === t.side && o.alive && o.id !== t.id).map(o => ({
      x: o.x, y: o.y, distance: Math.hypot(o.x - t.x, o.y - t.y), health: o.health
    }));
    const bulletInfo = state.bullets.filter(b => b.side !== t.side).map(b => ({
      x: b.x, y: b.y, vx: b.vx, vy: b.vy, distance: Math.hypot(b.x - t.x, b.y - t.y)
    }));

    const tankAPI = Object.freeze({
      move: Object.freeze((angle) => moveTank(state, t, angle)),
      fire: Object.freeze((angle) => fireBullet(state, t, angle)),
      x: t.x, y: t.y, health: t.health, energy: t.energy, type: t.type, size: t.size
    });

    try {
      const secureFunc = new Function('tank', 'enemies', 'allies', 'bulletInfo', 'PARAMS',
        `"use strict"; const Type={NORMAL:0,TANKER:1,DEALER:2}; const console=Object.freeze({log:()=>{},warn:()=>{},error:()=>{}}); const PARAMS=Object.freeze(arguments[4]||{}); ${t.code}\nupdate(tank,enemies,allies,bulletInfo);`
      );
      secureFunc(tankAPI, Object.freeze(enemies), Object.freeze(allies), Object.freeze(bulletInfo), Object.freeze(t.params||{}));
    } catch (e) {
      // 무시: 해당 프레임 AI 동작 스킵
    }
  }
}

function moveTank(state, t, direction) {
  if (!t.alive || t.hasMoved) return false;
  t.moveAttempts = (t.moveAttempts || 0) + 1;
  if (t.moveAttempts > 10) { t.hasMoved = true; return true; }

  const rad = (direction * Math.PI) / 180;
  const nx = t.x + Math.cos(rad) * t.speed * CONST.DT;
  const ny = t.y + Math.sin(rad) * t.speed * CONST.DT;

  const r = t.size / 2;
  if (nx - r < 0 || nx + r > CONST.WIDTH || ny - r < 0 || ny + r > CONST.HEIGHT) return false;
  for (const o of state.tanks) {
    if (o === t || !o.alive) continue;
    const d = Math.hypot(o.x - nx, o.y - ny);
    const combined = (o.size + t.size) / 2 + 4;
    if (d < combined) return false;
  }
  t.x = nx; t.y = ny; t.angle = direction; t.hasMoved = true; return true;
}

function fireBullet(state, t, angle) {
  if (!t.alive || angle == null) return false;
  const now = state.t;
  if (now - t.lastFire < CONST.FIRE_COOLDOWN) return false;
  t.lastFire = now;
  const rad = angle * Math.PI / 180;
  state.bullets.push({
    x: t.x, y: t.y,
    vx: Math.cos(rad) * CONST.BULLET_SPEED * CONST.DT,
    vy: Math.sin(rad) * CONST.BULLET_SPEED * CONST.DT,
    side: t.side, damage: t.damage
  });
  return true;
}

function stepPhysics(state, dt) {
  // 총알 업데이트 및 충돌
  const { bullets, tanks } = state;
  for (const b of bullets) { b.x += b.vx; b.y += b.vy; }

  // 경계 제거
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (b.x < 0 || b.x > CONST.WIDTH || b.y < 0 || b.y > CONST.HEIGHT) bullets.splice(i, 1);
  }

  // 피격 처리
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let hit = false;
    for (const t of tanks) {
      if (!t.alive || t.side === b.side) continue;
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d <= t.size / 2 + CONST.BULLET_R) {
        t.health -= b.damage; if (t.health <= 0) t.alive = false;
        hit = true; break;
      }
    }
    if (hit) bullets.splice(i, 1);
  }
}

function isEnded(state) {
  const aAlive = state.tanks.some(t => t.side === 'A' && t.alive);
  const bAlive = state.tanks.some(t => t.side === 'B' && t.alive);
  return !(aAlive && bAlive);
}

function loadParams(key) {
  try {
    const p = path.join(process.cwd(), 'params', `${key}.json`);
    if (!fs.existsSync(p)) return {};
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    // 구버전(search 결과 배열) 방지: 객체만 허용
    if (Array.isArray(raw)) return {};
    return raw || {};
  } catch {
    return {};
  }
}
