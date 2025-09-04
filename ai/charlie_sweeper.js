function name() {
  return 'Charlie Sweeper';
}

function type() {
  return Type.DEALER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles) { for (let a of angles) if (tank.move(a)) return true; return false; }

  // 탄 위협 평가 공통 함수
  function bestThreat(bullets){
    let best=null, bestScore=1e9;
    for (let b of bullets){
      const rx=b.x-tank.x, ry=b.y-tank.y; const vx=b.vx, vy=b.vy;
      const s2=vx*vx+vy*vy; if (!s2) continue;
      const t=-(rx*vx+ry*vy)/s2; if (t<0 || t>22) continue;
      const cx=rx+vx*t, cy=ry+vy*t; const d=Math.hypot(cx,cy);
      const safe=tank.size/2+8; if (d>safe+8) continue;
      const score=d*0.9 + t*3;
      if (score<bestScore){ bestScore=score; best=b; }
    }
    return best;
  }

  // 적 중심 계산 후 원운동으로 측면 공략
  const ecx = enemies.reduce((s,e)=>s+e.x,0)/enemies.length;
  const ecy = enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
  const toCenter = Math.atan2(ecy - tank.y, ecx - tank.x) * 180/Math.PI;

  // 최근접 저체력 우선 타깃
  let target = enemies[0];
  for (let e of enemies) {
    const s1 = target.distance + Math.max(0, target.health)*0.02;
    const s2 = e.distance + Math.max(0, e.health)*0.02;
    if (s2 < s1) target = e;
  }
  const toTarget = Math.atan2(target.y - tank.y, target.x - tank.x) * 180/Math.PI;

  // 탄환 회피(개선: TTI 기반)
  let avoided = false;
  const threat = bestThreat(bulletInfo);
  if (threat){
    const ang = Math.atan2(threat.vy,threat.vx)+Math.PI/2;
    const deg = ang*180/Math.PI;
    avoided = tryMove([deg,deg+25,deg-25,deg+45,deg-45]);
  }

  if (!avoided) {
    // 200~280 거리에서 원운동, 너무 가깝다면 이탈
    const d = Math.sqrt((ecx-tank.x)**2 + (ecy-tank.y)**2);
    let orbit = toCenter + 90;
    if (d < 180) orbit = toCenter + 180;
    tryMove([orbit, orbit+20, orbit-20, toTarget, toTarget+180]);
  }

  // 발사: 타깃 조준 + 3점사 산포 중 1발
  const base = toTarget;
  const offsets = [-6, 0, 6];
  tank.fire(base + offsets[Math.floor(Math.random()*offsets.length)]);
}
