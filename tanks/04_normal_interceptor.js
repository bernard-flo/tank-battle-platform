// Normal Interceptor — 탄 위협 차단 회피 후 반격
function dist(ax,ay,bx,by){ const dx=bx-ax, dy=by-ay; return Math.hypot(dx,dy); }
function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax); }
function safeLead(src, dst, bulletSpeed){
  const rx=dst.x-src.x, ry=dst.y-src.y; const vx=dst.vx||0, vy=dst.vy||0;
  const a=vx*vx+vy*vy-bulletSpeed*bulletSpeed, b=2*(rx*vx+ry*vy), c=rx*rx+ry*ry;
  let t=0; if (Math.abs(a)<1e-6){ if(Math.abs(b)>1e-6) t=-c/b; }
  else { const disc=b*b-4*a*c; if(disc>=0){ const s=Math.sqrt(disc); const t1=(-b+s)/(2*a), t2=(-b-s)/(2*a); t=Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2); if(!isFinite(t)||t<0) t=0; }}
  const axp=dst.x+(dst.vx||0)*t, ayp=dst.y+(dst.vy||0)*t; return Math.atan2(ayp-src.y, axp-src.x);
}
function pickTarget(tank, enemies){
  let best=null, score=1e9; for(const e of enemies||[]){ const d=dist(tank.x,tank.y,e.x,e.y); const s=d*0.6+(e.hp||100)*0.4+Math.hypot(e.x-400,e.y-300)*0.1; if(s<score){score=s;best=e;} } return best;
}
function mostThreatBullet(tank, bullets){
  let best=null, bestScore=-Infinity;
  for(const b of bullets||[]){
    const d=dist(tank.x,tank.y,b.x,b.y)+1e-3;
    const toMeX=tank.x-b.x, toMeY=tank.y-b.y;
    const approach=((b.vx||0)*toMeX+(b.vy||0)*toMeY)/d;
    const score=approach/(d*d); // 역거리 가중 강화
    if(score>bestScore){ bestScore=score; best=b; }
  }
  return best;
}

function name(){ return 'Normal Interceptor'; }
function type(){ return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo){
  const BULLET_SPEED=400; const jitter=(Math.random()-0.5)*0.06;
  // 1) 위협 탄 회피(수직 이동)
  const b=mostThreatBullet(tank, bulletInfo);
  if (b){
    let ang=Math.atan2(b.vy||0, b.vx||0) + (Math.random()<0.5?1:-1)*Math.PI/2 + jitter;
    for(let i=0;i<10;i++){ if (tank.move(ang)) break; ang += ((i%2?1:-1)*15*Math.PI/180); }
  }

  // 2) 반격: 여유 시 최근접 적 리드샷
  const tgt=pickTarget(tank, enemies||[]);
  if (tgt){ const a=safeLead(tank,tgt,BULLET_SPEED) + (Math.random()-0.5)*0.02; tank.fire(a); }
}

