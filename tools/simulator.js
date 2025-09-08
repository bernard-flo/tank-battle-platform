// 간이 전투 시뮬레이터: tank_battle_platform.html의 로직을 최대한 근사화
// - 맵: 900x600, 총알 속도: 8, 쿨다운: 500ms
// - 타입별 설정 동일 적용
// - 매 tick은 dt=50ms 기준의 고정 시간 스텝으로 진행

const fs = require('fs');
const path = require('path');

const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };
const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, size: 35, speed: 5, damage: 5 },
  [Type.TANKER]: { energy: 150, size: 45, speed: 3, damage: 4.5 },
  [Type.DEALER]: { energy: 80, size: 33, speed: 6, damage: 6.5 },
};

const ARENA_W = 900;
const ARENA_H = 600;
const BULLET_SPEED = 8;
const FIRE_COOLDOWN = 500; // ms
const DT = 50; // ms

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

class Tank {
  constructor(id, x, y, team, playerName, tankType) {
    this.id = id;
    this.x = x; this.y = y;
    this.team = team; // 'red' | 'blue'
    this.playerName = playerName;
    this.tankType = tankType;
    const c = TANK_CONFIGS[tankType];
    this.health = c.energy;
    this.energy = c.energy;
    this.speed = c.speed;
    this.size = c.size;
    this.damage = c.damage;
    this.alive = true;
    this.angle = 0;
    this.lastFire = -9999;
    this.hasMoved = false;
    this.moveAttempts = 0;
    this.code = '';
  }
  move(direction) {
    if (!this.alive || this.hasMoved) return false;
    this.moveAttempts = (this.moveAttempts || 0) + 1;
    if (this.moveAttempts > 10) return true;
    const rad = (direction * Math.PI) / 180;
    const newX = this.x + Math.cos(rad) * this.speed;
    const newY = this.y + Math.sin(rad) * this.speed;
    const r = this.size / 2;
    if (newX - r < 0 || newX + r > ARENA_W || newY - r < 0 || newY + r > ARENA_H) return false;
    for (const t of globalState.tanks) {
      if (t.id === this.id || !t.alive) continue;
      const dist = Math.hypot(t.x - newX, t.y - newY);
      const comb = (this.size + t.size) / 2 + 5;
      if (dist < comb) return false;
    }
    this.hasMoved = true;
    this.angle = direction;
    this.x = newX; this.y = newY;
    return true;
  }
  fire(angle) {
    if (!this.alive) return false;
    if (angle === undefined || angle === null) return false;
    if (globalState.timeMs - this.lastFire < FIRE_COOLDOWN) return false;
    this.lastFire = globalState.timeMs;
    const rad = (angle * Math.PI) / 180;
    globalState.bullets.push({
      x: this.x, y: this.y,
      vx: Math.cos(rad) * BULLET_SPEED,
      vy: Math.sin(rad) * BULLET_SPEED,
      team: this.team,
      owner: this.id, damage: this.damage,
    });
    return true;
  }
  resetMoveFlag() { this.hasMoved = false; this.moveAttempts = 0; }
}

let globalState = null;

function spawnTeam(team, codes, seed) {
  // 좌/우 절반에 3x2 격자로 안전 배치
  const positions = [];
  const cols = 3, rows = 2;
  const xStart = team === 'red' ? 100 : ARENA_W - 100;
  const xStep = team === 'red' ? 100 : -100;
  const yStart = 150, yStep = 200;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push([xStart + c * xStep, yStart + r * yStep]);
    }
  }
  const tanks = [];
  for (let i = 0; i < 6; i++) {
    const code = codes[i] || codes[codes.length - 1];
    // 타입 추출: 함수 type() 실행 후 숫자/Type 상수 반환 가정 -> 없으면 NORMAL
    const typeVal = extractType(code);
    const t = new Tank(`${team}-${i+1}`, positions[i][0], positions[i][1], team, `${team.toUpperCase()}${i+1}`, typeVal);
    t.code = code;
    tanks.push(t);
  }
  return tanks;
}

function extractType(code) {
  try {
    const fn = new Function(`const Type={NORMAL:0,TANKER:1,DEALER:2}; ${code}; return typeof type==='function'?type():0;`);
    const v = fn();
    if (v === 0 || v === 1 || v === 2) return v;
  } catch(e) {}
  return 0;
}

function buildSafeInputs(tank, tanks, bullets) {
  const enemies = tanks.filter(t => t.team !== tank.team && t.alive).map(t => ({
    x: t.x, y: t.y,
    distance: Math.hypot(t.x - tank.x, t.y - tank.y),
    angle: Math.atan2(t.y - tank.y, t.x - tank.x) * 180 / Math.PI,
    health: t.health,
  }));
  const allies = tanks.filter(t => t.team === tank.team && t.alive && t.id !== tank.id).map(t => ({
    x: t.x, y: t.y,
    distance: Math.hypot(t.x - tank.x, t.y - tank.y),
    health: t.health,
  }));
  const bulletInfo = bullets.filter(b => b.team !== tank.team).map(b => ({
    x: b.x, y: b.y, vx: b.vx, vy: b.vy,
    distance: Math.hypot(b.x - tank.x, b.y - tank.y),
  }));
  return { enemies, allies, bulletInfo };
}

function runAI(tank) {
  const { enemies, allies, bulletInfo } = buildSafeInputs(tank, globalState.tanks, globalState.bullets);
  const tankAPI = Object.freeze({
    move: Object.freeze((a) => tank.move(a)),
    fire: Object.freeze((a) => tank.fire(a)),
    x: tank.x, y: tank.y,
    health: tank.health, energy: tank.energy,
    type: tank.tankType, size: tank.size,
  });
  try {
    const secureFunc = new Function('tank', 'enemies', 'allies', 'bulletInfo', `"use strict";
      const window=undefined, document=undefined, tanks=undefined, bullets=undefined, logMessage=undefined, Tank=undefined;
      const gameRunning=undefined; const Type={NORMAL:0,TANKER:1,DEALER:2};
      const console=Object.freeze({log:()=>{},warn:()=>{},error:()=>{}});
      ${tank.code}
      update(tank,enemies,allies,bulletInfo);`);
    secureFunc(tankAPI, enemies, allies, bulletInfo);
  } catch (e) {
    // 에러 무시 (실제 엔진도 로그만 남김)
  }
}

function updateBullets() {
  const bullets = [];
  for (const b of globalState.bullets) {
    const nx = b.x + b.vx;
    const ny = b.y + b.vy;
    if (nx < 0 || nx > ARENA_W || ny < 0 || ny > ARENA_H) continue;
    // 충돌 체크
    let hit = false;
    for (const t of globalState.tanks) {
      if (!t.alive) continue;
      const dist = Math.hypot(t.x - nx, t.y - ny);
      const hitR = t.size / 2 + 2;
      if (dist < hitR) {
        if (t.team !== b.team) {
          t.health -= b.damage;
          if (t.health <= 0) t.alive = false;
        }
        hit = true; break;
      }
    }
    if (!hit) bullets.push({ ...b, x: nx, y: ny });
  }
  globalState.bullets = bullets;
}

function initialize(codesA, codesB, seed=0) {
  globalState = { timeMs: 0, bullets: [], tanks: [] };
  const red = spawnTeam('red', codesA, seed);
  const blue = spawnTeam('blue', codesB, seed);
  globalState.tanks.push(...red, ...blue);
}

function step() {
  // 각 탱크 이동 플래그 리셋
  for (const t of globalState.tanks) t.resetMoveFlag();
  // AI 실행
  for (const t of globalState.tanks) if (t.alive) runAI(t);
  // 총알 업데이트
  updateBullets();
  globalState.timeMs += DT;
}

function isOver() {
  const redAlive = globalState.tanks.some(t => t.alive && t.team==='red');
  const blueAlive = globalState.tanks.some(t => t.alive && t.team==='blue');
  return !(redAlive && blueAlive);
}

function score() {
  const redSum = globalState.tanks.filter(t=>t.team==='red'&&t.alive).reduce((s,t)=>s+t.health,0);
  const blueSum = globalState.tanks.filter(t=>t.team==='blue'&&t.alive).reduce((s,t)=>s+t.health,0);
  const winner = redSum>blueSum ? 'red' : (blueSum>redSum ? 'blue' : 'draw');
  return { winner, redSum, blueSum };
}

function runMatch(codesA, codesB, opts={}) {
  const limitMs = opts.limitMs ?? 30000; // 30초
  const steps = Math.floor(limitMs / DT);
  initialize(codesA, codesB, opts.seed||0);
  for (let i=0;i<steps;i++) {
    step();
    if (isOver()) break;
  }
  return score();
}

function parseTeamFile(content) {
  // function name() 경계로 split 후 유효 블록만 반환
  const parts = content.split(/(?=function\s+name\s*\(\s*\))/);
  const blocks = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    if (s.includes('function name()') && s.includes('function update(')) blocks.push(s);
  }
  return blocks.slice(0,6);
}

module.exports = {
  Type, TANK_CONFIGS,
  runMatch,
  parseTeamFile,
};

