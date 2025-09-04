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

  // 목표 선택: 팀 집중사격 — 체력 가중 증가, 거리 타이브레이크
  let target = enemies[0];
  for (let e of enemies) {
    const s1 = Math.max(0, target.health) * 0.75 + target.distance * 0.2;
    const s2 = Math.max(0, e.health) * 0.75 + e.distance * 0.2;
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

  // 총알 회피: 접근 중인 탄환이 근접하면 직교 회피(각도 다양화)
  let dodged = false;
  const threat = bestThreat(bulletInfo);
  if (threat) {
    const ang = Math.atan2(threat.vy, threat.vx) + Math.PI/2;
    const deg = ang * 180 / Math.PI;
    dodged = tryMove([deg, deg+25, deg-25, deg+45, deg-45, deg+160, deg-160]);
  }

  // 탱커 행동: 전면 돌파, 적 중심과 타깃 사이 압박 + 가장자리 복구
  if (!dodged) {
    // 벽/가두기 방지: 필드 중심으로 약한 인력
    const cx = 450, cy = 300;
    const toCenter = Math.atan2(cy - tank.y, cx - tank.x) * 180 / Math.PI;
    const desired = (target.distance > 120) ? toEnemyCenter : toTarget;
    // 가장자리에 가까우면 우선 중심 복귀
    const nearEdge = (tank.x<80||tank.x>820||tank.y<70||tank.y>530);
    const moveAngles = nearEdge
      ? [toCenter, toCenter+20, toCenter-20, desired]
      : [desired, desired+15, desired-15, toCenter, desired+35, desired-35];
    tryMove(moveAngles);
  }

  // 발사: 타깃 조준 + 소량 산포, 근거리 더 정밀
  const spread = target.distance > 160 ? 9 : 5;
  const jitter = (Math.random() - 0.5) * spread; // ±스프레드/2
  tank.fire(toTarget + jitter);
}
