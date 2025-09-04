function name() {
  return 'Delta Guardian';
}

function type() {
  return Type.NORMAL;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

  function bestThreat(bullets){
    let best=null, bestScore=1e9;
    for (let b of bullets){
      const rx=b.x-tank.x, ry=b.y-tank.y; const vx=b.vx, vy=b.vy; const s2=vx*vx+vy*vy; if (!s2) continue;
      const t=-(rx*vx+ry*vy)/s2; if (t<0 || t>22) continue;
      const cx=rx+vx*t, cy=ry+vy*t; const d=Math.hypot(cx,cy);
      const safe=tank.size/2+9; if (d>safe+8) continue;
      const score=d*0.9 + t*3; if (score<bestScore){ bestScore=score; best=b; }
    }
    return best;
  }

  // 보호 대상: 아군 중 체력이 가장 낮은 탱크
  let protect = null; let minH = 1e9;
  for (let a of allies) { if (a.health < minH) { minH = a.health; protect = a; } }

  // 적 중심 및 타깃(팀 집중사격 가이드)
  const ecx = enemies.reduce((s,e)=>s+e.x,0)/enemies.length;
  const ecy = enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
  let target = enemies[0];
  for (let e of enemies) {
    const s1 = Math.max(0, target.health)*1.0 + target.distance*0.1;
    const s2 = Math.max(0, e.health)*1.0 + e.distance*0.1;
    if (s2 < s1) target = e;
  }
  const toTarget = Math.atan2(target.y - tank.y, target.x - tank.x) * 180/Math.PI;

  // 방패 위치: 보호 대상과 적 중심 사이에 서기
  let desired = toTarget;
  if (protect) {
    const midx = (protect.x + ecx)/2, midy = (protect.y + ecy)/2;
    desired = Math.atan2(midy - tank.y, midx - tank.x) * 180/Math.PI;
  }

  // 탄 회피(개선)
  let dodged = false;
  const threat = bestThreat(bulletInfo);
  if (threat){
    const ang = Math.atan2(threat.vy,threat.vx)+Math.PI/2;
    const deg = ang*180/Math.PI;
    dodged = tryMove([deg, deg+20, deg-20, deg+35, deg-35]);
  }

  if (!dodged) {
    tryMove([desired, desired+20, desired-20, toTarget]);
  }

  // 사격: 타깃 고정, 근거리 가산점
  const jitter = (Math.random()-0.5)*6;
  tank.fire(toTarget + jitter);
}
