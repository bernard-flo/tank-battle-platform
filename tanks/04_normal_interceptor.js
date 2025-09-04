function name() { return 'Normal Interceptor'; }

function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo){
  'use strict';

  // ===== Utils =====
  function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax)*180/Math.PI; }
  function dist(ax,ay,bx,by){ return Math.hypot(bx-ax, by-ay); }
  function tryMove(a){ const seq=[0,15,-15,30,-30,45,-45,60,-60,90]; for(const o of seq){ if(tank.move(a+o)) return true; } return false; }
  function mostThreat(){ let best=null,score=0; for(const b of bulletInfo){ const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-6; const approach=(-(b.vx*dx+b.vy*dy)/d); const s=(approach>0?approach:0)/(d); if(s>score){score=s;best=b;} } return {b:best,s:score}; }
  function evade(b){ const base=Math.atan2(b.vy,b.vx)*180/Math.PI; const l=base+90, r=base-90; const tx=tank.x-b.x, ty=tank.y-b.y; function proj(a){const r=a*Math.PI/180; return Math.cos(r)*tx+Math.sin(r)*ty;} const dir = proj(l)>proj(r)?l:r; return tryMove(dir + (Math.random()*2-1)*8); }
  function pickNearest(list){ if(!list||!list.length) return null; let best=list[0]; for(const e of list){ if(e.distance<best.distance) best=e; } return best; }

  // ===== Behavior =====
  const threat = mostThreat();
  if (threat.b && threat.s>0.002){
    if(!evade(threat.b)){
      const away=angleTo(threat.b.x,threat.b.y,tank.x,tank.y);
      tryMove(away);
    }
  } else {
    // proactive intercept positioning: hover midline
    const midDir = angleTo(tank.x,tank.y,450,300);
    tryMove(midDir + (Math.random()*2-1)*10);
  }

  // Counter-fire when possible
  const tgt = pickNearest(enemies);
  if (tgt){
    const fireDeg = angleTo(tank.x,tank.y,tgt.x,tgt.y) + (Math.random()*2-1)*3;
    tank.fire(fireDeg);
  }
}

