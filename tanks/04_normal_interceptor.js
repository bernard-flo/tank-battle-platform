function name() { return 'Normal Interceptor'; }
function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const WIDTH = P.WIDTH ?? 800;
  const HEIGHT = P.HEIGHT ?? 600;
  const SAFE_M = P.safeMargin ?? 24;
  const BULLET_SPD = P.bulletSpeed ?? 400;
  const REACT_DIST = P.evadeReactDist ?? 220;
  const LEAD_CLAMP = (P.leadMaxDeg ?? 20)*Math.PI/180;

  update.S = update.S || { t:0 };
  const S = update.S; S.t++;

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
    const nx=tank.x+Math.cos(theta)*10, ny=tank.y+Math.sin(theta)*10; let ang=theta;
    if(nx<SAFE_M) ang=0; else if(nx>WIDTH-SAFE_M) ang=Math.PI;
    if(ny<SAFE_M) ang=Math.PI/2; else if(ny>HEIGHT-SAFE_M) ang=-Math.PI/2; tank.move(ang);
  }
  function scoreBullet(b){
    const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy); if(d>REACT_DIST) return 0;
    const rvx=(b.vx||0)-(tank.vx||0), rvy=(b.vy||0)-(tank.vy||0);
    const along=(dx*rvx+dy*rvy)/(d+1e-6); // 접근 속도
    return Math.max(0, along) * (1/(d+1));
  }

  // 가장 위협적인 탄
  let threat=null, best=0; if(bulletInfo){
    for(const b of bulletInfo){ const s=scoreBullet(b); if(s>best){best=s;threat=b;} }
  }

  if(threat){
    const ang=Math.atan2(threat.vy||0, threat.vx||0);
    const relx=tank.x-threat.x, rely=tank.y-threat.y;
    const side=Math.sign(relx*Math.sin(ang) - rely*Math.cos(ang))||1;
    let mv=ang + side*Math.PI/2; const step=15*Math.PI/180;
    for(let i=0;i<10;i++){ tryMove(mv); mv+=((i%2)?1:-1)*step; }
  } else if(enemies&&enemies.length){
    // 여유 시 최근접 적에게 접근/유지
    const tgt=enemies.slice().sort((a,b)=>dist(tank,a)-dist(tank,b))[0];
    const d=dist(tank,tgt); const base=angleTo(tank.x,tank.y,tgt.x,tgt.y);
    let mv=base; if(d<160) mv=base+Math.PI; // 너무 가까우면 거리 벌림
    tryMove(mv);
    const fa=leadAngle(tank,tgt,BULLET_SPD);
    const fireEvery = P.fire_every_frames ?? 6;
    if((S.t % fireEvery)===0){ tank.fire(fa + ((Math.random()-0.5)*(P.aimJitterDeg??1.5)*Math.PI/180)); }
  }
}

