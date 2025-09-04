// 간이 시뮬레이터 엔진 (DOM 비의존)
export const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };

const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, size: 35, speed: 5, damage: 5 },
  [Type.TANKER]: { energy: 150, size: 45, speed: 3, damage: 4.5 },
  [Type.DEALER]: { energy: 80, size: 33, speed: 6, damage: 6.5 }
};

export class Tank {
  constructor(id, x, y, team, playerName, tankType = Type.NORMAL) {
    this.id = id; this.x = x; this.y = y; this.team = team; this.playerName = playerName; this.tankType = tankType;
    const config = TANK_CONFIGS[tankType];
    this.angle = Math.random() * 360;
    this.health = config.energy; this.energy = config.energy; this.gunAngle = this.angle;
    this.speed = config.speed; this.size = config.size; this.damage = config.damage;
    this.alive = true; this.lastFire = 0; this.hasMoved = false; this.moveAttempts = 0; this.code = '';
  }
  move(direction){
    if (!this.alive || this.hasMoved) return false;
    this.moveAttempts = (this.moveAttempts||0)+1; if (this.moveAttempts>10) return true;
    const rad = (direction*Math.PI)/180; const newX = this.x + Math.cos(rad)*this.speed; const newY = this.y + Math.sin(rad)*this.speed;
    const r = this.size/2; if (newX - r < 0 || newX + r > 900 || newY - r < 0 || newY + r > 600) return false;
    for (let t of tanks){ if (t.id===this.id || !t.alive) continue; const d = Math.hypot(t.x - newX, t.y - newY); const cr = (this.size + t.size)/2 + 5; if (d < cr) return false; }
    this.hasMoved = true; this.angle = direction; this.x = newX; this.y = newY; return true;
  }
  fire(angle, now){
    if (!this.alive || now - this.lastFire < 500) return false; if (angle==null) return false; this.lastFire = now;
    const rad = (angle*Math.PI)/180; bullets.push({ x: this.x, y: this.y, vx: Math.cos(rad)*8, vy: Math.sin(rad)*8, team: this.team, owner: this.id, damage: this.damage, ownerType: this.tankType });
    return true;
  }
  takeDamage(d){ this.health -= d; if (this.health<=0){ this.alive=false; } }
  resetMoveFlag(){ this.hasMoved=false; this.moveAttempts=0; }
}

export let tanks = [];
export let bullets = [];

export function initializeGame(players){
  tanks = []; bullets = [];
  // 레드팀 좌측, 블루팀 우측 (플랫폼과 동일 배치)
  for (let i=0;i<6;i++){
    const p = players[i];
    let row = Math.floor(i/2); let col = i%2; col = 1-col;
    const t = new Tank(p.id, 140 + col*100, 90 + row*120, 'red', p.name, p.type);
    t.code = p.code; tanks.push(t);
  }
  for (let i=0;i<6;i++){
    const p = players[i+6];
    const t = new Tank(p.id, 640 + (i%2)*100, 90 + Math.floor(i/2)*120, 'blue', p.name, p.type);
    t.code = p.code; tanks.push(t);
  }
}

function executeTankAI(tank, now){
  try{
    const enemies = tanks.filter(t=>t.team!==tank.team && t.alive).map(t=>({x:t.x,y:t.y,distance:Math.hypot(t.x-tank.x,t.y-tank.y),angle:(Math.atan2(t.y-tank.y,t.x-tank.x)*180)/Math.PI,health:t.health}));
    const allies = tanks.filter(t=>t.team===tank.team && t.alive && t.id!==tank.id).map(t=>({x:t.x,y:t.y,distance:Math.hypot(t.x-tank.x,t.y-tank.y),health:t.health}));
    const bulletInfo = bullets.filter(b=>b.team!==tank.team).map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,distance:Math.hypot(b.x-tank.x,b.y-tank.y)}));
    const tankAPI = Object.freeze({ move: (a)=>tank.move(a), fire: (a)=>tank.fire(a, now), x: tank.x, y: tank.y, health: tank.health, energy: tank.energy, type: tank.tankType, size: tank.size });
    const secureFunc = new Function('tank','enemies','allies','bulletInfo', `"use strict"; const window=undefined, document=undefined, tanks=undefined, bullets=undefined, gameRunning=undefined, logMessage=undefined, Tank=undefined, Type={NORMAL:0,TANKER:1,DEALER:2}; ${tank.code} update(tank,enemies,allies,bulletInfo);`);
    secureFunc(tankAPI, Object.freeze(enemies), Object.freeze(allies), Object.freeze(bulletInfo));
  }catch(e){ /* ignore user code errors in sim */ }
}

export function updateBullets(){
  bullets = bullets.filter(b=>{
    b.x += b.vx; b.y += b.vy;
    if (b.x<0||b.x>900||b.y<0||b.y>600) return false;
    for (let t of tanks){ if (!t.alive) continue; const d = Math.hypot(t.x-b.x, t.y-b.y); const hitR = t.size/2 + 2; if (d < hitR){ if (t.team !== b.team){ t.takeDamage(b.damage); } else { return true; } return false; } }
    return true;
  });
}

export function step(now){
  for (let t of tanks){ t.resetMoveFlag(); }
  for (let t of tanks){ if (t.alive) executeTankAI(t, now); }
  updateBullets();
}

export function isBattleOver(){
  const redAlive = tanks.some(t=>t.team==='red' && t.alive);
  const blueAlive = tanks.some(t=>t.team==='blue' && t.alive);
  return !(redAlive && blueAlive);
}

export function winner(){
  const redAlive = tanks.filter(t=>t.team==='red' && t.alive);
  const blueAlive = tanks.filter(t=>t.team==='blue' && t.alive);
  if (redAlive.length && !blueAlive.length) return 'red';
  if (blueAlive.length && !redAlive.length) return 'blue';
  // 점수로 판정: 합산 체력
  const redHP = redAlive.reduce((s,t)=>s+t.health,0);
  const blueHP = blueAlive.reduce((s,t)=>s+t.health,0);
  if (redHP>blueHP) return 'red'; if (blueHP>redHP) return 'blue'; return 'draw';
}

