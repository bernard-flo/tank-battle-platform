function name() { return 'Dealer Sniper'; }

function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo){
  'use strict';

  // ===== Utils =====
  function dist(ax,ay,bx,by){ return Math.hypot(bx-ax, by-ay); }
  function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax)*180/Math.PI; }
  function tryMove(base){
    const seq = [0, 20, -20, 40, -40, 60, -60, 80, -80, 100];
    for (let o of seq){ if (tank.move(base+o)) return true; }
    return false;
  }
  function mostThreatBullet(){
    let best=null, score=0;
    for (const b of bulletInfo){
      const dx=tank.x-b.x, dy=tank.y-b.y, d=Math.hypot(dx,dy)+1e-6;
      const approach = (-(b.vx*dx + b.vy*dy)/d);
      const s = (approach>0?approach:0)/(d);
      if (s>score){ score=s; best=b; }
    }
    return {b:best, s:score};
  }
  function evade(b){
    const base = Math.atan2(b.vy,b.vx)*180/Math.PI;
    const left = base+90, right=base-90;
    const toTankX=tank.x-b.x, toTankY=tank.y-b.y;
    function proj(a){ const r=a*Math.PI/180; return Math.cos(r)*toTankX+Math.sin(r)*toTankY; }
    const dir = proj(left)>proj(right)?left:right;
    return tryMove(dir + (Math.random()*2-1)*10);
  }
  function pickLowestHP(list){
    if (!list||!list.length) return null;
    let best=list[0];
    for (const e of list){ if (e.health<best.health || (e.health===best.health && e.distance<best.distance)) best=e; }
    return best;
  }

  // ===== Behavior =====
  const threat = mostThreatBullet();
  if (threat.b && threat.s>0.002){
    if(!evade(threat.b)){
      const away = angleTo(threat.b.x,threat.b.y,tank.x,tank.y);
      tryMove(away);
    }
  } else {
    // Kiting/orbiting around target
    const tgt = pickLowestHP(enemies);
    if (tgt){
      // Keep long distance ~350-420
      const d = tgt.distance;
      const toTgt = angleTo(tank.x,tank.y,tgt.x,tgt.y);
      let moveDir;
      if (d < 280) moveDir = toTgt + 180; // back off
      else if (d > 450) moveDir = toTgt; // close in slightly
      else {
        // orbit with large radius
        const sign = Math.random()<0.5?1:-1;
        moveDir = toTgt + sign*90;
      }
      tryMove(moveDir + (Math.random()*2-1)*6);

      // Fire with slight jitter (bullet speed 8)
      const fireDeg = toTgt + (Math.random()*2-1)*3;
      tank.fire(fireDeg);
    } else {
      // No target: drift towards arena center to gain vision
      const centerDir = angleTo(tank.x,tank.y,450,300);
      tryMove(centerDir + (Math.random()*2-1)*10);
    }
  }
}

