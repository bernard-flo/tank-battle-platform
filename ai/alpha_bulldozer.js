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
  let closestThreat = null;
  let minThreatScore = 1e9;
  for (let b of bulletInfo) {
    const dx = b.x - tank.x; const dy = b.y - tank.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 150) continue;
    const dot = (dx * b.vx + dy * b.vy);
    if (dot >= 0) continue; // 멀어지는 탄환
    const approach = -dot / (dist + 1e-6);
    const score = dist - approach; // 가까울수록, 접근 강할수록 위험
    if (score < minThreatScore) { minThreatScore = score; closestThreat = b; }
  }
  if (closestThreat) {
    // 위협 벡터에 수직으로 이동
    const ang = Math.atan2(closestThreat.vy, closestThreat.vx) + Math.PI/2;
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

