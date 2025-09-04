function name() { return 'Dealer Flanker'; }
function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const WIDTH = P.WIDTH ?? 800;
  const HEIGHT = P.HEIGHT ?? 600;
  const SAFE_M = P.safeMargin ?? 24;
  const BULLET_SPD = P.bulletSpeed ?? 400;
  const ORBIT_DEG = P.orbit_deg ?? 90;
  const BASE_R = P.orbit_radius ?? 220;
  const PULSE = P.radius_pulse ?? 80; // 반경 주기 조절 폭
  const REACT_DIST = P.evadeReactDist ?? 200;
  const LEAD_CLAMP = (P.leadMaxDeg ?? 22)*Math.PI/180;

  update.S = update.S || { t:0, dir: (Math.random()<0.5?-1:1) };
  const S = update.S; S.t++;
  if ((S.t % 240)===0) S.dir *= -1; // 주기적 방향 전환

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
  function mostThreatBullet(){
    if(!bulletInfo||!bulletInfo.length) return null; let best=null,score=0;
    for(const b of bulletInfo){ const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy); if(d>REACT_DIST) continue;
      const rvx=(b.vx||0)-(tank.vx||0), rvy=(b.vy||0)-(tank.vy||0); const along=(dx*rvx+dy*rvy)/(d+1e-6);
      const s=Math.max(0,along)/(d+1); if(s>score){score=s;best=b;} }
    return best; }

  // 타겟: 측후방 침투를 위한 가장 가까운 적
  let tgt=null; if(enemies&&enemies.length){
    tgt = enemies.slice().sort((a,b)=>Math.hypot(tank.x-a.x,tank.y-a.y)-Math.hypot(tank.x-b.x,tank.y-b.y))[0];
  }

  // 회피 우선
  const th=mostThreatBullet();
  if(th){
    const ang=Math.atan2(th.vy||0, th.vx||0); const relx=tank.x-th.x, rely=tank.y-th.y;
    const side=Math.sign(relx*Math.sin(ang) - rely*Math.cos(ang))||1; let mv=ang+side*Math.PI/2; const step=15*Math.PI/180;
    for(let i=0;i<10;i++){ tryMove(mv); mv+=((i%2)?1:-1)*step; }
  } else if(tgt){
    // 원운동: 타겟에 대한 법선(±90°) 방향. 반경을 주기적으로 펌핑해 벽/충돌 회피
    const base=angleTo(tank.x,tank.y,tgt.x,tgt.y);
    const desiredR = BASE_R + Math.sin(S.t/90)*PULSE; // 주기 반경
    const d=dist(tank,tgt);
    let mv = base + S.dir*(ORBIT_DEG*Math.PI/180);
    if(d<desiredR*0.9) mv = base + Math.PI; // 너무 가까우면 후퇴
    else if(d>desiredR*1.15) mv = base; // 너무 멀면 접근
    tryMove(mv);
  }

  if(tgt){
    const fireEvery = P.fire_every_frames ?? 5; // 틈새에서 연속 사격
    if((S.t % fireEvery)===0){
      const fa=leadAngle(tank,tgt,BULLET_SPD);
      tank.fire(fa + ((Math.random()-0.5)*(P.aimJitterDeg??1.5)*Math.PI/180));
    }
  }
}

