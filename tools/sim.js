#!/usr/bin/env node
// Headless simulator matching tank_battle_platform core logic (no DOM)
const fs = require('fs');

const W = 900, H = 600;
const Type = { NORMAL:0, TANKER:1, DEALER:2 };
const TANK_CONFIGS = {
  [Type.NORMAL]: { energy:100, size:35, speed:5, damage:5 },
  [Type.TANKER]: { energy:150, size:45, speed:3, damage:4.5 },
  [Type.DEALER]: { energy:80, size:33, speed:6, damage:6.5 },
};

class Tank {
  constructor(id, x, y, team, name, tankType, code){
    this.id=id; this.x=x; this.y=y; this.team=team; this.playerName=name; this.tankType=tankType; this.code=code;
    const cfg=TANK_CONFIGS[tankType];
    this.angle=Math.random()*360; this.gunAngle=this.angle;
    this.health=cfg.energy; this.energy=cfg.energy; this.speed=cfg.speed; this.size=cfg.size; this.damage=cfg.damage;
    this.alive=true; this.lastFire=0; this.hasMoved=false; this.moveAttempts=0;
  }
  move(direction){ if(!this.alive||this.hasMoved) return false; this.moveAttempts=(this.moveAttempts||0)+1; if(this.moveAttempts>10) return true; const rad=direction*Math.PI/180; const nx=this.x+Math.cos(rad)*this.speed; const ny=this.y+Math.sin(rad)*this.speed; const r=this.size/2; if(nx-r<0||nx+r>W||ny-r<0||ny+r>H) return false; for(const t of tanks){ if(t.id===this.id||!t.alive) continue; const d=Math.hypot(t.x-nx,t.y-ny); const cr=(this.size+t.size)/2+5; if(d<cr) return false; } this.hasMoved=true; this.angle=direction; this.x=nx; this.y=ny; return true; }
  fire(angle){ if(!this.alive) return false; if(now - this.lastFire < 500) return false; if(angle==null) return false; this.lastFire=now; const rad=angle*Math.PI/180; bullets.push({x:this.x,y:this.y,vx:Math.cos(rad)*8,vy:Math.sin(rad)*8,team:this.team,owner:this.id,damage:this.damage}); return true; }
  takeDamage(dmg){ this.health-=dmg; if(this.health<=0){ this.alive=false; }}
  resetMoveFlag(){ this.hasMoved=false; this.moveAttempts=0; }
}

let tanks=[], bullets=[], now=0;

function parseTeam(file){
  const code=fs.readFileSync(file,'utf8');
  const parts = code.split(/(?=function\s+name\s*\(\s*\))/).filter(s=>/function\s+name\s*\(\s*\)/.test(s));
  return parts.slice(0,6);
}

function setup(redParts, blueParts){
  tanks=[]; bullets=[];
  for(let i=0;i<6;i++){
    const redCode=redParts[i]||fallbackCode('R',i+1);
    const name = new Function(redCode+"\nreturn name();")();
    const type = new Function(redCode+"\nreturn type();")();
    const t=new Tank(`R${i+1}`, 140 + (1-(i%2))*100, 90 + Math.floor(i/2)*120, 'red', name, type, redCode); tanks.push(t);
  }
  for(let i=0;i<6;i++){
    const blueCode=blueParts[i]||fallbackCode('B',i+1);
    const name = new Function(blueCode+"\nreturn name();")();
    const type = new Function(blueCode+"\nreturn type();")();
    const t=new Tank(`B${i+1}`, 640 + (i%2)*100, 90 + Math.floor(i/2)*120, 'blue', name, type, blueCode); tanks.push(t);
  }
}

function fallbackCode(prefix,i){
  return `function name(){return "Player ${prefix}${i}";} function type(){return 0;} function update(tank,enemies,allies,bulletInfo){ if(enemies.length){ const e=enemies[0]; const a=Math.atan2(e.y-tank.y,e.x-tank.x)*180/Math.PI; tank.fire(a); tank.move(a+180);} }`;
}

function executeTankAI(t){ if(!t.alive) return; t.resetMoveFlag();
  const create=(o)=>Object.freeze(JSON.parse(JSON.stringify(o)));
  const enemies=tanks.filter(x=>x.team!==t.team && x.alive).map(e=>create({x:e.x,y:e.y,distance:Math.hypot(e.x-t.x,e.y-t.y),angle:Math.atan2(e.y-t.y,e.x-t.x)*180/Math.PI,health:e.health}));
  const allies=tanks.filter(x=>x.team===t.team && x.alive && x.id!==t.id).map(a=>create({x:a.x,y:a.y,distance:Math.hypot(a.x-t.x,a.y-t.y),health:a.health}));
  const bulletInfo=bullets.filter(b=>b.team!==t.team).map(b=>create({x:b.x,y:b.y,vx:b.vx,vy:b.vy,distance:Math.hypot(b.x-t.x,b.y-t.y)}));
  const tankAPI=Object.freeze({move:(ang)=>t.move(ang),fire:(ang)=>t.fire(ang),x:t.x,y:t.y,health:t.health,energy:t.energy,type:t.tankType,size:t.size});
  const fn=new Function('tank','enemies','allies','bulletInfo', `"use strict"; const window=undefined, document=undefined, tanks=undefined, bullets=undefined, gameRunning=undefined, logMessage=undefined, Tank=undefined; const Type={NORMAL:0,TANKER:1,DEALER:2}; const console=Object.freeze({log:(...a)=>{},warn:(...a)=>{},error:(...a)=>{}}); ${t.code}\nupdate(tank,enemies,allies,bulletInfo);`);
  try{ fn(tankAPI, Object.freeze(enemies), Object.freeze(allies), Object.freeze(bulletInfo)); } catch(e){ /* ignore */ }
}

function updateBullets(){
  bullets = bullets.filter(b=>{
    b.x+=b.vx; b.y+=b.vy; if(b.x<0||b.x>W||b.y<0||b.y>H) return false;
    for(const t of tanks){ if(!t.alive) continue; const d=Math.hypot(t.x-b.x,t.y-b.y); const hit=t.size/2+2; if(d<hit){ if(t.team!==b.team){ t.takeDamage(b.damage);} else { return true; } return false; } }
    return true;
  });
}

function step(){ for(const t of tanks){ if(t.alive) executeTankAI(t);} updateBullets(); }

function alive(team){ return tanks.filter(t=>t.team===team && t.alive).length; }
function energy(team){ return tanks.filter(t=>t.team===team && t.alive).reduce((s,t)=>s+Math.max(0,t.health),0); }

function runBattle(maxMs=60000){ now=0; let iters=0; const dt=50; while(now<maxMs){ step(); now+=500/10; // maintain same fire cooldown basis
    if(alive('red')===0 || alive('blue')===0) break; if(++iters>2000) break; }
  const eR=energy('red'), eB=energy('blue');
  if(alive('red')>0 && alive('blue')===0) return {winner:'red', eR, eB};
  if(alive('blue')>0 && alive('red')===0) return {winner:'blue', eR, eB};
  return {winner: eR>eB ? 'red' : (eB>eR ? 'blue' : 'draw'), eR, eB};
}

function main(){
  const [,,redPath, bluePath, roundsStr] = process.argv;
  if(!redPath || !bluePath){ console.error('usage: node tools/sim.js result/RED.txt result/BLUE.txt [rounds]'); process.exit(1);} 
  const R=parseInt(roundsStr||'9',10);
  const red=parseTeam(redPath), blue=parseTeam(bluePath);
  let r=0,b=0,d=0; for(let i=0;i<R;i++){ setup(red,blue); const res=runBattle(60000); if(res.winner==='red') r++; else if(res.winner==='blue') b++; else d++; }
  console.log(JSON.stringify({red:redPath, blue:bluePath, rounds:R, redWins:r, blueWins:b, draws:d}));
}

if(require.main===module) main();
