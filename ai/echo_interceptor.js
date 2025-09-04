function name() {
  return 'Echo Interceptor';
}

function type() {
  return Type.NORMAL;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

  // 위협도 높은 탄환 우선 회피(TTI 기반: 근접·단기 위협만)
  let threat = null; let best = 1e9;
  for (let b of bulletInfo){
    const rx=b.x-tank.x, ry=b.y-tank.y; const vx=b.vx, vy=b.vy; const s2=vx*vx+vy*vy; if (!s2) continue;
    const t=-(rx*vx+ry*vy)/s2; if (t<0 || t>24) continue;
    const cx=rx+vx*t, cy=ry+vy*t; const d=Math.hypot(cx,cy);
    const safe=tank.size/2+8; if (d>safe+10) continue;
    const score = d*0.85 + t*3; if (score<best){ best=score; threat=b; }
  }
  if (threat){
    const ang = Math.atan2(threat.vy, threat.vx) + Math.PI/2;
    const deg = ang*180/Math.PI;
    if (!tryMove([deg,deg+25,deg-25,deg+45,deg-45])) {
      tryMove([deg+180, deg+160, deg-160]);
    }
  } else {
    // 위협 없을 때: 적 중심을 향해 좌/우 스트레이프하며 간격 유지
    const ecx = enemies.reduce((s,e)=>s+e.x,0)/enemies.length;
    const ecy = enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
    const toC = Math.atan2(ecy - tank.y, ecx - tank.x) * 180/Math.PI;
    const dist = Math.sqrt((ecx-tank.x)**2 + (ecy-tank.y)**2);
    let ang = toC + (dist<220 ? 180 : 90)*(Math.random()<0.5?1:-1);
    tryMove([ang, ang+20, ang-20, toC]);
  }

  // 타깃: 팀 집중사격 — 저체력 우선
  let nearest = enemies[0];
  for (let e of enemies) {
    const s1 = Math.max(0, nearest.health)*1.0 + nearest.distance*0.1;
    const s2 = Math.max(0, e.health)*1.0 + e.distance*0.1;
    if (s2 < s1) nearest = e;
  }
  const toEnemy = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180/Math.PI;
  tank.fire(toEnemy);
}
