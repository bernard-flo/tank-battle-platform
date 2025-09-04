// Tanker Guardian v1 — 선두 방패, 중앙 정렬, 근접 위협 제어
function name() { return 'Tanker Guardian'; }
function type() { return Type.TANKER; }

// 내부 상태(플랫폼 샌드박스 내 로컬)
const _state = { orbitSign: 1, jitter: 0, frames: 0 };

// 유틸
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function normAngle(a) { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; }
function leadAngle(src, dst, vBullet) {
  // 간단한 리드샷: dst에 vx,vy 있으면 사용
  const dx = dst.x - src.x, dy = dst.y - src.y;
  const dvx = (dst.vx || 0), dvy = (dst.vy || 0);
  const a = dvx*dvx + dvy*dvy - vBullet*vBullet;
  const b = 2*(dx*dvx + dy*dvy);
  const c = dx*dx + dy*dy;
  let t = 0;
  const disc = b*b - 4*a*c;
  if (Math.abs(a) < 1e-6) t = -c / (b || -1); else if (disc >= 0) {
    const t1 = (-b + Math.sqrt(disc)) / (2*a);
    const t2 = (-b - Math.sqrt(disc)) / (2*a);
    t = Math.max(t1, t2);
  }
  if (!isFinite(t) || t < 0) t = 0;
  const tx = dst.x + dvx * t, ty = dst.y + dvy * t;
  return Math.atan2(ty - src.y, tx - src.x);
}

function pickTarget(tank, enemies) {
  // 우선순위: 가까움 → 체력낮음 → 중앙가까움
  if (!enemies || enemies.length === 0) return null;
  const cx = (typeof WIDTH !== 'undefined' ? WIDTH/2 : 400);
  const cy = (typeof HEIGHT !== 'undefined' ? HEIGHT/2 : 300);
  enemies = enemies.slice();
  enemies.sort((e1, e2) => {
    const d1 = dist(tank, e1), d2 = dist(tank, e2);
    if (Math.abs(d1 - d2) > 5) return d1 - d2;
    const h1 = e1.hp ?? 100, h2 = e2.hp ?? 100;
    if (h1 !== h2) return h1 - h2;
    const c1 = Math.hypot(e1.x - cx, e1.y - cy), c2 = Math.hypot(e2.x - cx, e2.y - cy);
    return c1 - c2;
  });
  return enemies[0];
}

function mostThreatBullet(tank, bullets) {
  if (!bullets || bullets.length === 0) return null;
  let best = null, bestScore = -Infinity;
  for (const b of bullets) {
    const relx = b.x - tank.x, rely = b.y - tank.y;
    const d = Math.hypot(relx, rely) + 1e-3;
    const v = Math.hypot(b.vx, b.vy) + 1e-3;
    const approaching = -(relx*b.vx + rely*b.vy) / (d*v); // cos(theta) 부호로 접근성
    const score = approaching * (1.0 / d);
    if (score > bestScore) { bestScore = score; best = b; }
  }
  return best;
}

function perpendicularEscapeAngle(tank, bullet) {
  const ang = Math.atan2(bullet.vy, bullet.vx);
  // 수직(±90°) 중 가까운 쪽, 작은 랜덤 오프셋
  const base = ang + (Math.random() < 0.5 ? Math.PI/2 : -Math.PI/2);
  return base + (Math.random() - 0.5) * (Math.PI / 24);
}

function wallAvoidAngle(tank, desired) {
  // 벽 근접 시 평행 슬라이딩 유도
  const W = (typeof WIDTH !== 'undefined' ? WIDTH : 800);
  const H = (typeof HEIGHT !== 'undefined' ? HEIGHT : 600);
  const margin = 30;
  let a = desired;
  if (tank.x < margin) a = 0; else if (tank.x > W - margin) a = Math.PI;
  if (tank.y < margin) a = Math.PI/2; else if (tank.y > H - margin) a = -Math.PI/2;
  return a;
}

function update(tank, enemies, allies, bulletInfo) {
  _state.frames++;
  const PARAM = (typeof PARAMS !== 'undefined' && PARAMS) ? PARAMS : {};
  const BULLET_SPEED = PARAM.bulletSpeed ?? 400;
  const idealRange = PARAM.ideal_range ?? 160;
  const fireEvery = PARAM.fire_every_frames ?? 8; // 쿨 느낌만
  const orbitBias = PARAM.orbit_bias ?? 0.25;

  // 1) 위협 탄 회피 우선
  const threat = mostThreatBullet(tank, bulletInfo);
  if (threat) {
    let ang = perpendicularEscapeAngle(tank, threat);
    ang = wallAvoidAngle(tank, ang);
    let ok = tank.move(ang);
    if (!ok) {
      // ±15° 보정 재시도 (최대 10회 내)
      for (let i = 1; i <= 5 && !ok; i++) {
        ok = tank.move(ang + i * Math.PI/12) || tank.move(ang - i * Math.PI/12);
      }
    }
  } else {
    // 2) 팀 중심에 위치: 아군 평균점으로 정렬, 근접 적 압박
    const target = pickTarget(tank, enemies);
    let moveAng = 0;
    if (allies && allies.length) {
      const cx = allies.reduce((s,a)=>s+a.x, 0) / allies.length;
      const cy = allies.reduce((s,a)=>s+a.y, 0) / allies.length;
      const toCenter = angleTo(tank.x, tank.y, cx, cy);
      if (target) {
        const toEnemy = angleTo(tank.x, tank.y, target.x, target.y);
        // 중앙과 적 방향을 혼합하여 방패 포지션 유지
        moveAng = normAngle(toEnemy * (1 - orbitBias) + toCenter * orbitBias);
      } else moveAng = toCenter;
    } else if (target) moveAng = angleTo(tank.x, tank.y, target.x, target.y);
    moveAng = wallAvoidAngle(tank, moveAng);
    let ok = tank.move(moveAng);
    if (!ok) {
      for (let i = 1; i <= 5 && !ok; i++) {
        ok = tank.move(moveAng + i * Math.PI/12) || tank.move(moveAng - i * Math.PI/12);
      }
    }

    // 거리 유지(근거리)
    if (target) {
      const d = dist(tank, target);
      if (d > idealRange * 1.2) tank.move(angleTo(tank.x, tank.y, target.x, target.y));
      else if (d < idealRange * 0.8) tank.move(angleTo(tank.x, tank.y, target.x, target.y) + Math.PI);
    }
  }

  // 3) 짧은 리드샷, 사격 쿨 관리(프레임 기반)
  if (_state.frames % fireEvery === 0) {
    const target = pickTarget(tank, enemies);
    if (target) {
      const a = angleTo(tank.x, tank.y, target.x, target.y);
      const a2 = a + (_state.jitter * Math.PI/180);
      let fireAngle = a2;
      // 짧은 리드샷: 최대 ±10°
      try {
        const la = leadAngle({x: tank.x, y: tank.y}, target, BULLET_SPEED);
        const delta = clamp(normAngle(la - a), -Math.PI/18, Math.PI/18);
        fireAngle = a + delta;
      } catch(_) {}
      tank.fire(fireAngle);
    }
  }
}
