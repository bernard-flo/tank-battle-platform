function name() { return 'Normal Support'; }
function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const WIDTH = P.WIDTH ?? 800;
  const HEIGHT = P.HEIGHT ?? 600;
  const SAFE_M = P.safeMargin ?? 24;
  const BULLET_SPD = P.bulletSpeed ?? 400;
  const MID_R = P.support_mid_range ?? 200;
  const ALIGN_W = P.align_weight ?? 0.5; // 아군 중심 각도 정렬 가중치
  const REACT_DIST = P.evadeReactDist ?? 200;
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
  function mostThreatBullet(){
    if(!bulletInfo||!bulletInfo.length) return null; let b=null,sc=0;
    for(const x of bulletInfo){ const dx=tank.x-x.x, dy=tank.y-x.y; const d=Math.hypot(dx,dy); if(d>REACT_DIST) continue;
      const rvx=(x.vx||0)-(tank.vx||0), rvy=(x.vy||0)-(tank.vy||0); const along=(dx*rvx+dy*rvy)/(d+1e-6); const s=Math.max(0,along)/(d+1);
      if(s>sc){sc=s;b=x;} } return b; }

  // 아군 중심 계산 및 가장 가까운 아군 보호
  let cx=WIDTH/2, cy=HEIGHT/2, nearestAlly=null, bestD=1e9;
  if(allies && allies.length){
    let sx=0, sy=0; for(const a of allies){ sx+=a.x; sy+=a.y; const d=dist(tank,a); if(d<bestD){bestD=d; nearestAlly=a;} }
    cx=sx/allies.length; cy=sy/allies.length;
  }

  // 공통 타겟 선정: 아군 중심에 가까운 적 + 체력 낮음
  let target=null; if(enemies && enemies.length){
    target=enemies.slice().sort((a,b)=>{
      const ca=Math.hypot(a.x-cx,a.y-cy), cb=Math.hypot(b.x-cx,b.y-cy); if(Math.abs(ca-cb)>1e-3) return ca-cb;
      const ha=(a.hp??9999), hb=(b.hp??9999); if(ha!==hb) return ha-hb;
      return Math.hypot(tank.x-a.x,tank.y-a.y)-Math.hypot(tank.x-b.x,tank.y-b.y);
    })[0];
  }

  // 회피 우선
  const th=mostThreatBullet();
  if(th){
    const ang=Math.atan2(th.vy||0, th.vx||0); const relx=tank.x-th.x, rely=tank.y-th.y;
    const side=Math.sign(relx*Math.sin(ang) - rely*Math.cos(ang))||1; let mv=ang+side*Math.PI/2; const step=15*Math.PI/180;
    for(let i=0;i<10;i++){ tryMove(mv); mv+=((i%2)?1:-1)*step; }
  } else {
    // 아군 중심 정렬 + 중거리 유지
    const base = angleTo(tank.x,tank.y,cx,cy);
    let mv = base;
    if(nearestAlly){
      // 아군과 각도 정렬: 적-아군-나를 같은 방향으로 정렬하도록 보정
      if(target){
        const a1 = angleTo(nearestAlly.x, nearestAlly.y, target.x, target.y);
        mv = base + ALIGN_W * (a1 - base);
      }
    }
    if(target){
      const d=Math.hypot(tank.x-target.x,tank.y-target.y);
      if(d<MID_R*0.9) mv = angleTo(tank.x,tank.y,target.x,target.y)+Math.PI; // 후퇴
      else if(d>MID_R*1.1) mv = angleTo(tank.x,tank.y,target.x,target.y); // 접근
    }
    tryMove(mv);
  }

  if(target){
    const fa=leadAngle(tank,target,BULLET_SPD);
    const fireEvery=P.fire_every_frames??6;
    if((S.t%fireEvery)===0){ tank.fire(fa + ((Math.random()-0.5)*(P.aimJitterDeg??1.2)*Math.PI/180)); }
  }
}

