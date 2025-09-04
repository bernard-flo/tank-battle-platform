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

  function bestThreat(bullets){
    let best=null, bestScore=1e9;
    for (let b of bullets){
      const rx=b.x-tank.x, ry=b.y-tank.y; const vx=b.vx, vy=b.vy;
      const s2=vx*vx+vy*vy; if (!s2) continue;
      const t=-(rx*vx+ry*vy)/s2; if (t<0 || t>35) continue;
      const cx=rx+vx*t, cy=ry+vy*t; const d=Math.hypot(cx,cy);
      if (d>160) continue;
      const score = d + t*2;
      if (score<bestScore){ bestScore=score; best=b; }
    }
    return best;
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
  let dodged = false; const threat = bestThreat(bulletInfo);
  if (threat) {
    const ang = Math.atan2(threat.vy, threat.vx) + Math.PI/2;
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
