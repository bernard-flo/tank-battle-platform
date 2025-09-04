function name() {
  return 'Echo Interceptor';
}

function type() {
  return Type.NORMAL;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

  // 위협도 높은 탄환 우선 회피 -> 역선회
  let threat = null; let best = 1e9;
  for (let b of bulletInfo) {
    const dx=b.x-tank.x, dy=b.y-tank.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if (dist>160) continue;
    const dot = dx*b.vx + dy*b.vy;
    if (dot>=0) continue;
    const approach = -dot/(dist+1e-6);
    const score = dist - 1.2*approach;
    if (score<best){best=score; threat=b;}
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

  // 타깃: 가장 가까운 적
  let nearest = enemies[0];
  for (let e of enemies) if (e.distance < nearest.distance) nearest = e;
  const toEnemy = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180/Math.PI;
  tank.fire(toEnemy);
}

