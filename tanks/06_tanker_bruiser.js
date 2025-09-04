function name() { return 'Tanker Bruiser'; }
function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const WIDTH = P.WIDTH ?? 800;
  const HEIGHT = P.HEIGHT ?? 600;
  const SAFE_M = P.safeMargin ?? 24;
  const BULLET_SPD = P.bulletSpeed ?? 400;
  const MID_R = P.bruiser_mid_range ?? 180;
  const ZIGZAG_DEG = (P.strafe_deg ?? 18) * Math.PI/180;
  const REACT_DIST = P.evadeReactDist ?? 200;
  const LEAD_CLAMP = (P.leadMaxDeg ?? 18)*Math.PI/180;

  update.S = update.S || { t:0, zig:1 };
  const S = update.S; S.t++; if((S.t%90)===0) S.zig*=-1; // 간헐적 좌우 지그재그

  // utils
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angleTo=(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax);
  const normAng=(a)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
  function leadAngle(src,dst,proj){
    const rx=dst.x-src.x, ry=dst.y-src.y; const dvx=dst.vx||0,dvy=dst.vy||0;
    const A=dvx*dvx+dvy*dvy - proj*proj; const B=2*(rx*dvx+ry*dvy); const C=rx*rx+ry*ry; let t;
    if(Math.abs(A)<1e-6){ t=(Math.abs(B)<1e-6)?0:clamp(-C/B,0,1.0);} else {
      const D=B*B-4*A*C; if(D<0) t=0; else { const s=Math.sqrt(D);
        const t1=(-B-s)/(2*A), t2=(-B+s)/(2*A); t=Math.max(0, Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2)); }
    }
    const tx=dst.x+(dst.vx||0)*t, ty=dst.y+(dst.vy||0)*t;
    const base=Math.atan2(dst.y-src.y,dst.x-src.x); let ang=Math.atan2(ty-src.y,tx-src.x);
    return base + clamp(normAng(ang-base), -LEAD_CLAMP, LEAD_CLAMP);
  }
  function tryMove(theta){
    // 벽-슬라이딩: 벽의 접선 방향으로 평행 이동 유지
    let ang=theta;
    const nx=tank.x+Math.cos(theta)*10, ny=tank.y+Math.sin(theta)*10;
    if (tank.x < SAFE_M) ang = Math.sign(Math.sin(theta))>0 ? Math.PI/2 : -Math.PI/2;
    else if (tank.x > WIDTH-SAFE_M) ang = Math.sign(Math.sin(theta))>0 ? Math.PI/2 : -Math.PI/2;
    if (tank.y < SAFE_M) ang = 0; else if (tank.y > HEIGHT-SAFE_M) ang = Math.PI;
    tank.move(ang);
  }
  function mostThreatBullet(){
    if(!bulletInfo||!bulletInfo.length) return null; let best=null,score=0;
    for(const b of bulletInfo){ const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy); if(d>REACT_DIST) continue;
      const rvx=(b.vx||0)-(tank.vx||0), rvy=(b.vy||0)-(tank.vy||0); const along=(dx*rvx+dy*rvy)/(d+1e-6); const s=Math.max(0,along)/(d+1);
      if(s>score){score=s;best=b;} } return best; }

  // 타겟: 최근접
  let tgt=null; if(enemies&&enemies.length){ tgt=enemies.slice().sort((a,b)=>dist(tank,a)-dist(tank,b))[0]; }

  // 회피 우선
  const th=mostThreatBullet();
  if(th){
    const ang=Math.atan2(th.vy||0, th.vx||0); const relx=tank.x-th.x, rely=tank.y-th.y;
    const side=Math.sign(relx*Math.sin(ang)-rely*Math.cos(ang))||1; let mv=ang+side*Math.PI/2; const step=15*Math.PI/180;
    for(let i=0;i<10;i++){ tryMove(mv); mv+=((i%2)?1:-1)*step; }
  } else if(tgt){
    // 전면 압박: 중근거리 유지 + 지그재그 접근
    const base=angleTo(tank.x,tank.y,tgt.x,tgt.y);
    const d=dist(tank,tgt);
    let mv=base + S.zig*ZIGZAG_DEG;
    if(d<MID_R*0.85) mv=base+Math.PI; else if(d>MID_R*1.2) mv=base; // 거리 유지
    tryMove(mv);
  }

  if(tgt){
    const fa=leadAngle(tank,tgt,BULLET_SPD);
    const fireEvery=P.fire_every_frames??5; if((S.t%fireEvery)===0){ tank.fire(fa + ((Math.random()-0.5)*(P.aimJitterDeg??1.2)*Math.PI/180)); }
  }
}

