function name() {
  return 'Bravo Striker';
}

function type() {
  return Type.DEALER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;

  function tryMove(angles) {
    for (let a of angles) { if (tank.move(a)) return true; }
    return false;
  }

  // 목표: 가장 가까운 적
  let nearest = enemies[0];
  for (let e of enemies) if (e.distance < nearest.distance) nearest = e;

  const toEnemy = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;

  // 거리 유지형 카이팅: 160~260 사이 유지 + 원운동
  const desiredRange = 210;
  const err = nearest.distance - desiredRange;
  // 각도: 기본은 수직(스트레이프), 거리 오차로 가감
  let strafe = toEnemy + 90 * (Math.random() < 0.5 ? 1 : -1);
  if (Math.abs(err) > 40) {
    // 너무 가깝다면 반대 방향, 너무 멀다면 접근
    strafe = (err < 0) ? (toEnemy + 180) : toEnemy;
  }

  // 탄 회피 우선
  let dodged = false; let best = null; let bestScore = 1e9;
  for (let b of bulletInfo) {
    const dx = b.x - tank.x, dy = b.y - tank.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 140) continue;
    const dot = dx*b.vx + dy*b.vy; // 접근 중이면 dot<0
    if (dot >= 0) continue;
    const approach = -dot/(dist+1e-6);
    const score = dist - approach;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  if (best) {
    const ang = Math.atan2(best.vy, best.vx) + Math.PI/2;
    const deg = ang*180/Math.PI;
    dodged = tryMove([deg, deg+20, deg-20, deg+40, deg-40]);
  }

  if (!dodged) {
    tryMove([strafe, strafe+20, strafe-20, toEnemy, toEnemy+180]);
  }

  // 발사: 근거리면 직사, 원거리면 소량 선행(적이 나를 향해 온다고 가정)
  const lead = Math.min(18, Math.max(-18, (nearest.distance/12))); // 거리 기반 소폭 선행
  tank.fire(toEnemy + (err>0? (lead*0.3) : 0));
}

