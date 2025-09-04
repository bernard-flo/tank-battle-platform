function name() {
  return 'Golf Anchor';
}

function type() {
  return Type.TANKER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

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

  // 탄환 회피(무거운 탱커는 최소 회피)
  let avoided = false;
  for (let b of bulletInfo) {
    const dx=b.x-tank.x, dy=b.y-tank.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if (dist<110 && (dx*b.vx+dy*b.vy)<0) {
      const deg = (Math.atan2(b.vy,b.vx)+Math.PI/2)*180/Math.PI;
      avoided = tryMove([deg,deg+20,deg-20]);
      break;
    }
  }
  if (!avoided) tryMove([ang, ang+15, ang-15, toFront]);

  // 타깃: 가장 가까운 적에게 지속 압박
  let nearest = enemies[0];
  for (let e of enemies) if (e.distance < nearest.distance) nearest = e;
  const toEnemy = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180/Math.PI;
  const jitter = (Math.random()-0.5)*8;
  tank.fire(toEnemy + jitter);
}

