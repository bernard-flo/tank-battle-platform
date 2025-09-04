function name() { return 'Dealer Sniper'; }
function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  const P = (typeof PARAMS === 'object' && PARAMS) || {};
  const WIDTH = P.WIDTH ?? 800;
  const HEIGHT = P.HEIGHT ?? 600;
  const SAFE_M = P.safeMargin ?? 24;
  const BULLET_SPD = P.bulletSpeed ?? 400;
  const IDEAL_R = P.ideal_range ?? 280; // 장거리 유지(카이팅)
  const ORBIT_DIR_FLIP_RATE = P.orbitFlipRate ?? 0.005;
  const LEAD_CLAMP = (P.leadMaxDeg ?? 25) * Math.PI/180;
  const REACT_DIST = P.evadeReactDist ?? 220;

  // state
  update.SN = update.SN || { t:0, orbitDir: 1, fireTick:0 };
  const S = update.SN; S.t++;
  if (Math.random() < ORBIT_DIR_FLIP_RATE) S.orbitDir *= -1;

  // utils
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angleTo = (ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax);
  const normAng=(a)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
  function leadAngle(src,dst,proj){
    const rx=dst.x-src.x, ry=dst.y-src.y; const dvx=dst.vx||0, dvy=dst.vy||0;
    const a=dvx*dvx+dvy*dvy - proj*proj; const b=2*(rx*dvx+ry*dvy); const c=rx*rx+ry*ry;
    let t; if(Math.abs(a)<1e-6){ t=(Math.abs(b)<1e-6)?0:clamp(-c/b,0,1.0);} else {
      const D=b*b-4*a*c; if(D<0) t=0; else { const s=Math.sqrt(D);
        const t1=(-b - s)/(2*a), t2=(-b + s)/(2*a); t=Math.max(0, Math.min(t1,t2)>0?Math.min(t1,t2):Math.max(t1,t2));}
    }
    const tx=dst.x+(dst.vx||0)*t, ty=dst.y+(dst.vy||0)*t;
    const base=Math.atan2(dst.y-src.y, dst.x-src.x);
    let ang=Math.atan2(ty-src.y, tx-src.x);
    ang = base + clamp(normAng(ang-base), -LEAD_CLAMP, LEAD_CLAMP);
    return ang;
  }
  function tryMove(theta){
    const nx=tank.x+Math.cos(theta)*10, ny=tank.y+Math.sin(theta)*10;
    let ang=theta;
    if (nx<SAFE_M) ang=0; else if(nx>WIDTH-SAFE_M) ang=Math.PI;
    if (ny<SAFE_M) ang=Math.PI/2; else if(ny>HEIGHT-SAFE_M) ang=-Math.PI/2;
    tank.move(ang);
  }
  function mostThreatBullet(){
    if(!bulletInfo||!bulletInfo.length) return null; let best=null,sc=0;
    for(const b of bulletInfo){ const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy);
      if(d>REACT_DIST) continue; const rvx=(b.vx||0)-(tank.vx||0), rvy=(b.vy||0)-(tank.vy||0);
      const along=(dx*rvx+dy*rvy)/(d+1e-6); const s=Math.max(0,along)*(1/(d+1)); if(s>sc){sc=s;best=b;}
    } return best; }

  // target: 체력 낮은 적 우선
  let target=null; if(enemies&&enemies.length){
    target = enemies.slice().sort((a,b)=>{
      const ha=(a.hp??9999), hb=(b.hp??9999); if(ha!==hb) return ha-hb;
      const da=dist(tank,a), db=dist(tank,b); if(Math.abs(da-db)>1e-3) return da-db;
      return Math.hypot(a.x-WIDTH/2,a.y-HEIGHT/2)-Math.hypot(b.x-WIDTH/2,b.y-HEIGHT/2);
    })[0];
  }

  // evade first
  const threat=mostThreatBullet();
  if(threat){
    const ang=Math.atan2(threat.vy||0, threat.vx||0); // 탄 궤도
    const relx=tank.x-threat.x, rely=tank.y-threat.y;
    const side=Math.sign(relx*Math.sin(ang) - rely*Math.cos(ang))||1; // 수직
    let moveAng=ang + side*Math.PI/2; const step=15*Math.PI/180;
    for(let i=0;i<10;i++){ tryMove(moveAng); moveAng += ((i%2)?1:-1)*step; }
  } else if(target){
    // 카이팅: 이상적 반경 유지 + 넓은 오비트
    const d=dist(tank,target);
    const base=angleTo(tank.x,tank.y,target.x,target.y);
    let moveAng=base + S.orbitDir*(90*Math.PI/180);
    if(d<IDEAL_R*0.85) moveAng = base + Math.PI; // 거리가 너무 가깝다면 후퇴
    if(d>IDEAL_R*1.25) moveAng = base; // 너무 멀면 접근
    tryMove(moveAng);
  }

  if(target){
    const fireAng=leadAngle(tank,target,BULLET_SPD);
    // 간단 쿨다운: 틱 간격
    const fireEvery = P.fire_every_frames ?? 8;
    if((S.t % fireEvery)===0){ tank.fire(fireAng + ((Math.random()-0.5)*(P.aimJitterDeg??1)*Math.PI/180)); }
  }
}

