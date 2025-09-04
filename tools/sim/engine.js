import fs from 'fs';
import seedrandom from 'seedrandom';

export const WIDTH=800, HEIGHT=600, TANK_R=16, BULLET_R=6;
export const BULLET_SPEED=400, FIRE_COOLDOWN=0.5;
export const TANK_SPEED = { NORMAL:120, TANKER:105, DEALER:130 };
export const DT=0.016;

export const Type = { NORMAL:1, TANKER:2, DEALER:4 };

export function makeRNG(seed){ return seedrandom(seed); }

export function loadParamsFor(key){
  const path = new URL(`./params/${key}.json`, import.meta.url).pathname;
  try { const txt = fs.readFileSync(path,'utf8'); return JSON.parse(txt); } catch { return {}; }
}

export class Bullet{
  constructor(x,y,vx,vy,team){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.team=team; this.alive=true; }
  step(dt){ this.x += this.vx*dt; this.y += this.vy*dt; if (this.x<0||this.x>WIDTH||this.y<0||this.y>HEIGHT) this.alive=false; }
}

export class Tank{
  constructor(bot, team, spawn){
    this.bot=bot; this.team=team;
    this.x=spawn.x; this.y=spawn.y; this.vx=0; this.vy=0;
    this.hp=100; this.cool=0;
    this._speed = (bot.type()===Type.TANKER?TANK_SPEED.TANKER: (bot.type()===Type.DEALER?TANK_SPEED.DEALER:TANK_SPEED.NORMAL));
    this.name = bot.name();
  }
  api(world){
    const self = this;
    return {
      get x(){ return self.x; }, get y(){ return self.y; }, get vx(){ return self.vx; }, get vy(){ return self.vy; },
      move(angle){
        const nx = self.x + Math.cos(angle)*self._speed*DT;
        const ny = self.y + Math.sin(angle)*self._speed*DT;
        if (nx < TANK_R || nx > WIDTH-TANK_R || ny < TANK_R || ny > HEIGHT-TANK_R) return false;
        // basic ally collision soft-check
        for(const t of world.tanks){ if (t===self) continue; const d=Math.hypot(nx-t.x, ny-t.y); if (d < TANK_R*2-2) return false; }
        self.vx = (nx - self.x)/DT; self.vy = (ny - self.y)/DT; self.x = nx; self.y = ny; return true;
      },
      fire(angle){
        if (self.cool>0) return false; self.cool = FIRE_COOLDOWN;
        world.spawnBullet(self, angle); return true;
      }
    };
  }
}

export class World{
  constructor(botsA, botsB, rng){
    this.rng=rng; this.time=0; this.tanks=[]; this.bullets=[];
    const spawnsA=[{x:WIDTH*0.2,y:HEIGHT*0.4},{x:WIDTH*0.2,y:HEIGHT*0.6},{x:WIDTH*0.2,y:HEIGHT*0.5}];
    const spawnsB=[{x:WIDTH*0.8,y:HEIGHT*0.6},{x:WIDTH*0.8,y:HEIGHT*0.4},{x:WIDTH*0.8,y:HEIGHT*0.5}];
    const bots = [...botsA, ...botsB];
    for(let i=0;i<botsA.length;i++) this.tanks.push(new Tank(botsA[i], 'A', spawnsA[i%spawnsA.length]));
    for(let i=0;i<botsB.length;i++) this.tanks.push(new Tank(botsB[i], 'B', spawnsB[i%spawnsB.length]));
  }
  spawnBullet(tank, angle){
    const vx = Math.cos(angle)*BULLET_SPEED, vy=Math.sin(angle)*BULLET_SPEED;
    const b = new Bullet(tank.x, tank.y, vx, vy, tank.team);
    this.bullets.push(b);
  }
  step(){
    // update bots
    const allies = (t)=> this.tanks.filter(x=>x.team===t.team && x!==t).map(x=>({x:x.x,y:x.y,vx:x.vx,vy:x.vy,hp:x.hp}));
    const enemies = (t)=> this.tanks.filter(x=>x.team!==t.team).map(x=>({x:x.x,y:x.y,vx:x.vx,vy:x.vy,hp:x.hp}));
    const bulletInfo = (t)=> this.bullets.filter(b=>b.team!==t.team).map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy}));
    for(const t of this.tanks){
      if (t.cool>0) t.cool = Math.max(0, t.cool-DT);
    }
    for(const t of this.tanks){
      const api = t.api(this);
      try{
        t.bot.update(api, enemies(t), allies(t), bulletInfo(t));
      }catch(e){ /* ignore bot error */ }
    }
    // bullets
    for(const b of this.bullets){ if (b.alive) b.step(DT); }
    // collisions
    for(const b of this.bullets){ if (!b.alive) continue; for(const t of this.tanks){ if (t.team===b.team) continue; const d=Math.hypot(b.x-t.x, b.y-t.y); if (d < TANK_R+BULLET_R){ t.hp -= 20; b.alive=false; break; } } }
    // cleanup
    this.bullets = this.bullets.filter(b=>b.alive);
    // time
    this.time += DT;
  }
  aliveCounts(){ const a=this.tanks.filter(t=>t.team==='A'&&t.hp>0).length; const b=this.tanks.filter(t=>t.team==='B'&&t.hp>0).length; return {a,b}; }
}

export function runMatch(botsA, botsB, opts){
  const {seed='42', maxTime=60} = opts||{}; const rng = seedrandom(seed);
  const world = new World(botsA,botsB,rng);
  let frames=0; let aliveAHist=0, aliveBHist=0;
  while(world.time < maxTime){
    world.step(); frames++;
    const {a,b} = world.aliveCounts(); aliveAHist+=a; aliveBHist+=b;
    if (a===0 || b===0) break;
  }
  const {a,b}=world.aliveCounts();
  const winner = a>b? 'A' : (b>a? 'B' : 'DRAW');
  return {
    time: world.time,
    winner,
    aliveA:a, aliveB:b,
    avgAliveA: aliveAHist/frames, avgAliveB: aliveBHist/frames
  };
}
