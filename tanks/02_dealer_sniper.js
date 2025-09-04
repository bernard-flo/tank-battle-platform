// Dealer Sniper — 장거리 정밀 사격, 카이팅 및 회피 우선

function name() { return 'Dealer Sniper'; }

function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸리티 =====
  const PI = Math.PI; const TAU = Math.PI * 2; const DEG = PI / 180;
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
  function wrapAngle(a) { while (a <= -PI) a += TAU; while (a > PI) a -= TAU; return a; }
  function randRange(a, b) { return a + (b - a) * Math.random(); }
  const bulletSpeed = (tank && (tank.bulletSpeed || tank.projectileSpeed)) || 7.0;

  function leadAngle(src, dst, projSpeed) {
    const rx = dst.x - src.x, ry = dst.y - src.y;
    const dvx = (dst.vx || 0), dvy = (dst.vy || 0);
    const a = dvx*dvx + dvy*dvy - projSpeed*projSpeed;
    const b = 2 * (rx*dvx + ry*dvy);
    const c = rx*rx + ry*ry;
    let t = 0;
    if (Math.abs(a) < 1e-6) t = (Math.abs(b) < 1e-6) ? 0 : clamp(-c / b, 0, 2.0);
    else {
      const disc = b*b - 4*a*c; if (disc >= 0) {
        const s = Math.sqrt(disc); let t1 = (-b - s)/(2*a), t2 = (-b + s)/(2*a);
        t = Math.min(t1, t2); if (t < 0) t = Math.max(t1, t2); if (t < 0) t = 0; t = clamp(t, 0, 2.0);
      }
    }
    const ax = dst.x + (dst.vx || 0) * t; const ay = dst.y + (dst.vy || 0) * t;
    return Math.atan2(ay - src.y, ax - src.x);
  }

  function tryMove(base) {
    const step = 15 * DEG; for (let i = 0; i < 10; i++) {
      const s = (i % 2 === 0) ? 1 : -1; const k = Math.floor(i/2);
      const a = base + s * k * step; if (tank.move(a)) return true;
    } return false;
  }

  function pickThreatBullet() {
    let best=null, score=-Infinity; if (!bulletInfo) return null;
    for (let i=0;i<bulletInfo.length;i++){ const b=bulletInfo[i];
      const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-3;
      const dirx=dx/d, diry=dy/d; const rv=-(b.vx*dirx + b.vy*diry);
      const s=rv*(1/d); if (rv>0 && s>score){score=s; best=b;}
    } return best;
  }

  function pickLowHpTarget() {
    if (!enemies || enemies.length===0) return null;
    let best=null, key=Infinity; const cx=(tank.arenaWidth||1000)/2, cy=(tank.arenaHeight||1000)/2;
    for (let i=0;i<enemies.length;i++){ const e=enemies[i];
      const d=dist(tank.x,tank.y,e.x,e.y); const hp=(e.hp!=null?e.hp:100);
      const center=dist(cx,cy,e.x,e.y); const k=d*0.6 + hp*1.0 + center*0.1;
      if (k<key){key=k; best=e;}
    } return best;
  }

  // ===== 행동 =====
  const threat = pickThreatBullet();
  if (threat){
    const ang=Math.atan2(threat.vy, threat.vx);
    const perp1=ang+PI/2, perp2=ang-PI/2;
    const relx=tank.x-threat.x, rely=tank.y-threat.y;
    const dot1=Math.cos(perp1)*relx + Math.sin(perp1)*rely;
    const evade = (dot1>=0)?perp1:perp2;
    if (!tryMove(evade)) tryMove(evade + randRange(-10*DEG,10*DEG));
  } else {
    const tgt = pickLowHpTarget();
    let moveAng = 0; const orbitDir = (Math.random()<0.5)?-1:1; // 난수화 오비트 방향
    const desired = 320; // 큰 오비트 반경
    if (tgt){
      const d = dist(tank.x,tank.y,tgt.x,tgt.y);
      const toTarget = Math.atan2(tgt.y - tank.y, tgt.x - tank.x);
      if (d < desired*0.9) moveAng = wrapAngle(toTarget + PI); // 카이팅(거리 벌리기)
      else if (d > desired*1.2) moveAng = toTarget; // 진입
      else moveAng = wrapAngle(toTarget + orbitDir * 90*DEG); // 오비트 유지
    } else {
      moveAng = randRange(-PI, PI);
    }
    tryMove(moveAng + randRange(-5*DEG,5*DEG));
  }

  const target = pickLowHpTarget();
  if (target){
    const ang = leadAngle(tank, target, bulletSpeed);
    tank.fire(ang + randRange(-2*DEG, 2*DEG));
  }
}

