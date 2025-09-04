// Normal Support — 아군 보호, 포커스 파이어 동조, 중거리 유지
function dist(ax,ay,bx,by){ const dx=bx-ax, dy=by-ay; return Math.hypot(dx,dy); }
function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax); }
function safeLead(src, dst, bulletSpeed){
  const rx=dst.x-src.x, ry=dst.y-src.y; const vx=dst.vx||0, vy=dst.vy||0;
  const a=vx*vx+vy*vy-bulletSpeed*bulletSpeed, b=2*(rx*vx+ry*vy), c=rx*rx+ry*ry; let t=0;
  if (Math.abs(a)<1e-6){ if(Math.abs(b)>1e-6) t=-c/b; }
  else { const disc=b*b-4*a*c; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-b+s)/(2*a), t2=(-b-s)/(2*a); t=Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2); if(!isFinite(t)||t<0) t=0; }}
  const axp=dst.x+(dst.vx||0)*t, ayp=dst.y+(dst.vy||0)*t; return Math.atan2(ayp-src.y, axp-src.x);
}
function pickCommonTarget(allies, enemies){
  // 아군이 이미 조준 중인 가장 가까운 대상 추정: allies의 aim(추정 불가 시 거리/체력 기준)
  let best=null, score=1e9;
  for(const e of enemies||[]){ const d=Math.hypot(e.x-400, e.y-300); const s=(e.hp||100)*0.7 + d*0.3; if (s<score){score=s; best=e;} }
  return best;
}

function name(){ return 'Normal Support'; }
function type(){ return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo){
  const BULLET_SPEED=400; const IDEAL_R=260; const MIN_R=200; const MAX_R=320; const jitter=(Math.random()-0.5)*0.06;
  // 1) 아군 최근접 보호: 가장 가까운 아군 기준 중심 유지
  let closestAlly=null, bestD=1e9; for(const a of allies||[]){ const d=dist(tank.x,tank.y,a.x,a.y); if(d<bestD){bestD=d; closestAlly=a;} }
  let anchorX=400, anchorY=300; if (closestAlly){ anchorX=closestAlly.x; anchorY=closestAlly.y; }

  // 2) 공통 타겟 선정
  const tgt = pickCommonTarget(allies, enemies||[]);
  if (tgt){
    const d = dist(anchorX, anchorY, tgt.x, tgt.y);
    let moveAng = angleTo(tank.x,tank.y, tgt.x, tgt.y);
    if (d < MIN_R) moveAng += Math.PI; // 거리 벌림
    else if (d > MAX_R) moveAng += 0; // 접근
    else moveAng += (Math.random()<0.5?1:-1)*60*Math.PI/180; // 측방 유지
    moveAng += jitter;
    for(let i=0;i<10;i++){ if (tank.move(moveAng)) break; moveAng += ((i%2?1:-1)*12*Math.PI/180); }

    const fireAng = safeLead(tank, tgt, BULLET_SPEED) + (Math.random()-0.5)*0.02;
    tank.fire(fireAng);
  } else {
    // 타겟 없으면 아군 근처 순찰
    let ang = angleTo(tank.x,tank.y, anchorX, anchorY) + (Math.random()<0.5?1:-1)*Math.PI/2 + jitter;
    for(let i=0;i<10;i++){ if (tank.move(ang)) break; ang += ((i%2?1:-1)*12*Math.PI/180); }
  }
}

