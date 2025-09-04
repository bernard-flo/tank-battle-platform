function name() {
  return 'Foxtrot Sniper';
}

function type() {
  return Type.DEALER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;
  function tryMove(angles){ for (let a of angles) if (tank.move(a)) return true; return false; }

  // 최저 체력 타깃 스나이핑
  let target = enemies[0];
  for (let e of enemies) if (e.health < target.health) target = e;
  const toTarget = Math.atan2(target.y - tank.y, target.x - tank.x) * 180/Math.PI;

  // 초장거리 유지: 240 이상 유지, 근접 시 즉시 이탈
  const desired = 260;
  const err = target.distance - desired;
  let ang = toTarget + 90*(Math.random()<0.5?1:-1);
  if (err < -40) ang = toTarget + 180; // 너무 가까움 -> 도주
  if (err > 80)  ang = toTarget;      // 너무 멀다 -> 접근
  tryMove([ang, ang+20, ang-20, toTarget+180]);

  // 발사: 미세 산포 + 헤드온 가정 선행
  const lead = Math.min(22, Math.max(-22, target.distance/10));
  const jitter = (Math.random()-0.5)*4;
  tank.fire(toTarget + (err>0? lead*0.2 : 0) + jitter);
}

