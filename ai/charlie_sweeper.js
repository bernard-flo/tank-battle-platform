function name() {
  return 'Charlie Sweeper';
}

function type() {
  return Type.DEALER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles) { for (let a of angles) if (tank.move(a)) return true; return false; }

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

  // 탄환 회피(간단)
  let avoided = false;
  for (let b of bulletInfo) {
    const dx=b.x-tank.x, dy=b.y-tank.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if (dist<130 && (dx*b.vx+dy*b.vy)<0) {
      const ang = Math.atan2(b.vy,b.vx) + Math.PI/2;
      const deg = ang*180/Math.PI;
      avoided = tryMove([deg,deg+25,deg-25,deg+45,deg-45]);
      if (avoided) break;
    }
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

