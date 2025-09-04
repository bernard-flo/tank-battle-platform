// Normal Interceptor — 탄 차단 회피와 반격, 위협 점수 기반 수직 회피

function name() { return 'Normal Interceptor'; }

function type() { return Type.NORMAL; }

function update(tank, enemies, allies, bulletInfo) {
  const PI=Math.PI, TAU=PI*2, DEG=PI/180;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function dist(ax,ay,bx,by){return Math.hypot(bx-ax,by-ay);} 
  function wrap(a){while(a<=-PI)a+=TAU;while(a>PI)a-=TAU;return a;}
  function rand(a,b){return a+(b-a)*Math.random();}
  const proj=(tank&&(tank.bulletSpeed||tank.projectileSpeed))||6.0;

  function lead(src,dst,speed){
    const rx=dst.x-src.x, ry=dst.y-src.y; const vx=(dst.vx||0), vy=(dst.vy||0);
    const A=vx*vx+vy*vy-speed*speed, B=2*(rx*vx+ry*vy), C=rx*rx+ry*ry; let t=0;
    if(Math.abs(A)<1e-6) t=(Math.abs(B)<1e-6)?0:clamp(-C/B,0,2.0); else {
      const D=B*B-4*A*C; if(D>=0){ const s=Math.sqrt(D); let t1=(-B-s)/(2*A), t2=(-B+s)/(2*A);
        t=Math.min(t1,t2); if(t<0) t=Math.max(t1,t2); if(t<0) t=0; t=clamp(t,0,1.2);
      }
    }
    const ax=dst.x+(dst.vx||0)*t, ay=dst.y+(dst.vy||0)*t; return Math.atan2(ay-src.y, ax-src.x);
  }

  function tryMove(base){ const step=15*DEG; for(let i=0;i<10;i++){ const s=(i%2===0)?1:-1; const k=Math.floor(i/2); if(tank.move(base + s*k*step)) return true;} return false; }

  function threatBullet(){ let best=null,score=-Infinity; if(!bulletInfo) return null; for(let i=0;i<bulletInfo.length;i++){ const b=bulletInfo[i]; const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-3; const dirx=dx/d, diry=dy/d; const rv=-(b.vx*dirx + b.vy*diry); const s=rv*(1/d); if(rv>0 && s>score){score=s;best=b;}} return best; }

  function pickTarget(){ if(!enemies||enemies.length===0) return null; let best=null,key=Infinity; const cx=(tank.arenaWidth||1000)/2, cy=(tank.arenaHeight||1000)/2; for(let i=0;i<enemies.length;i++){ const e=enemies[i]; const d=dist(tank.x,tank.y,e.x,e.y); const hp=(e.hp!=null?e.hp:100); const center=dist(cx,cy,e.x,e.y); const k=d*0.7 + hp*0.6 + center*0.1; if(k<key){key=k; best=e;}} return best; }

  // 탄 회피 우선
  const th = threatBullet();
  if (th){
    const ang=Math.atan2(th.vy, th.vx); const p1=ang+PI/2, p2=ang-PI/2; const relx=tank.x-th.x, rely=tank.y-th.y; const dot1=Math.cos(p1)*relx + Math.sin(p1)*rely; const evade=(dot1>=0)?p1:p2; if(!tryMove(evade)) tryMove(evade + rand(-10*DEG,10*DEG));
  } else {
    // 여유 시 전진 혹은 포지션 조정
    const tgt=pickTarget(); let moveAng=rand(-PI,PI);
    if (tgt){
      const to= Math.atan2(tgt.y - tank.y, tgt.x - tank.x);
      const d = dist(tank.x,tank.y,tgt.x,tgt.y);
      const desired=200;
      if (d > desired*1.2) moveAng = to; else if (d < desired*0.8) moveAng = wrap(to + PI); else moveAng = to;
    }
    tryMove(moveAng + rand(-5*DEG,5*DEG));
  }

  const target = pickTarget();
  if (target){ tank.fire(lead(tank, target, proj) + rand(-2*DEG,2*DEG)); }
}

