function name() {
  return 'Alpha Bulldozer';
}

function type() {
  return Type.TANKER;
}

function update(tank, enemies, allies, bulletInfo) {
  if (!enemies || enemies.length === 0) return;

  // 유틸: 이동 시 여러 각도 시도
  function tryMove(angles) {
    for (let a of angles) {
      if (tank.move(a)) return true;
    }
    return false;
  }

  // 위협 평가: 최근접 접근 시간(TTI) 기반 위험도 계산
  function bestThreat(bullets){
    let best=null; let bestScore=1e9;
    for (let b of bullets){
      const rx=b.x-tank.x, ry=b.y-tank.y; const vx=b.vx, vy=b.vy;
      const s2=vx*vx+vy*vy; if (s2<=0) continue;
      const t=- (rx*vx+ry*vy)/s2; // 최근접 접근 시간(프레임 단위)
      if (t<0 || t>24) continue; // 0.5초 내 위협만 반응
      const cx=rx+vx*t, cy=ry+vy*t; const d=Math.hypot(cx,cy);
      const safe = tank.size/2 + 10;
      if (d>safe+10) continue; // 충분히 빗나감
      const score = d*0.8 + t*3; // 더 보수적으로 시간 가중
      if (score<bestScore){ bestScore=score; best=b; }
    }
    return best;
  }

  // 목표 선택: 가장 가까운 적 중 체력이 낮은 쪽 가중치
  let target = enemies[0];
  for (let e of enemies) {
    const s1 = target.distance + Math.max(0, target.health) * 0.01;
    const s2 = e.distance + Math.max(0, e.health) * 0.01;
    if (s2 < s1) target = e;
  }

  // 적/아군 중심
  const ecx = enemies.reduce((s, e) => s + e.x, 0) / enemies.length;
  const ecy = enemies.reduce((s, e) => s + e.y, 0) / enemies.length;
  const acx = allies.length ? allies.reduce((s, a) => s + a.x, 0) / allies.length : tank.x;
  const acy = allies.length ? allies.reduce((s, a) => s + a.y, 0) / allies.length : tank.y;

  // 기본 각도: 적 중심으로 전진
  const toEnemyCenter = Math.atan2(ecy - tank.y, ecx - tank.x) * 180 / Math.PI;
  const toTarget = Math.atan2(target.y - tank.y, target.x - tank.x) * 180 / Math.PI;

  // 총알 회피: 접근 중인 탄환이 120 내 근접하면 직교 회피
  let dodged = false;
  const threat = bestThreat(bulletInfo);
  if (threat) {
    const ang = Math.atan2(threat.vy, threat.vx) + Math.PI/2;
    const deg = ang * 180 / Math.PI;
    dodged = tryMove([deg, deg+20, deg-20, deg+40, deg-40]);
  }

  // 탱커 행동: 전면 돌파, 적 중심과 타깃 사이를 압박
  if (!dodged) {
    // 벽/가두기 방지: 필드 중심으로 약한 인력
    const cx = 450, cy = 300;
    const toCenter = Math.atan2(cy - tank.y, cx - tank.x) * 180 / Math.PI;
    const desired = (target.distance > 120) ? toEnemyCenter : toTarget;
    const moveAngles = [desired, desired+15, desired-15, toCenter, desired+35, desired-35];
    tryMove(moveAngles);
  }

  // 발사: 타깃 조준 + 약간의 산포로 방패를 뚫음
  const jitter = (Math.random() - 0.5) * 10; // ±5°
  tank.fire(toTarget + jitter);
}
