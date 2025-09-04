// Dealer Flanker — 측후방 진입, 원운동 오비트, 연속 사격
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function dist(ax,ay,bx,by){ const dx=bx-ax, dy=by-ay; return Math.hypot(dx,dy); }
function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax); }
function safeLead(src, dst, bulletSpeed){
  const rx=dst.x-src.x, ry=dst.y-src.y; const vx=dst.vx||0, vy=dst.vy||0;
  const a=vx*vx+vy*vy-bulletSpeed*bulletSpeed, b=2*(rx*vx+ry*vy), c=rx*rx+ry*ry;
  let t=0; if (Math.abs(a)<1e-6){ if(Math.abs(b)>1e-6) t=-c/b; }
  else { const disc=b*b-4*a*c; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-b+s)/(2*a), t2=(-b-s)/(2*a); t=Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2); if(!isFinite(t)||t<0) t=0; } }
  const axp=dst.x+vx*t, ayp=dst.y+vy*t; return Math.atan2(ayp-src.y, axp-src.x);
}
function pickTarget(tank,enemies){
  let best=null,score=1e9; for(const e of enemies||[]){ const d=dist(tank.x,tank.y,e.x,e.y); const s=d*0.6+(e.hp||100)*0.4; if(s<score){score=s;best=e;} } return best;
}

function name(){ return 'Dealer Flanker'; }
function type(){ return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo){
  const BULLET_SPEED=400; const ORBIT_DIR = (tank.__orbitDir = tank.__orbitDir || (Math.random()<0.5?1:-1));
  const IDEAL_R = 220; const MIN_R=160; const MAX_R=280;
  const jitter=(Math.random()-0.5)*0.08;

  const tgt = pickTarget(tank, enemies||[]);
  if (!tgt){ tank.move((Math.random()*2-1)*Math.PI); return; }
  const d = dist(tank.x,tank.y,tgt.x,tgt.y);
  // 원운동 각도: 타겟 법선(±90°)에 방사 보정
  let base = angleTo(tank.x,tank.y,tgt.x,tgt.y);
  let moveAng = base + ORBIT_DIR*Math.PI/2;
  if (d < MIN_R) moveAng = base + ORBIT_DIR*(Math.PI/2 + 20*Math.PI/180);
  if (d > MAX_R) moveAng = base + ORBIT_DIR*(Math.PI/2 - 20*Math.PI/180);

  // 주기적 반전으로 예측 회피
  if (!tank.__flipTimer) tank.__flipTimer = 60 + Math.floor(Math.random()*60);
  tank.__flipTimer -= 1;
  if (tank.__flipTimer<=0){ tank.__flipTimer = 60 + Math.floor(Math.random()*60); tank.__orbitDir *= -1; }
  moveAng += jitter;

  // 벽 회피: 벽 평행 이동으로 보정
  const M=28; if (tank.x<M) moveAng = 0; else if (tank.x>800-M) moveAng = Math.PI;
  if (tank.y<M) moveAng = Math.PI/2; else if (tank.y>600-M) moveAng = -Math.PI/2;

  for(let i=0;i<10;i++){ if (tank.move(moveAng)) break; moveAng += ((i%2?1:-1) * 12*Math.PI/180); }

  const fireAng = safeLead(tank,tgt,BULLET_SPEED) + (Math.random()-0.5)*0.02;
  tank.fire(fireAng);
}

