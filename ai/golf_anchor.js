function name() {
  return 'Golf Anchor';
}

function type() {
  return Type.TANKER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

  function bestThreat(bullets){
    let best=null, bestScore=1e9;
    for (let b of bullets){
      const rx=b.x-tank.x, ry=b.y-tank.y; const vx=b.vx, vy=b.vy; const s2=vx*vx+vy*vy; if (!s2) continue;
      const t=-(rx*vx+ry*vy)/s2; if (t<0 || t>20) continue;
      const cx=rx+vx*t, cy=ry+vy*t; const d=Math.hypot(cx,cy);
      const safe=tank.size/2+10; if (d>safe+6) continue;
      const score=d*0.9 + t*3.2; if (score<bestScore){ bestScore=score; best=b; }
    }
    return best;
  }

  // 팀 앵커: 중앙을 장악하며 라인 유지
  const ecx = enemies.reduce((s,e)=>s+e.x,0)/enemies.length;
  const ecy = enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
  const acx = allies.length ? allies.reduce((s,a)=>s+a.x,0)/allies.length : tank.x;
  const acy = allies.length ? allies.reduce((s,a)=>s+a.y,0)/allies.length : tank.y;

  const frontX = (acx*2 + ecx)/3; // 아군쪽에 더 가까운 전방선
  const frontY = (acy*2 + ecy)/3;
  const toFront = Math.atan2(frontY - tank.y, frontX - tank.x) * 180/Math.PI;

  // 라인 유지: 너무 뒤면 전진, 너무 앞이면 측면
  const df = Math.sqrt((frontX-tank.x)**2 + (frontY-tank.y)**2);
  let ang = toFront;
  if (df < 120) ang = toFront + 90; // 충분히 전진 -> 측면 유지

  // 탄환 회피(무거운 탱커이므로 보수적 범위)
  let avoided = false;
  const threat = bestThreat(bulletInfo);
  if (threat){
    const deg = (Math.atan2(threat.vy,threat.vx)+Math.PI/2)*180/Math.PI;
    avoided = tryMove([deg,deg+20,deg-20,deg+35,deg-35]);
  }
  if (!avoided) tryMove([ang, ang+15, ang-15, toFront]);

  // 타깃: 팀 집중사격 — 저체력 우선
  let nearest = enemies[0];
  for (let e of enemies) {
    const s1 = Math.max(0, nearest.health)*1.0 + nearest.distance*0.1;
    const s2 = Math.max(0, e.health)*1.0 + e.distance*0.1;
    if (s2 < s1) nearest = e;
  }
  const toEnemy = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180/Math.PI;
  const jitter = (Math.random()-0.5)*8;
  tank.fire(toEnemy + jitter);
}
