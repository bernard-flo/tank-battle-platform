function name() { return 'Tanker Guardian'; }
function type() { return Type.TANKER; }

// 내부 유틸과 기본 파라미터(PLATFORM에 PARAMS 주입 시 이를 우선 사용)
function update(tank, enemies, allies, bulletInfo) {
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const WIDTH = P.WIDTH ?? 800;
  const HEIGHT = P.HEIGHT ?? 600;
  const SAFE_M = P.safeMargin ?? 24;
  const BULLET_SPD = P.bulletSpeed ?? 400; // 플랫폼 엔진 단위에 맞춰 자동 보정됨(미주입 시 기본치)
  const LEAD_CLAMP = (P.leadMaxDeg ?? 20) * Math.PI / 180;
  const REACT_DIST = P.evadeReactDist ?? 180;

  // --- 유틸 ---
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const normAng = (a) => {
    while (a>Math.PI) a-=2*Math.PI; while (a<-Math.PI) a+=2*Math.PI; return a;
  };
  function leadAngle(src, dst, proj) {
    // dst: {x,y,vx,vy}, proj: 속도(절대치)
    const rx = dst.x - src.x, ry = dst.y - src.y;
    const dvx = dst.vx || 0, dvy = dst.vy || 0;
    const a = dvx*dvx + dvy*dvy - proj*proj;
    const b = 2*(rx*dvx + ry*dvy);
    const c = rx*rx + ry*ry;
    let t; // 교차 시간 중 양의 해
    if (Math.abs(a) < 1e-6) {
      t = (Math.abs(b) < 1e-6) ? 0 : clamp(-c/b, 0, 1.0);
    } else {
      const disc = b*b - 4*a*c;
      if (disc < 0) t = 0; else {
        const s = Math.sqrt(disc);
        const t1 = (-b - s) / (2*a);
        const t2 = (-b + s) / (2*a);
        t = Math.max(0, Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2));
      }
    }
    const tx = dst.x + (dst.vx||0)*t;
    const ty = dst.y + (dst.vy||0)*t;
    let ang = Math.atan2(ty - src.y, tx - src.x);
    // 과한 리드 제한
    const base = Math.atan2(dst.y - src.y, dst.x - src.x);
    ang = base + clamp(normAng(ang - base), -LEAD_CLAMP, LEAD_CLAMP);
    return ang;
  }

  function tryMoveAngle(theta) {
    // 벽 충돌 회피: 가장자리에서 안쪽으로 살짝 보정
    const nx = tank.x + Math.cos(theta)*10;
    const ny = tank.y + Math.sin(theta)*10;
    let adj = theta;
    if (nx < SAFE_M) adj = 0; // 오른쪽으로
    else if (nx > WIDTH - SAFE_M) adj = Math.PI; // 왼쪽으로
    if (ny < SAFE_M) adj = Math.PI/2; // 아래로
    else if (ny > HEIGHT - SAFE_M) adj = -Math.PI/2; // 위로
    tank.move(adj);
  }

  function mostThreatBullet() {
    if (!bulletInfo || !bulletInfo.length) return null;
    let best = null, bestScore = 0;
    for (const b of bulletInfo) {
      const dx = tank.x - b.x, dy = tank.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d > REACT_DIST) continue;
      const rvx = (b.vx||0) - (tank.vx||0);
      const rvy = (b.vy||0) - (tank.vy||0);
      const along = (dx*rvx + dy*rvy) / (d+1e-6); // 접근 속도(양수면 접근)
      const score = Math.max(0, along) * (1/(d+1));
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  // 팀 중심 근처 유지: 아군 중심점으로 이동하는 성향
  let cx = WIDTH/2, cy = HEIGHT/2;
  if (allies && allies.length) {
    let sx = 0, sy = 0;
    for (const a of allies) { sx += a.x; sy += a.y; }
    cx = sx / allies.length; cy = sy / allies.length;
  }

  // 1) 탄 회피 우선(보스턴 회피: 탄 궤적 수직 이동)
  const threat = mostThreatBullet();
  if (threat) {
    const ang = Math.atan2(threat.vy||0, threat.vx||0);
    // 가깝고 접근이면 수직으로 회피. 더 멀거나 애매하면 팀 중심 쪽으로 살짝 가중
    const relx = tank.x - threat.x, rely = tank.y - threat.y;
    const side = Math.sign(relx*Math.sin(ang) - rely*Math.cos(ang)) || 1; // 외적 부호
    let evade = ang + side * Math.PI/2; // 수직
    // 재시도(±15도씩 최대 10회)
    const step = 15*Math.PI/180;
    let ok = false;
    for (let i=0;i<10;i++) {
      tryMoveAngle(evade);
      ok = true; // 플랫폼에서 실패 반환이 없으므로 시도 자체로 간주
      if (ok) break;
      evade += ((i%2)?1:-1)*step;
    }
  } else {
    // 2) 팀 중심을 기준으로 선두 방패 역할(중앙 쪽을 보며 위치 조정)
    const toCenter = angleTo(tank.x, tank.y, cx, cy);
    tryMoveAngle(toCenter);
  }

  // 3) 타겟팅: 최근접 적 우선, 체력 낮음 보정, 중앙 근접 보정
  if (enemies && enemies.length) {
    const sorted = enemies.slice().sort((a,b)=>{
      const da = dist(tank,a), db = dist(tank,b);
      if (Math.abs(da-db) > 1e-3) return da-db;
      const ha = (a.hp ?? 1000), hb = (b.hp ?? 1000);
      if (ha !== hb) return ha - hb;
      const ca = Math.hypot(a.x-WIDTH/2, a.y-HEIGHT/2);
      const cb = Math.hypot(b.x-WIDTH/2, b.y-HEIGHT/2);
      return ca - cb;
    });
    const tgt = sorted[0];
    const fireAng = leadAngle(tank, tgt, BULLET_SPD*1.0);
    tank.fire(fireAng + ((Math.random()-0.5)* (P.aimJitterDeg ?? 2) * Math.PI/180));
  }
}

