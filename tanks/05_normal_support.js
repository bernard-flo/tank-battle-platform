// Normal Support v1 — 아군 보호/중거리 유지/포커스 파이어 동조
function name() { return 'Normal Support'; }
function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  function dist(ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax) * 180 / Math.PI; }
  function tryMove(angleDeg){
    const step=15;
    for(let i=0;i<10;i++){
      const offs=((i>>1)+1)*step*(i%2===0?1:-1);
      const ang=angleDeg+(i===0?0:offs);
      if (tank.move(ang)) return true;
    }
    return false;
  }
  function pickCommonTarget(){
    if (enemies.length===0) return null;
    // 공통 규칙: 가까움 → 체력 낮음 → 중앙 근접
    function score(e){
      const d = dist(tank.x,tank.y,e.x,e.y);
      const dC = dist(e.x,e.y,450,300);
      return -d + (1000-e.health)*0.001 - dC*0.0005;
    }
    let best=enemies[0];
    for(const e of enemies){ if (score(e)>score(best)) best=e; }
    return best;
  }
  function leadAngle(src, dst){
    const base = angleTo(src.x, src.y, dst.x, dst.y);
    const jitter = (Math.random()*2-1)*4;
    return base + jitter;
  }
  function centerAllies(){
    if (!allies || allies.length===0) return {x:tank.x,y:tank.y};
    return { x: allies.reduce((s,a)=>s+a.x,0)/allies.length,
             y: allies.reduce((s,a)=>s+a.y,0)/allies.length };
  }
  function evade(){
    if (!bulletInfo || bulletInfo.length===0) return false;
    let best=null, bestScore=-1e9;
    for(const b of bulletInfo){
      const rx=tank.x-b.x, ry=tank.y-b.y; const r=Math.hypot(rx,ry)+1e-6;
      const vdot=(b.vx*rx+b.vy*ry)/r; const score=vdot/r;
      if(score>bestScore){best=b;bestScore=score;}
    }
    if(!best) return false;
    const bang=Math.atan2(best.vy,best.vx)*180/Math.PI;
    const a1=bang+90,a2=bang-90;
    const s=(ang)=>{const rad=ang*Math.PI/180;return Math.cos(rad)*(tank.x-best.x)+Math.sin(rad)*(tank.y-best.y);};
    return tryMove(s(a1)>s(a2)?a1:a2);
  }

  // ===== 로직 =====
  if (evade()) { const tgt=pickCommonTarget(); if (tgt) tank.fire(leadAngle(tank,tgt)); return; }

  const center = centerAllies();
  const tgt = pickCommonTarget();
  if (!tgt) return;

  // 아군 중심 근처에서 중거리 유지(260~340)
  const toCenter = angleTo(tank.x, tank.y, center.x, center.y);
  const toEnemy = angleTo(tank.x, tank.y, tgt.x, tgt.y);
  const d = dist(tank.x, tank.y, tgt.x, tgt.y);
  if (d < 240) {
    tryMove(toEnemy + 180 + (Math.random()<0.5?-25:25));
  } else if (d > 360) {
    tryMove(toEnemy + (Math.random()<0.5?10:-10));
  } else {
    // 중심을 끼고 각도 정렬 유지
    tryMove((toCenter*0.3 + toEnemy*0.7));
  }

  tank.fire(leadAngle(tank, tgt));
}

