#!/usr/bin/env node
'use strict';

// Minimal tank battle simulator skeleton (non-visual)

const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };
const TANK_CONFIGS = {
  [Type.NORMAL]: { energy: 100, size: 35, speed: 5, damage: 5 },
  [Type.TANKER]: { energy: 150, size: 45, speed: 3, damage: 4.5 },
  [Type.DEALER]: { energy: 80,  size: 33, speed: 6, damage: 6.5 },
};
const ARENA = { W: 900, H: 600 };
const BULLET_SPEED = 8;
const FIRE_COOLDOWN_MS = 500;

class Tank {
  constructor(id, x, y, team, type=Type.NORMAL) {
    const cfg=TANK_CONFIGS[type];
    Object.assign(this, { id, x, y, team, type });
    this.health = cfg.energy; this.energy = cfg.energy;
    this.speed = cfg.speed; this.size = cfg.size; this.damage = cfg.damage;
    this.lastFire = 0; this.alive = true; this.hasMoved=false; this.moveAttempts=0;
  }
  move(angle){
    if(!this.alive || this.hasMoved) return false;
    this.moveAttempts++; if(this.moveAttempts>10){ return true; }
    const rad=angle*Math.PI/180;
    const nx=this.x+Math.cos(rad)*this.speed; const ny=this.y+Math.sin(rad)*this.speed;
    const r=this.size/2;
    if(nx-r<0||nx+r>ARENA.W||ny-r<0||ny+r>ARENA.H) return false;
    this.x=nx; this.y=ny; this.hasMoved=true; return true;
  }
  fire(angle, now){
    if(!this.alive) return false; if(now - this.lastFire < FIRE_COOLDOWN_MS) return false;
    this.lastFire=now; const rad=angle*Math.PI/180;
    return { x:this.x, y:this.y, vx:Math.cos(rad)*BULLET_SPEED, vy:Math.sin(rad)*BULLET_SPEED, team:this.team, owner:this.id, damage:this.damage };
  }
  reset(){ this.hasMoved=false; this.moveAttempts=0; }
}

function step(state, now){
  const { tanks, bullets } = state;
  // Update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.x+=b.vx; b.y+=b.vy;
    if(b.x<0||b.x>ARENA.W||b.y<0||b.y>ARENA.H){ bullets.splice(i,1); continue; }
    for(const t of tanks){ if(!t.alive) continue; const d=Math.hypot(t.x-b.x, t.y-b.y); if(d < t.size/2 + 2){ if(t.team!==b.team){ t.health -= b.damage; if(t.health<=0) t.alive=false; } bullets.splice(i,1); break; } }
  }
  // User AI hook would go here (safe API wrapper)
  for(const t of tanks){ t.reset(); }
}

function main(){
  const tanks=[
    new Tank('R1',100,100,'red',Type.TANKER),
    new Tank('B1',800,500,'blue',Type.DEALER),
  ];
  const bullets=[];
  const state={ tanks, bullets };
  let ticks=0; const start=Date.now();
  while(ticks<10){ step(state, Date.now()); ticks++; }
  console.log(JSON.stringify({ tanks: state.tanks.map(t=>({id:t.id,team:t.team,alive:t.alive,health:t.health,x:t.x,y:t.y})) }, null, 2));
}

if (require.main === module) main();

