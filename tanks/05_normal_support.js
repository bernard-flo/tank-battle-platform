function name() { return 'Normal Support'; }

function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo){
  'use strict';

  // ===== Utils =====
  function dist(ax,ay,bx,by){ return Math.hypot(bx-ax, by-ay); }
  function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax)*180/Math.PI; }
  function tryMove(a){ const seq=[0,15,-15,30,-30,45,-45,60,-60,90]; for(const o of seq){ if(tank.move(a+o)) return true; } return false; }
  function mostThreat(){ let best=null,score=0; for(const b of bulletInfo){ const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-6; const approach=(-(b.vx*dx+b.vy*dy)/d); const s=(approach>0?approach:0)/d; if(s>score){score=s;best=b;} } return {b:best,s:score}; }
  function evade(b){ const base=Math.atan2(b.vy,b.vx)*180/Math.PI; const l=base+90, r=base-90; const tx=tank.x-b.x, ty=tank.y-b.y; function proj(a){const r=a*Math.PI/180; return Math.cos(r)*tx+Math.sin(r)*ty;} const dir=proj(l)>proj(r)?l:r; return tryMove(dir + (Math.random()*2-1)*8); }
  function pickCommonTarget(list){
    if(!list||!list.length) return null;
    const cx=450, cy=300;
    let best=null,bkey=null;
    for(const e of list){
      const key=[Math.round(e.distance), Math.round(e.health), Math.round(dist(e.x,e.y,cx,cy))];
      if(!best || key[0]<bkey[0] || (key[0]===bkey[0] && (key[1]<bkey[1] || (key[1]===bkey[1] && key[2]<bkey[2])))){
        best=e; bkey=key;
      }
    }
    return best;
  }

  // ===== Behavior =====
  const threat=mostThreat();
  if(threat.b && threat.s>0.002){
    if(!evade(threat.b)){
      const away=angleTo(threat.b.x,threat.b.y,tank.x,tank.y);
      tryMove(away);
    }
  }

  // Compute ally centroid
  let ax=0, ay=0, n=0; for(const a of allies){ ax+=a.x; ay+=a.y; n++; }
  const center = n?{x:ax/n,y:ay/n}:{x:450,y:300};

  const tgt = pickCommonTarget(enemies);
  if (tgt){
    const toTgt=angleTo(tank.x,tank.y,tgt.x,tgt.y);
    const d=tgt.distance;
    // Maintain mid range 220-300, and align with allies
    let moveDir;
    if (d<200) moveDir = toTgt+180; else if (d>320) moveDir = toTgt; else moveDir = toTgt + (Math.random()<0.5?90:-90);
    // Blend toward ally center if far from it
    const toCenter = angleTo(tank.x,tank.y,center.x,center.y);
    const farFromPack = dist(tank.x,tank.y,center.x,center.y) > 140;
    if (farFromPack) moveDir = (moveDir*0.4 + toCenter*0.6);
    tryMove(moveDir + (Math.random()*2-1)*6);

    // Focus fire
    tank.fire(toTgt + (Math.random()*2-1)*3);
  } else {
    // No target: regroup to allies
    const dir=angleTo(tank.x,tank.y,center.x,center.y);
    tryMove(dir);
  }
}

