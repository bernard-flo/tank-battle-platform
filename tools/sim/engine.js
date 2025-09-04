import seedrandom from 'seedrandom';
import { loadBot, Type } from './loader.js';
import fs from 'fs';
import path from 'path';

const WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6;
const BULLET_SPEED=400, FIRE_COOLDOWN=0.5;
const SPEEDS = { [Type.NORMAL]: 120, [Type.TANKER]: 105, [Type.DEALER]: 130 };
const DT = 0.016, TIME_LIMIT = 60; // seconds

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function botKeyFromPath(p){ const b = path.basename(p).replace(/\.js$/,''); return b; }
function loadParams(botPath){
  try {
    const key = botKeyFromPath(botPath);
    const p = path.join(path.dirname(new URL(import.meta.url).pathname), 'params', `${key}.json`);
    return JSON.parse(fs.readFileSync(p,'utf8'));
  } catch { return {}; }
}

export function runMatch({aPath, bPath, seed=42, rounds=1}){
  const rng = seedrandom(String(seed));
  const results = [];
  for(let r=0;r<rounds;r++){
    results.push(simOne(aPath,bPath,rng));
  }
  return results;
}

function simOne(aPath,bPath,rng){
  const paramsA = loadParams(aPath);
  const paramsB = loadParams(bPath);
  // 단위 정합: 엔진 내부 속도는 프레임당 이동량을 사용하므로
  // 봇에 전달되는 bulletSpeed도 프레임당으로 맞춘다.
  const A = loadBot(aPath, {...paramsA, bulletSpeed: BULLET_SPEED * DT});
  const B = loadBot(bPath, {...paramsB, bulletSpeed: BULLET_SPEED * DT});
  const teamA = [{...makeTank(A, 'A', rng)}];
  const teamB = [{...makeTank(B, 'B', rng)}];
  const bullets = [];
  let t=0;
  while(t<TIME_LIMIT && alive(teamA) && alive(teamB)){
    // update
    stepTeam(teamA, teamB, bullets, rng);
    stepTeam(teamB, teamA, bullets, rng);
    // move
    moveTanks([...teamA, ...teamB]);
    moveBullets(bullets);
    handleCollisions(teamA, teamB, bullets);
    t += DT;
  }
  const winA = alive(teamA) && !alive(teamB);
  const winB = alive(teamB) && !alive(teamA);
  return { winA: !!winA, winB: !!winB, time: t, aliveA: countAlive(teamA), aliveB: countAlive(teamB) };
}

function makeTank(bot, side, rng){
  const x = side==='A'? WIDTH*0.25 : WIDTH*0.75;
  const y = HEIGHT* (0.45 + 0.1*rng());
  const t = { x, y, vx:0, vy:0, hp:100, cooldown:0, bot, side, id: Math.floor(rng()*1e9) };
  t.move = (ang)=>{ const typeMask=bot.type; const sp = SPEEDS[matchType(typeMask)]*DT; t.vx = Math.cos(ang)*sp; t.vy = Math.sin(ang)*sp; return true; };
  t.fire = (ang)=>{ if(t.cooldown>0) return false; t._fire = (t._fire||[]); t._fire.push(ang); t.cooldown = FIRE_COOLDOWN; return true; };
  return t;
}
function matchType(mask){ if(mask & Type.TANKER) return Type.TANKER; if(mask & Type.DEALER) return Type.DEALER; return Type.NORMAL; }
function alive(team){ return team.some(u=>u.hp>0); }
function countAlive(team){ return team.filter(u=>u.hp>0).length; }

function stepTeam(me, opp, bullets, rng){
  // prepare bulletInfo for each tank (opponent bullets only)
  const oppBullets = bullets.filter(b=>b.side!==me[0].side);
  for(const t of me){ if(t.hp<=0) continue;
    const enemies = opp.map(o=>({x:o.x, y:o.y, hp:o.hp, vx:o.vx, vy:o.vy}));
    const allies = me.filter(a=>a!==t).map(a=>({x:a.x, y:a.y, hp:a.hp, vx:a.vx, vy:a.vy}));
    const bulletInfo = oppBullets.map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy}));
    try{ t.bot.update(t, enemies, allies, bulletInfo); }catch(e){ /* ignore bot errors */ }
  }
  // fire -> spawn bullets (track owner to avoid friendly/self hits)
  for(const t of me){ if(t.hp<=0) continue; if(Array.isArray(t._fire)){
      for(const ang of t._fire){ bullets.push({ x:t.x, y:t.y, vx:Math.cos(ang)*BULLET_SPEED*DT, vy:Math.sin(ang)*BULLET_SPEED*DT, side:t.side, owner:t.id }); }
    }
    t._fire=[];
  }
}

function moveTanks(units){
  for(const t of units){ if(t.hp<=0) continue; t.cooldown = Math.max(0, t.cooldown - DT); t.x = clamp(t.x + t.vx, TANK_R, WIDTH-TANK_R); t.y = clamp(t.y + t.vy, TANK_R, HEIGHT-TANK_R); }
}
function moveBullets(bullets){ for(const b of bullets){ b.x += b.vx; b.y += b.vy; b.life = (b.life||0)+DT; } }
function handleCollisions(A,B,bullets){
  // bullet hit
  for(const b of bullets){
    for(const t of [...A,...B]){
      if(t.hp<=0) continue;
      // ignore friendly and self bullets
      if(b.side === t.side) continue;
      if(b.owner && b.owner === t.id) continue;
      const dx=b.x-t.x, dy=b.y-t.y;
      if(dx*dx+dy*dy <= (TANK_R+BULLET_R)*(TANK_R+BULLET_R)){
        t.hp -= 30; // balance: increase damage to encourage kills
        b._dead=true;
      }
    }
  }
  // bullet out of bounds/time
  for(const b of bullets){ if(b.life>3 || b.x<0||b.x>WIDTH||b.y<0||b.y>HEIGHT) b._dead=true; }
  let i=bullets.length; while(i--) if(bullets[i]._dead) bullets.splice(i,1);
}

export function ensureDirs(){ const out=path.join(path.dirname(new URL(import.meta.url).pathname),'results'); if(!fs.existsSync(out)) fs.mkdirSync(out,{recursive:true}); return out; }
