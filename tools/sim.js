#!/usr/bin/env node
/*
 간이 전투 시뮬레이터: tank_battle_platform.html 규약을 복제해
 파일(result/*.txt)의 6개 로봇 코드끼리 6v6 시뮬레이션을 수행.
 - 틱 간격: 50ms 등가, 발사 쿨다운 500ms => 10틱
 - 총알 속도: 8, 탱크 속도/크기/에너지/데미지: HTML과 동일
 - 충돌/경계/사망 규칙: HTML과 최대한 동일하게 반영
 - 렌더링 없음, 순수 로직만 평가
 사용법:
   node tools/sim.js run result/A.txt result/B.txt [rounds]
   node tools/sim.js rank result/<candidate>.txt  # 최근 N개와 토너먼트
*/

const fs = require('fs');
const path = require('path');

const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };
const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, size: 35, speed: 5, damage: 5 },
  [Type.TANKER]: { energy: 150, size: 45, speed: 3, damage: 4.5 },
  [Type.DEALER]: { energy: 80, size: 33, speed: 6, damage: 6.5 },
};

function splitRobotCodes(code) {
  const parts = code.split(/(?=function\s+name\s*\(\s*\))/);
  const robotCodes = [];
  for (let part of parts) {
    const trimmed = part.trim();
    if (trimmed && /function\s+name\s*\(\s*\)/.test(trimmed)) {
      const clean = trimmed.replace(/\/\/\s*=+.*?=+/g, '').trim();
      robotCodes.push(clean);
    }
  }
  return robotCodes.slice(0, 6);
}

class Tank {
  constructor(id, x, y, team, playerName, tankType = Type.NORMAL) {
    this.id = id; this.x = x; this.y = y; this.team = team; this.playerName = playerName; this.tankType = tankType;
    const cfg = TANK_CONFIGS[tankType];
    this.angle = 0;
    this.health = cfg.energy; this.energy = cfg.energy; this.speed = cfg.speed; this.size = cfg.size; this.damage = cfg.damage;
    this.alive = true; this.lastFireTick = -1e9; this.code = ''; this.hasMoved = false; this.moveAttempts = 0;
  }
  resetMoveFlag(){ this.hasMoved = false; this.moveAttempts = 0; }
  move(direction, tanks){
    if (!this.alive || this.hasMoved) return false;
    this.moveAttempts = (this.moveAttempts||0) + 1;
    if (this.moveAttempts > 10) return true; // 엔진 동작과 동일 처리
    const rad = (direction*Math.PI)/180;
    const newX = this.x + Math.cos(rad)*this.speed;
    const newY = this.y + Math.sin(rad)*this.speed;
    const r = this.size/2;
    if (newX - r < 0 || newX + r > 900 || newY - r < 0 || newY + r > 600) return false;
    for (const t of tanks){
      if (t.id===this.id || !t.alive) continue;
      const dist = Math.hypot(t.x-newX, t.y-newY);
      const comb = (this.size + t.size)/2 + 5;
      if (dist < comb) return false;
    }
    this.hasMoved = true; this.angle = direction; this.x = newX; this.y = newY; return true;
  }
  fire(angle, bullets, tick){
    if (!this.alive) return false; if (angle===undefined || angle===null) return false;
    // 500ms == 10틱
    if (tick - this.lastFireTick < 10) return false;
    this.lastFireTick = tick;
    const rad = (angle*Math.PI)/180;
    bullets.push({ x:this.x, y:this.y, vx:Math.cos(rad)*8, vy:Math.sin(rad)*8, team:this.team, owner:this.id, damage:this.damage, ownerType:this.tankType });
    return true;
  }
  takeDamage(d){ this.health -= d; if (this.health <= 0){ this.alive=false; } }
}

function initTeams(redCodes, blueCodes){
  const tanks=[];
  // Red: 2열 배치 (HTML과 같은 좌표)
  for (let i=0;i<6;i++){
    let row = Math.floor(i/2); let col = i%2; col = 1-col; // 1,0,1,0,1,0
    const t = new Tank(`R${i+1}`, 140 + col*100, 90 + row*120, 'red', `R${i+1}`, extractType(redCodes[i]))
    t.code = redCodes[i] || defaultCode('R'+(i+1));
    tanks.push(t);
  }
  // Blue: 기존과 동일
  for (let i=0;i<6;i++){
    const t = new Tank(`B${i+1}`, 640 + (i%2)*100, 90 + Math.floor(i/2)*120, 'blue', `B${i+1}`, extractType(blueCodes[i]))
    t.code = blueCodes[i] || defaultCode('B'+(i+1));
    tanks.push(t);
  }
  return tanks;
}

function extractType(code){
  try{
    const fn = new Function('Type', code + '\nreturn type();');
    const t = fn(Type);
    return (t===0||t===1||t===2)? t : Type.NORMAL;
  }catch(_){ return Type.NORMAL; }
}

function getEnemiesAllies(tank, tanks){
  const enemies = []; const allies=[];
  for (const t of tanks){
    if (!t.alive) continue; if (t.id===tank.id) continue;
    const d = Math.hypot(t.x-tank.x, t.y-tank.y);
    if (t.team !== tank.team){ enemies.push(Object.freeze({x:t.x, y:t.y, distance:d, angle: Math.atan2(t.y-tank.y, t.x-tank.x)*180/Math.PI, health:t.health })); }
    else { allies.push(Object.freeze({x:t.x, y:t.y, distance:d, health:t.health })); }
  }
  return {enemies:Object.freeze(enemies), allies:Object.freeze(allies)};
}

function getBulletInfo(tank, bullets){
  const arr=[];
  for (const b of bullets){ if (b.team!==tank.team){ arr.push(Object.freeze({x:b.x, y:b.y, vx:b.vx, vy:b.vy, distance: Math.hypot(b.x-tank.x,b.y-tank.y)})); } }
  return Object.freeze(arr);
}

function compile(code){
  return new Function('tank','enemies','allies','bulletInfo', `"use strict"; const Type={NORMAL:0,TANKER:1,DEALER:2}; const console = Object.freeze({log:(...a)=>{},warn:(...a)=>{},error:(...a)=>{}});\n${code}\nreturn (t,e,a,b)=>update(t,e,a,b);` )();
}

function runMatch(redFile, blueFile, rounds=1, maxTicks=3000){
  const read = f => splitRobotCodes(fs.readFileSync(f,'utf8'));
  const R = read(redFile); const B = read(blueFile);
  let redWins=0, blueWins=0, draws=0, agg = {redEnergy:0, blueEnergy:0};

  for (let r=0;r<rounds;r++){
    let tanks = initTeams(R,B);
    let bullets=[]; const updaters = new Map();
    const getUpdater = (t)=>{
      if (updaters.has(t.id)) return updaters.get(t.id);
      const code = t.code; const u = compile(code); updaters.set(t.id,u); return u;
    };
    for (let tick=0; tick<maxTicks; tick++){
      // AI
      for (const t of tanks){ if (!t.alive) continue; t.resetMoveFlag();
        const {enemies, allies} = getEnemiesAllies(t, tanks);
        const bulletInfo = getBulletInfo(t, bullets);
        const tankAPI = Object.freeze({
          move: Object.freeze((a)=>t.move(a,tanks)),
          fire: Object.freeze((a)=>t.fire(a,bullets,tick)),
          x:t.x, y:t.y, health:t.health, energy:t.energy, type:t.tankType, size:t.size,
        });
        try{ getUpdater(t)(tankAPI, enemies, allies, bulletInfo); }catch(_){ /* ignore */ }
      }
      // Bullets
      const nextBullets=[];
      bulletLoop: for (const b of bullets){
        const nx = b.x + b.vx; const ny = b.y + b.vy;
        if (nx<0||nx>900||ny<0||ny>600) continue; // out
        // hit check
        for (const t of tanks){ if (!t.alive) continue; if (t.team===b.team) continue; const d=Math.hypot(t.x-nx, t.y-ny); const hitR = t.size/2 + 3;
          if (d < hitR){ t.takeDamage(b.damage); continue bulletLoop; }
        }
        nextBullets.push({...b, x:nx, y:ny});
      }
      bullets = nextBullets;
      // end?
      const redAlive = tanks.filter(t=>t.team==='red' && t.alive).length;
      const blueAlive = tanks.filter(t=>t.team==='blue' && t.alive).length;
      if (redAlive===0 || blueAlive===0){ break; }
    }
    const redEnergy = tanks.filter(t=>t.team==='red'&&t.alive).reduce((s,t)=>s+t.health,0);
    const blueEnergy = tanks.filter(t=>t.team==='blue'&&t.alive).reduce((s,t)=>s+t.health,0);
    agg.redEnergy += redEnergy; agg.blueEnergy += blueEnergy;
    if (redEnergy>blueEnergy) redWins++; else if (blueEnergy>redEnergy) blueWins++; else draws++;
  }
  return {redWins, blueWins, draws, agg};
}

function defaultCode(label){
  return `function name(){return "${label}";}\nfunction type(){return Type.NORMAL;}\nfunction update(tank,enemies,allies,bulletInfo){\n  if(enemies.length){ const e=enemies[0]; const a=Math.atan2(e.y-tank.y,e.x-tank.x)*180/Math.PI; tank.fire(a); tank.move(a+180);}\n}`;
}

function listRecentResults(n=10){
  const dir = path.join(process.cwd(), 'result');
  const files = fs.readdirSync(dir).filter(f=>/\.txt$/.test(f)).map(f=>({f, m:fs.statSync(path.join(dir,f)).mtimeMs}))
    .sort((a,b)=>b.m-a.m).slice(0,n).map(x=>path.join(dir,x.f));
  return files;
}

function rankCandidate(candidateFile, recentN=10){
  const opponents = listRecentResults(recentN).filter(f=>path.resolve(f)!==path.resolve(candidateFile));
  let score=0; let results=[];
  for (const opp of opponents){
    const {redWins, blueWins, draws, agg} = runMatch(candidateFile, opp, 3, 2500);
    const s = redWins - blueWins; score += s;
    results.push({opp:path.basename(opp), redWins, blueWins, draws, redEnergy:agg.redEnergy, blueEnergy:agg.blueEnergy});
  }
  results.sort((a,b)=> (b.redWins-b.blueWins) - (a.redWins-a.blueWins) || (b.redEnergy-b.blueEnergy) - (a.redEnergy-a.blueEnergy));
  return {score, results};
}

function main(){
  const [,,cmd, ...args] = process.argv;
  if (cmd==='run'){
    const [red, blue, rounds] = args;
    if (!red || !blue){ console.error('usage: node tools/sim.js run result/A.txt result/B.txt [rounds]'); process.exit(1);}    
    const r = runMatch(red, blue, Number(rounds||'3'), 2500);
    console.log(JSON.stringify(r,null,2));
  } else if (cmd==='rank'){
    const [candidate] = args; if (!candidate){ console.error('usage: node tools/sim.js rank result/<candidate>.txt'); process.exit(1);}    
    const r = rankCandidate(candidate, 12);
    console.log(JSON.stringify(r,null,2));
  } else {
    console.log('usage:\n  node tools/sim.js run result/A.txt result/B.txt [rounds]\n  node tools/sim.js rank result/<candidate>.txt');
  }
}

if (require.main === module) main();

