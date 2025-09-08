#!/usr/bin/env node
/*
  Tank Battle offline simulator and optimizer.
  - Reimplements the essential game logic from tank_battle_platform.html
  - Searches for good weight sets for our 6-bot team
  - Writes final team code to result/<workdir>.txt
*/

const fs = require('fs');
const path = require('path');

// Constants replicated from HTML
const W = 900;
const H = 600;
const BULLET_SPEED = 8; // from fire()
const FIRE_COOLDOWN_TICKS = 10; // 500ms at 50ms/tick

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
  constructor(id, x, y, team, playerName, tankType = Type.NORMAL, code = '') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.team = team;
    this.playerName = playerName;
    this.tankType = tankType;
    const cfg = TANK_CONFIGS[tankType];
    this.angle = Math.random() * 360;
    this.health = cfg.energy;
    this.energy = cfg.energy;
    this.gunAngle = this.angle;
    this.speed = cfg.speed;
    this.size = cfg.size;
    this.damage = cfg.damage;
    this.alive = true;
    this.lastFireTick = -FIRE_COOLDOWN_TICKS;
    this.code = code;
    this.hasMoved = false;
    this.moveAttempts = 0;
  }
  resetMoveFlag() {
    this.hasMoved = false;
    this.moveAttempts = 0;
  }
  move(direction) {
    if (!this.alive || this.hasMoved) return false;
    this.moveAttempts = (this.moveAttempts || 0) + 1;
    if (this.moveAttempts > 10) return true;
    const rad = (direction * Math.PI) / 180;
    const newX = this.x + Math.cos(rad) * this.speed;
    const newY = this.y + Math.sin(rad) * this.speed;
    const r = this.size / 2;
    if (newX - r < 0 || newX + r > W || newY - r < 0 || newY + r > H) return false;
    for (const t of tanks) {
      if (t.id === this.id || !t.alive) continue;
      const d = Math.hypot(t.x - newX, t.y - newY);
      const thresh = (this.size + t.size) / 2 + 5;
      if (d < thresh) return false;
    }
    this.hasMoved = true;
    this.angle = direction;
    this.x = newX;
    this.y = newY;
    return true;
  }
  fire(angle, tick) {
    if (!this.alive) return false;
    if (angle === undefined || angle === null) return false;
    if (tick - this.lastFireTick < FIRE_COOLDOWN_TICKS) return false;
    this.lastFireTick = tick;
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
    if (this.health <= 0) this.alive = false;
  }
}

let tanks = [];
let bullets = [];

function splitRobotCodes(code) {
  const parts = code.split(/(?=function\s+name\s*\(\s*\))/);
  const out = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && /function\s+name\s*\(\s*\)/.test(trimmed)) {
      const clean = trimmed.replace(/\/\/\s*=+.*?=+/g, '').trim();
      out.push(clean);
    }
  }
  return out;
}

function loadTeamFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const blocks = splitRobotCodes(code);
  if (blocks.length < 6) {
    throw new Error(`Team file ${filePath} has ${blocks.length} robots (<6)`);
  }
  return blocks.slice(0, 6);
}

function makeSecureExec(code) {
  // Mimic the secure Function used in the HTML
  const f = new Function(
    'tank', 'enemies', 'allies', 'bulletInfo', 'tick',
    '"use strict";\n' +
    'const window=undefined, document=undefined, tanks=undefined, bullets=undefined, gameRunning=undefined, logMessage=undefined, Tank=undefined;\n' +
    'const Type={NORMAL:0,TANKER:1,DEALER:2};\n' +
    'const console=Object.freeze({log:(...a)=>{},warn:(...a)=>{},error:(...a)=>{}});\n' +
    code + '\n' +
    'update(tank,enemies,allies,bulletInfo);'
  );
  return (tank, enemies, allies, bulletInfo, tick) => {
    // Freeze data structures similar to HTML
    const deepCopy = (o) => JSON.parse(JSON.stringify(o));
    const enemiesSafe = enemies.map((e) => Object.freeze(deepCopy(e)));
    const alliesSafe = allies.map((a) => Object.freeze(deepCopy(a)));
    const bulletSafe = bulletInfo.map((b) => Object.freeze(deepCopy(b)));
    const tankAPI = Object.freeze({
      move: Object.freeze((angle) => tank.move(angle)),
      fire: Object.freeze((angle) => tank.fire(angle, tick)),
      x: tank.x, y: tank.y,
      health: tank.health, energy: tank.energy,
      type: tank.tankType, size: tank.size,
    });
    try { f(tankAPI, enemiesSafe, alliesSafe, bulletSafe, tick); } catch (e) {}
  };
}

function initMatch(redBlocks, blueBlocks) {
  tanks = [];
  bullets = [];
  // Red positions (order with column swap: col = 1 - (i%2))
  for (let i = 0; i < 6; i++) {
    const row = Math.floor(i / 2);
    let col = i % 2;
    col = 1 - col;
    const t = new Tank(`R${i+1}`, 140 + col * 100, 90 + row * 120, 'red', `R${i+1}`, Type.NORMAL, redBlocks[i]);
    // Determine type from code via probing type()
    try {
      const metaF = new Function(redBlocks[i] + '\nreturn {name:name(), type:type()};');
      const m = metaF();
      t.playerName = m.name || t.playerName;
      t.tankType = (m.type !== undefined ? m.type : Type.NORMAL);
      const cfg = TANK_CONFIGS[t.tankType];
      t.health = cfg.energy; t.energy = cfg.energy; t.size = cfg.size; t.speed = cfg.speed; t.damage = cfg.damage;
    } catch {}
    try {
      t.exec = makeSecureExec(redBlocks[i]);
    } catch (e) {
      t.exec = () => {}; // 실행 불가 코드: 정지
    }
    tanks.push(t);
  }
  for (let i = 0; i < 6; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const t = new Tank(`B${i+1}`, 640 + col * 100, 90 + row * 120, 'blue', `B${i+1}`, Type.NORMAL, blueBlocks[i]);
    try {
      const metaF = new Function(blueBlocks[i] + '\nreturn {name:name(), type:type()};');
      const m = metaF();
      t.playerName = m.name || t.playerName;
      t.tankType = (m.type !== undefined ? m.type : Type.NORMAL);
      const cfg = TANK_CONFIGS[t.tankType];
      t.health = cfg.energy; t.energy = cfg.energy; t.size = cfg.size; t.speed = cfg.speed; t.damage = cfg.damage;
    } catch {}
    try {
      t.exec = makeSecureExec(blueBlocks[i]);
    } catch (e) {
      t.exec = () => {};
    }
    tanks.push(t);
  }
}

function stepBullets() {
  const kept = [];
  for (const b of bullets) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) continue;
    let hit = false;
    for (const t of tanks) {
      if (!t.alive) continue;
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      const hitR = t.size / 2 + 2;
      if (d < hitR) {
        if (t.team !== b.team) {
          t.takeDamage(b.damage);
        } else {
          // friendly bullets pass through
          continue;
        }
        hit = true; break;
      }
    }
    if (!hit) kept.push(b);
  }
  bullets = kept;
}

function tickOnce(tick) {
  // Execute each tank
  for (const t of tanks) {
    if (!t.alive) continue;
    t.resetMoveFlag();
    // prepare enemies/allies view
    const enemies = tanks.filter(x => x.team !== t.team && x.alive).map(e => ({
      x: e.x, y: e.y,
      distance: Math.hypot(e.x - t.x, e.y - t.y),
      angle: (Math.atan2(e.y - t.y, e.x - t.x) * 180) / Math.PI,
      health: e.health,
    }));
    const allies = tanks.filter(x => x.team === t.team && x.alive && x.id !== t.id).map(a => ({
      x: a.x, y: a.y,
      distance: Math.hypot(a.x - t.x, a.y - t.y),
      health: a.health,
    }));
    const bulletInfo = bullets.filter(b => b.team !== t.team).map(b => ({
      x: b.x, y: b.y, vx: b.vx, vy: b.vy,
      distance: Math.hypot(b.x - t.x, b.y - t.y),
    }));
    t.exec(t, enemies, allies, bulletInfo, tick);
  }
  // Update bullets
  stepBullets();
}

function runMatch(maxTicks = 1200) {
  for (let tick = 0; tick < maxTicks; tick++) {
    tickOnce(tick);
    const redAlive = tanks.filter(t => t.team === 'red' && t.alive).length;
    const blueAlive = tanks.filter(t => t.team === 'blue' && t.alive).length;
    if (redAlive === 0 || blueAlive === 0) break;
  }
  const redE = tanks.filter(t => t.team === 'red' && t.alive).reduce((s,t) => s + Math.max(0,t.health), 0);
  const blueE = tanks.filter(t => t.team === 'blue' && t.alive).reduce((s,t) => s + Math.max(0,t.health), 0);
  const redAlive = tanks.filter(t => t.team === 'red' && t.alive).length;
  const blueAlive = tanks.filter(t => t.team === 'blue' && t.alive).length;
  return { redE, blueE, redAlive, blueAlive };
}

// Code generator: team with shared template, different roles
function genBotCode(botName, tankType, p) {
  // p: weights and params
  const {
    wEv=1.2, wWall=0.9, wAt=0.8, wOb=0.6, wC=0.15, wS=0.35,
    lowHp=30, wRt=0.8, jitter=6.0,
  } = p || {};
  return `function name(){return ${JSON.stringify(botName)};}
function type(){return ${tankType};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function nrm(x,y){const m=Math.hypot(x,y)||1e-6; return [x/m,y/m];}
  const W=900,H=600;
  // 1) 타겟: 거리+체력 가중
  let target=null, best=1e9;
  for(const e of enemies){ const s=e.distance*0.9 + Math.max(0,e.health)*0.4; if(s<best){best=s; target=e;} }
  // 2) 총알 회피
  let evx=0,evy=0,th=0; for(const b of bulletInfo){ const rx=b.x-tank.x, ry=b.y-tank.y; const d=Math.hypot(rx,ry)||1e-6; const bv=Math.hypot(b.vx,b.vy)||1e-6; const ux=b.vx/bv, uy=b.vy/bv; const closing=-(rx*ux+ry*uy)/d; if(closing>0){ const px=-uy, py=ux; const w=closing/(1+0.065*d); evx+=px*w; evy+=py*w; th+=w; } }
  ;[evx,evy]=nrm(evx,evy);
  // 3) 벽 회피
  let wx=0,wy=0; const m=60; if(tank.x<m) wx+=1- tank.x/m; if(W-tank.x<m) wx-=1- (W-tank.x)/m; if(tank.y<m) wy+=1- tank.y/m; if(H-tank.y<m) wy-=1- (H-tank.y)/m; ;[wx,wy]=nrm(wx,wy);
  // 4) 아군 응집/분리
  let ax=0,ay=0; for(const a of allies){ax+=a.x; ay+=a.y;} const c=Math.max(1,allies.length); ax/=c; ay/=c; let cx=ax?ax-tank.x:0, cy=ay?ay-tank.y:0; ;[cx,cy]=nrm(cx,cy);
  let sx=0,sy=0; for(const a of allies){ const dx=tank.x-a.x, dy=tank.y-a.y; const d=Math.hypot(dx,dy)||1; if(d<85){ sx+=dx/(d*d); sy+=dy/(d*d);} } ;[sx,sy]=nrm(sx,sy);
  // 5) 타겟 접근/측면 + 저체력 이탈
  let atx=0,aty=0, obx=0,oby=0, rtx=0,rty=0; if(target){ atx=(target.x-tank.x); aty=(target.y-tank.y); const n=Math.hypot(atx,aty)||1; atx/=n; aty/=n; obx=-aty; oby=atx; }
  if(tank.health<${+lowHp}){ rtx=-(cx||atx); rty=-(cy||aty); const rn=Math.hypot(rtx,rty)||1; rtx/=rn; rty/=rn; }
  // 합성 벡터
  const mvx=evx*${+wEv} + wx*${+wWall} + atx*${+wAt} + obx*${+wOb} + cx*${+wC} + sx*${+wS} + rtx*${+wRt};
  const mvy=evy*${+wEv} + wy*${+wWall} + aty*${+wAt} + oby*${+wOb} + cy*${+wC} + sy*${+wS} + rty*${+wRt};
  const mvAng=deg(mvx,mvy);
  // 사격: 기본 조준 + 소량 지터 스윕
  if(target){ const aim=deg(target.x-tank.x,target.y-tank.y); const jitter=${+jitter}*(Math.random()-0.5); tank.fire(ang(aim+jitter)); }
  if(!tank.move(ang(mvAng))){ if(!tank.move(ang(mvAng+70))){ if(!tank.move(ang(mvAng-70))){ tank.move(Math.random()*360); }}}
}`;
}

function genTeamCode(params) {
  // Roles: 2 Tankers (front), 3 Dealers (flank), 1 Normal (anchor)
  const bots = [];
  const roles = [
    { name: 'Aegis', type: 1, p: { wEv:1.0, wWall:0.9, wAt:0.95, wOb:0.35, wC:0.1, wS:0.25, lowHp:35, wRt:0.6, jitter:4.0 } },
    { name: 'Bulwark', type: 1, p: { wEv:1.05,wWall:0.85,wAt:0.9,  wOb:0.4,  wC:0.08,wS:0.28, lowHp:38, wRt:0.65,jitter:3.5 } },
    { name: 'Valkyrie', type: 2, p:{ wEv:1.35,wWall:0.9, wAt:0.7,  wOb:0.8,  wC:0.15,wS:0.38, lowHp:28, wRt:0.9, jitter:6.5 } },
    { name: 'Raptor',   type: 2, p:{ wEv:1.4,  wWall:0.95,wAt:0.68, wOb:0.82, wC:0.12,wS:0.4,  lowHp:26, wRt:0.95,jitter:6.8 } },
    { name: 'Spectre',  type: 2, p:{ wEv:1.32,wWall:0.9, wAt:0.72, wOb:0.78, wC:0.16,wS:0.36, lowHp:30, wRt:0.9, jitter:6.0 } },
    { name: 'Sentinel', type: 0, p:{ wEv:1.2, wWall:1.0, wAt:0.8,  wOb:0.55, wC:0.2, wS:0.35, lowHp:32, wRt:0.8, jitter:5.0 } },
  ];
  // Mildly perturb with params (random search will set these)
  const outBlocks = roles.map((role, idx) => genBotCode(role.name, role.type, { ...role.p, ...(params[idx]||{}) }));
  return outBlocks.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function evaluateTeam(teamBlocks, oppBlocks, games=1, maxTicks=1200) {
  let score = 0;
  for (let g=0; g<games; g++) {
    initMatch(teamBlocks, oppBlocks);
    const r = runMatch(maxTicks);
    const diff = (r.redAlive - r.blueAlive) * 200 + (r.redE - r.blueE);
    score += diff;
  }
  return score / games;
}

function randn() {
  // Box–Muller
  let u = 0, v = 0; while (u===0) u=Math.random(); while (v===0) v=Math.random();
  return Math.sqrt(-2.0*Math.log(u)) * Math.cos(2*Math.PI*v);
}

function neighborParams(base) {
  // base: array of per-bot param deltas
  const perturbed = base.map(p => ({...p}));
  for (const p of perturbed) {
    if (Math.random()<0.8) p.wEv = (p.wEv||0)+0.05*randn();
    if (Math.random()<0.8) p.wWall = (p.wWall||0)+0.05*randn();
    if (Math.random()<0.8) p.wAt = (p.wAt||0)+0.05*randn();
    if (Math.random()<0.8) p.wOb = (p.wOb||0)+0.05*randn();
    if (Math.random()<0.6) p.wC = (p.wC||0)+0.03*randn();
    if (Math.random()<0.6) p.wS = (p.wS||0)+0.03*randn();
    if (Math.random()<0.6) p.wRt = (p.wRt||0)+0.05*randn();
    if (Math.random()<0.5) p.lowHp = Math.max(18, Math.min(60, (p.lowHp||0) + 2*randn()));
    if (Math.random()<0.5) p.jitter = Math.max(0, Math.min(10, (p.jitter||0) + 0.6*randn()));
  }
  return perturbed;
}

function main() {
  const workdir = process.argv[2] || (fs.existsSync('CURRENT_WORKDIR') ? fs.readFileSync('CURRENT_WORKDIR','utf8').trim() : null);
  if (!workdir) {
    console.error('Usage: node tools/sim.js <workdir>');
    process.exit(1);
  }
  const resultDir = path.join(process.cwd(), 'result');
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir);
  const opponents = fs.readdirSync(resultDir).filter(f => f.endsWith('.txt'));
  const oppFiles = opponents.map(f => path.join(resultDir, f));
  // Prepare opponents blocks
  const oppBlocksList = oppFiles.map(f => ({ file:f, blocks: loadTeamFromFile(f) }));
  // Base team
  let baseParams = [{},{},{},{},{},{}];
  // Allow warm-start from previous summary
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(workdir, 'summary.json'), 'utf8'));
    if (prev && Array.isArray(prev.params) && prev.params.length === 6) {
      baseParams = prev.params;
    }
  } catch {}
  let best = { params: baseParams, score: -Infinity, details: {} };
  const candidateCount = Number(process.env.SIM_ITERS || 24); // search iterations
  const gamesPerOpp = Number(process.env.SIM_GAMES || 2);
  const maxTicks = Number(process.env.SIM_TICKS || 1000);
  for (let i=0; i<candidateCount; i++) {
    const params = i===0 ? baseParams : neighborParams(best.params);
    const teamCode = genTeamCode(params);
    const teamBlocks = splitRobotCodes(teamCode);
    let total = 0; const det = {};
    for (const opp of oppBlocksList) {
      const s = evaluateTeam(teamBlocks, opp.blocks, gamesPerOpp, maxTicks);
      det[path.basename(opp.file)] = s;
      total += s;
    }
    if (total > best.score) {
      best = { params, score: total, details: det };
      // console.log('New best', total, params);
    }
  }
  // Emit final code
  const finalCode = genTeamCode(best.params);
  const outPath = path.join(resultDir, `${workdir}.txt`);
  fs.writeFileSync(outPath, finalCode, 'utf8');
  // Save summary
  const summary = { workdir, score: best.score, details: best.details, params: best.params };
  fs.writeFileSync(path.join(workdir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('Wrote', outPath, 'score', best.score);
}

if (require.main === module) {
  main();
}
