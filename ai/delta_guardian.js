function name() {
  return 'Delta Guardian';
}

function type() {
  return Type.NORMAL;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

  // 보호 대상: 아군 중 체력이 가장 낮은 탱크
  let protect = null; let minH = 1e9;
  for (let a of allies) { if (a.health < minH) { minH = a.health; protect = a; } }

  // 적 중심 및 타깃
  const ecx = enemies.reduce((s,e)=>s+e.x,0)/enemies.length;
  const ecy = enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
  let target = enemies[0];
  for (let e of enemies) if (e.distance < target.distance) target = e;
  const toTarget = Math.atan2(target.y - tank.y, target.x - tank.x) * 180/Math.PI;

  // 방패 위치: 보호 대상과 적 중심 사이에 서기
  let desired = toTarget;
  if (protect) {
    const midx = (protect.x + ecx)/2, midy = (protect.y + ecy)/2;
    desired = Math.atan2(midy - tank.y, midx - tank.x) * 180/Math.PI;
  }

  // 탄 회피(짧게)
  let dodged = false;
  for (let b of bulletInfo) {
    const dx=b.x-tank.x, dy=b.y-tank.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if (dist<120 && (dx*b.vx+dy*b.vy)<0) {
      const ang = Math.atan2(b.vy,b.vx) + Math.PI/2;
      const deg = ang*180/Math.PI;
      dodged = tryMove([deg, deg+20, deg-20]);
      if (dodged) break;
    }
  }

  if (!dodged) {
    tryMove([desired, desired+20, desired-20, toTarget]);
  }

  // 사격: 타깃 고정, 근거리 가산점
  const jitter = (Math.random()-0.5)*6;
  tank.fire(toTarget + jitter);
}

