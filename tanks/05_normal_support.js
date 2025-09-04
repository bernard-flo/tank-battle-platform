// Normal Support — 아군 중심 보호, 포커스 파이어 동조, 중거리 유지
function name() { return 'Normal Support'; }
function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  "use strict";
  // ===== 유틸 =====
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const tryMove = (ang) => { const ds=[0,15,-15,30,-30,45,-45,60,-60,90]; for (const d of ds){ if (tank.move(norm(ang+d))) return true; } return false; };
  const hash = (v) => Math.abs(Math.sin(v * 0.001));

  // ===== 팀 중심 계산 =====
  let ax = tank.x, ay = tank.y, n = 1;
  for (const a of allies) { ax += a.x; ay += a.y; n++; }
  const allyC = { x: ax / n, y: ay / n };

  // ===== 공통 타겟 선정(동일 규칙) =====
  // 규칙: f = (팀중심과의 거리) + w*health, w=0.15 — 최소값을 선택
  let target = null; let bestF = Infinity;
  for (const e of enemies) {
    const dC = Math.hypot(e.x - allyC.x, e.y - allyC.y);
    const f = dC + (P.focus_health_weight ?? 0.15) * e.health;
    if (f < bestF) { bestF = f; target = e; }
  }

  // ===== 탄 회피(간단) =====
  let danger = null, best = 0;
  for (const b of bulletInfo) {
    const dx = tank.x - b.x, dy = tank.y - b.y; const d = Math.hypot(dx, dy) + 1e-3;
    const toward = -(b.vx * (dx / d) + b.vy * (dy / d));
    const s = toward > 0 ? toward / d : 0;
    if (s > best) { best = s; danger = b; }
  }
  if (danger) {
    const ba = Math.atan2(danger.vy, danger.vx) * 180 / Math.PI;
    const dx = tank.x - danger.x, dy = tank.y - danger.y;
    const side = (danger.vx * dy - danger.vy * dx) >= 0 ? -1 : 1;
    if (!tryMove(norm(ba + side * 90))) tryMove(norm(ba - side * 90));
  } else {
    // ===== 중거리 유지 =====
    if (target) {
      const d = target.distance;
      const mid = (P.mid_range ?? 220); // 중거리 목표 반경
      const aTo = angleTo(tank.x, tank.y, target.x, target.y);
      const orbit = (hash(tank.x + tank.y + target.x) >= 0.5) ? 1 : -1;

      if (d < mid * 0.85) {
        // 살짝 이탈하며 아군중심과 각 정렬
        const towardAllies = angleTo(tank.x, tank.y, allyC.x, allyC.y);
        tryMove(norm(towardAllies + 160 * orbit));
      } else if (d > mid * 1.2) {
        tryMove(norm(aTo + orbit * 20));
      } else {
        tryMove(norm(aTo + orbit * (P.orbit_deg ?? 85)));
      }

      // 포커스 파이어: 동일 타겟으로 발사
      tank.fire(aTo);
    } else {
      // 타겟 없을 때는 아군 중심 방어 위치로 이동
      const a = angleTo(tank.x, tank.y, allyC.x, allyC.y) + 100;
      tryMove(norm(a));
    }
  }
}
