function name() { return 'Tanker Bruiser'; }

function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo){
  'use strict';

  // ===== Utils =====
  function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax)*180/Math.PI; }
  function dist(ax,ay,bx,by){ return Math.hypot(bx-ax, by-ay); }
  function tryMove(a){ const seq=[0,10,-10,20,-20,35,-35,50,-50,80]; for(const o of seq){ if(tank.move(a+o)) return true; } return false; }
  function mostThreat(){ let best=null,score=0; for(const b of bulletInfo){ const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-6; const approach=(-(b.vx*dx+b.vy*dy)/d); const s=(approach>0?approach:0)/d; if(s>score){score=s;best=b;} } return {b:best,s:score}; }
  function evade(b){ const base=Math.atan2(b.vy,b.vx)*180/Math.PI; const l=base+90,r=base-90; const tx=tank.x-b.x, ty=tank.y-b.y; function proj(a){const r=a*Math.PI/180; return Math.cos(r)*tx+Math.sin(r)*ty;} const dir=proj(l)>proj(r)?l:r; return tryMove(dir + (Math.random()*2-1)*6); }
  function pickFront(list){ if(!list||!list.length) return null; let best=list[0]; for(const e of list){ if(e.distance<best.distance) best=e; } return best; }
  function nearWall(x,y,m){ return (x<m||x>900-m||y<m||y>600-m); }

  // ===== Behavior =====
  const threat = mostThreat();
  if (threat.b && threat.s>0.002) {
    if(!evade(threat.b)){
      const away=angleTo(threat.b.x,threat.b.y,tank.x,tank.y);
      tryMove(away);
    }
  }

  const tgt = pickFront(enemies);
  if (tgt){
    const d=tgt.distance; const toTgt=angleTo(tank.x,tank.y,tgt.x,tgt.y);
    // Zig-zag strafe sign from position-based parity
    const zig = ((Math.floor((tank.x+tank.y)/50)%2) ? 1 : -1);
    let moveDir;
    if (nearWall(tank.x,tank.y,40)){
      // wall sliding: move parallel along nearest wall
      if (tank.x<40) moveDir = 0 + zig*15; else if (tank.x>860) moveDir = 180 + zig*15; else if (tank.y<40) moveDir = 90 + zig*15; else moveDir = 270 + zig*15;
    } else if (d>220){
      moveDir = toTgt + zig*20; // advance with slight strafe
    } else if (d<120){
      moveDir = toTgt + 180 + zig*15; // create breathing room
    } else {
      moveDir = toTgt + zig*90; // orbit pressure
    }
    tryMove(moveDir + (Math.random()*2-1)*6);

    // constant pressure fire
    tank.fire(toTgt + (Math.random()*2-1)*3);
  } else {
    // push toward center if no visible enemies
    const c=angleTo(tank.x,tank.y,450,300);
    tryMove(c);
  }
}

