function name() { return 'Dealer Flanker'; }

function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo){
  'use strict';

  // ===== Utils =====
  function dist(ax,ay,bx,by){ return Math.hypot(bx-ax, by-ay); }
  function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax)*180/Math.PI; }
  function tryMove(a){
    const seq=[0,15,-15,30,-30,45,-45,60,-60,90];
    for(const o of seq){ if(tank.move(a+o)) return true; }
    return false;
  }
  function mostThreatBullet(){
    let best=null,score=0;
    for(const b of bulletInfo){
      const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-6;
      const approach = (-(b.vx*dx + b.vy*dy)/d);
      const s=(approach>0?approach:0)/(d);
      if(s>score){score=s;best=b;}
    }
    return {b:best,s:score};
  }
  function evade(b){
    const base=Math.atan2(b.vy,b.vx)*180/Math.PI;
    const left=base+90,right=base-90;
    const tx=tank.x-b.x, ty=tank.y-b.y;
    function proj(a){const r=a*Math.PI/180;return Math.cos(r)*tx+Math.sin(r)*ty;}
    const dir=proj(left)>proj(right)?left:right;
    return tryMove(dir + (Math.random()*2-1)*10);
  }
  function pickTarget(list){
    if(!list||!list.length) return null;
    let best=list[0];
    for(const e of list){ if(e.distance<best.distance) best=e; }
    return best;
  }
  function nearWall(x,y,margin){ return (x<margin||x>900-margin||y<margin||y>600-margin); }

  // ===== Behavior =====
  const threat=mostThreatBullet();
  if(threat.b && threat.s>0.002){
    if(!evade(threat.b)){
      const away=angleTo(threat.b.x,threat.b.y,tank.x,tank.y);
      tryMove(away);
    }
    // still try to fire at nearest while evading
  }

  const tgt=pickTarget(enemies);
  if(tgt){
    const d=tgt.distance; const toTgt=angleTo(tank.x,tank.y,tgt.x,tgt.y);
    const flip = (Math.random()<0.5?1:-1);
    let moveDir;
    // modulate radius to avoid collisions/walls
    if (nearWall(tank.x,tank.y,50)){
      // slide parallel to nearest wall: choose direction that increases in-bounds
      if (tank.x<50) moveDir=0; else if (tank.x>850) moveDir=180; else if (tank.y<50) moveDir=90; else moveDir=270;
    } else if (d<160){
      moveDir = toTgt + 180; // pull out
    } else if (d>260){
      moveDir = toTgt; // close in a bit
    } else {
      moveDir = toTgt + flip*90; // orbit
    }
    tryMove(moveDir + (Math.random()*2-1)*8);

    // Continuous fire with small offset
    tank.fire(toTgt + (Math.random()*2-1)*4);
  } else {
    // regroup towards center when target missing
    const cdir=angleTo(tank.x,tank.y,450,300);
    tryMove(cdir);
  }
}

