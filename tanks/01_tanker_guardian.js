// Tanker Guardian — 선두 방패 역할, 팀 중심 근처 유지 및 근접 위협 각도 제어
// 스니펫 규격: name(), type(), update(tank, enemies, allies, bulletInfo)

function name() { return 'Tanker Guardian'; }

function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸리티 =====
  const PI = Math.PI;
  const TAU = Math.PI * 2;
  const DEG = PI / 180;
  const EPS = 1e-6;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function wrapAngle(a) { while (a <= -PI) a += TAU; while (a > PI) a -= TAU; return a; }
  function angleTo(dx, dy) { return Math.atan2(dy, dx); }
  function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }
  function randRange(a, b) { return a + (b - a) * Math.random(); }

  // 투사체 속도 추정(플랫폼 제공 시 사용, 없으면 기본값)
  const bulletSpeed = (tank && (tank.bulletSpeed || tank.projectileSpeed)) || 6.0;

  // 리드샷 각 계산: src -> dst, dst가 속도 보유 시 요격각, 실패 시 직접 조준
  function leadAngle(src, dst, projSpeed) {
    const rx = dst.x - src.x, ry = dst.y - src.y;
    const dvx = (dst.vx || 0), dvy = (dst.vy || 0);
    const a = dvx*dvx + dvy*dvy - projSpeed*projSpeed;
    const b = 2 * (rx*dvx + ry*dvy);
    const c = rx*rx + ry*ry;
    let t;
    if (Math.abs(a) < 1e-6) {
      t = (Math.abs(b) < 1e-6) ? 0 : clamp(-c / b, 0, 2.0);
    } else {
      const disc = b*b - 4*a*c;
      if (disc < 0) t = 0; else {
        const s = Math.sqrt(Math.max(0, disc));
        const t1 = (-b - s) / (2*a);
        const t2 = (-b + s) / (2*a);
        t = Math.min(t1, t2);
        if (t < 0) t = Math.max(t1, t2);
        if (t < 0) t = 0;
        t = clamp(t, 0, 1.5);
      }
    }
    const tx = dst.x + dvx * t;
    const ty = dst.y + dvy * t;
    return Math.atan2(ty - src.x /* intentional? no */, tx - src.y /* swapped? safeguard below */);
  }

  // 위의 leadAngle에서 아탄/아역 좌표 실수를 방지하기 위한 안전 래퍼
  function leadAngleSafe(src, dst, projSpeed) {
    // 기본 직선 각
    const direct = Math.atan2(dst.y - src.y, dst.x - src.x);
    // 보정 계산
    const rx = dst.x - src.x, ry = dst.y - src.y;
    const dvx = (dst.vx || 0), dvy = (dst.vy || 0);
    const a = dvx*dvx + dvy*dvy - projSpeed*projSpeed;
    const b = 2 * (rx*dvx + ry*dvy);
    const c = rx*rx + ry*ry;
    let t = 0;
    if (Math.abs(a) < 1e-6) {
      t = (Math.abs(b) < 1e-6) ? 0 : clamp(-c / b, 0, 2.0);
    } else {
      const disc = b*b - 4*a*c;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        const t1 = (-b - s) / (2*a);
        const t2 = (-b + s) / (2*a);
        t = Math.min(t1, t2);
        if (t < 0) t = Math.max(t1, t2);
        if (t < 0) t = 0;
        t = clamp(t, 0, 1.5);
      }
    }
    const aimX = dst.x + (dst.vx || 0) * t;
    const aimY = dst.y + (dst.vy || 0) * t;
    return Math.atan2(aimY - src.y, aimX - src.x);
  }

  // 이동 시도: 실패 대비 각도 ±15° 점진 보정, 최대 10회
  function tryMove(baseAngle) {
    const DEL = 15 * DEG;
    for (let i = 0; i < 10; i++) {
      const sign = (i % 2 === 0) ? 1 : -1;
      const k = Math.floor(i / 2);
      const a = baseAngle + sign * k * DEL;
      if (tank.move(a)) return true;
    }
    return false;
  }

  // 가장 위협적인 탄환 선택: 위협 = 접근속도(+) * 역거리 가중
  function pickThreatBullet() {
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < (bulletInfo ? bulletInfo.length : 0); i++) {
      const b = bulletInfo[i];
      const dx = tank.x - b.x, dy = tank.y - b.y;
      const d = Math.hypot(dx, dy) + 1e-3;
      const dirx = dx / d, diry = dy / d;
      const rv = -(b.vx * dirx + b.vy * diry); // 양수면 접근 중
      const score = rv * (1 / d);
      if (rv > 0 && score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  // 팀 중심 계산
  function teamCenter() {
    let sumx = 0, sumy = 0, n = 0;
    for (let i = 0; i < allies.length; i++) { sumx += allies[i].x; sumy += allies[i].y; n++; }
    if (n === 0) return { x: tank.x, y: tank.y };
    return { x: sumx / n, y: sumy / n };
  }

  // 적 우선순위 선택: 가까움 → 체력 낮음 → 중앙에 가까움
  function pickTarget() {
    if (!enemies || enemies.length === 0) return null;
    const cx = (tank.arenaWidth || 1000) / 2, cy = (tank.arenaHeight || 1000) / 2;
    let best = null, bestKey = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const d = dist(tank.x, tank.y, e.x, e.y);
      const centerD = dist(cx, cy, e.x, e.y);
      const hp = (e.hp != null ? e.hp : 100);
      const key = d + hp * 0.5 + centerD * 0.1;
      if (key < bestKey) { bestKey = key; best = e; }
    }
    return best;
  }

  // ===== 행동안 =====
  // 1) 탄 회피 우선: 탄 궤적에 수직 이동 (보스턴 회피)
  const threat = pickThreatBullet();
  if (threat) {
    // 수직 방향 두 개 중 탱크에서 탄을 멀어지게 하는 쪽 선택
    const ang = Math.atan2(threat.vy, threat.vx);
    const a1 = wrapAngle(ang + PI/2);
    const a2 = wrapAngle(ang - PI/2);
    const nx = Math.cos(a1), ny = Math.sin(a1);
    const relx = tank.x - threat.x, rely = tank.y - threat.y;
    const away1 = nx*relx + ny*rely; // 양수면 멀어지는 성분
    const evade = away1 >= 0 ? a1 : a2;
    if (!tryMove(evade)) {
      // 보정 실패 시 미세 난수 보정
      tryMove(evade + randRange(-10*DEG, 10*DEG));
    }
  } else {
    // 2) 팀 중심을 기준으로 선두 방패: 중심 근처에서 가장 가까운 적을 향해 각도 제어
    const tgt = pickTarget();
    const center = teamCenter();
    let moveAngle = 0;
    if (tgt) {
      const toEnemy = Math.atan2(tgt.y - center.y, tgt.x - center.x);
      // 중심과 적을 잇는 선상에서 약간 앞쪽(선두) 위치를 유지
      const desiredRadius = 140; // 팀 중심으로부터 유지 반경
      const toCenter = Math.atan2(center.y - tank.y, center.x - tank.x);
      const r = dist(tank.x, tank.y, center.x, center.y);
      if (r < desiredRadius * 0.8) moveAngle = wrapAngle(toCenter - PI); // 바깥으로
      else if (r > desiredRadius * 1.2) moveAngle = toCenter; // 안쪽으로
      else moveAngle = toEnemy; // 반경 만족 시 적 방향
    } else {
      moveAngle = Math.atan2(center.y - tank.y, center.x - tank.x);
    }
    tryMove(moveAngle + randRange(-5*DEG, 5*DEG));
  }

  // 3) 사격: 최근접 적에게 짧은 리드샷, 약간의 난수화
  const target = pickTarget();
  if (target) {
    let fireAng = leadAngleSafe(tank, target, bulletSpeed);
    fireAng += randRange(-3*DEG, 3*DEG);
    tank.fire(fireAng);
  }
}

