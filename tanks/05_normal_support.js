// Normal Support — 아군 보호 및 포커스 파이어 동조, 중거리 유지

function name() { return 'Normal Support'; }

function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  const PI=Math.PI, TAU=PI*2, DEG=PI/180;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function dist(ax,ay,bx,by){return Math.hypot(bx-ax,by-ay);} 
  function wrap(a){while(a<=-PI)a+=TAU;while(a>PI)a-=TAU;return a;}
  function rand(a,b){return a+(b-a)*Math.random();}
  const proj=(tank&&(tank.bulletSpeed||tank.projectileSpeed))||6.5;

  function lead(src,dst,speed){
    const rx=dst.x-src.x, ry=dst.y-src.y; const vx=(dst.vx||0), vy=(dst.vy||0);
    const A=vx*vx+vy*vy-speed*speed, B=2*(rx*vx+ry*vy), C=rx*rx+ry*ry; let t=0;
    if(Math.abs(A)<1e-6) t=(Math.abs(B)<1e-6)?0:clamp(-C/B,0,2.0); else { const D=B*B-4*A*C; if(D>=0){ const s=Math.sqrt(D); let t1=(-B-s)/(2*A), t2=(-B+s)/(2*A); t=Math.min(t1,t2); if(t<0) t=Math.max(t1,t2); if(t<0) t=0; t=clamp(t,0,1.5);} }
    const ax=dst.x+(dst.vx||0)*t, ay=dst.y+(dst.vy||0)*t; return Math.atan2(ay-src.y, ax-src.x);
  }

  function tryMove(base){ const step=15*DEG; for(let i=0;i<10;i++){ const s=(i%2===0)?1:-1; const k=Math.floor(i/2); if(tank.move(base + s*k*step)) return true;} return false; }

  function threatBullet(){ let best=null,score=-Infinity; if(!bulletInfo) return null; for(let i=0;i<bulletInfo.length;i++){ const b=bulletInfo[i]; const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-3; const dirx=dx/d, diry=dy/d; const rv=-(b.vx*dirx + b.vy*diry); const s=rv*(1/d); if(rv>0 && s>score){score=s;best=b;}} return best; }

  function teamCenter(){ let sx=0, sy=0, n=0; for(let i=0;i<allies.length;i++){sx+=allies[i].x; sy+=allies[i].y; n++;} if(n===0) return {x:tank.x, y:tank.y}; return {x:sx/n, y:sy/n}; }

  // 공통 타겟 선정 규칙: 팀 중심에 가까우며 체력이 낮고 우리와도 가까운 적
  function sharedTarget(){ if(!enemies||enemies.length===0) return null; const center=teamCenter(); let best=null,key=Infinity; for(let i=0;i<enemies.length;i++){ const e=enemies[i]; const k=dist(center.x,center.y,e.x,e.y)*0.8 + dist(tank.x,tank.y,e.x,e.y)*0.3 + ((e.hp!=null?e.hp:100))*0.7; if(k<key){key=k; best=e;} } return best; }

  function nearestAlly(){ if(!allies||allies.length===0) return null; let best=null,dmin=Infinity; for(let i=0;i<allies.length;i++){ const a=allies[i]; const d=dist(tank.x,tank.y,a.x,a.y); if(d<dmin){dmin=d; best=a;} } return best; }

  // 1) 탄 회피 우선
  const th = threatBullet();
  if (th){
    const ang=Math.atan2(th.vy, th.vx); const p1=ang+PI/2, p2=ang-PI/2; const relx=tank.x-th.x, rely=tank.y-th.y; const dot1=Math.cos(p1)*relx + Math.sin(p1)*rely; const evade=(dot1>=0)?p1:p2; if(!tryMove(evade)) tryMove(evade + rand(-10*DEG,10*DEG));
  } else {
    // 2) 아군 중심 근처에서 보호 포지셔닝 + 공통 타겟과의 중거리 유지
    const center = teamCenter(); const ally = nearestAlly(); const tgt = sharedTarget();
    let moveAng = Math.atan2(center.y - tank.y, center.x - tank.x); // 기본은 중심 접근
    if (tgt){
      // 아군 중심과 타겟 사이에 위치하도록 각도 조절
      const toCenter = Math.atan2(center.y - tank.y, center.x - tank.x);
      const toTarget = Math.atan2(tgt.y - tank.y, tgt.x - tank.x);
      // 중간 각도로 배치
      const mid = wrap((toCenter + toTarget) / 2);
      const d = dist(tank.x,tank.y,tgt.x,tgt.y); const desired=240;
      if (d < desired*0.9) moveAng = wrap(toTarget + PI); else if (d > desired*1.1) moveAng = toTarget; else moveAng = mid;
    }
    // 가장 가까운 아군과 너무 가깝다면 살짝 벌리기
    if ( ally ){
      const dA = dist(tank.x,tank.y,ally.x,ally.y); if (dA < 60) moveAng = wrap(moveAng + 30*DEG);
    }
    tryMove(moveAng + rand(-5*DEG,5*DEG));
  }

  const target = sharedTarget(); if (target){ tank.fire( lead(tank, target, proj) + rand(-2*DEG,2*DEG) ); }
}

