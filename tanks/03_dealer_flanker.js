// Dealer Flanker — 측후방 침투, 원운동 오비트, 틈새 연속 사격

function name() { return 'Dealer Flanker'; }

function type() { return Type.DEALER; }

function update(tank, enemies, allies, bulletInfo) {
  // ===== 유틸 =====
  const PI=Math.PI, TAU=PI*2, DEG=PI/180; const EPS=1e-6;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function dist(ax,ay,bx,by){return Math.hypot(bx-ax,by-ay);} 
  function wrap(a){while(a<=-PI)a+=TAU;while(a>PI)a-=TAU;return a;}
  function rand(a,b){return a+(b-a)*Math.random();}
  const proj=(tank&&(tank.bulletSpeed||tank.projectileSpeed))||6.5;

  function lead(src,dst,speed){
    const rx=dst.x-src.x, ry=dst.y-src.y; const vx=(dst.vx||0), vy=(dst.vy||0);
    const A=vx*vx+vy*vy-speed*speed, B=2*(rx*vx+ry*vy), C=rx*rx+ry*ry; let t=0;
    if(Math.abs(A)<1e-6) t=(Math.abs(B)<1e-6)?0:clamp(-C/B,0,2.0); else {
      const D=B*B-4*A*C; if(D>=0){ const s=Math.sqrt(D); let t1=(-B-s)/(2*A), t2=(-B+s)/(2*A);
        t=Math.min(t1,t2); if(t<0) t=Math.max(t1,t2); if(t<0) t=0; t=clamp(t,0,1.5);
      }
    }
    const ax=dst.x+vx*t, ay=dst.y+vy*t; return Math.atan2(ay-src.y, ax-src.x);
  }

  function tryMove(base){ const step=15*DEG; for(let i=0;i<10;i++){ const s=(i%2===0)?1:-1; const k=Math.floor(i/2); if(tank.move(base + s*k*step)) return true;} return false; }

  function threatBullet(){ let best=null,score=-Infinity; if(!bulletInfo) return null; for(let i=0;i<bulletInfo.length;i++){ const b=bulletInfo[i]; const dx=tank.x-b.x, dy=tank.y-b.y; const d=Math.hypot(dx,dy)+1e-3; const dirx=dx/d, diry=dy/d; const rv=-(b.vx*dirx + b.vy*diry); const s=rv*(1/d); if(rv>0 && s>score){score=s;best=b;}} return best; }

  function pickTarget(){ if(!enemies||enemies.length===0) return null; let best=null, key=Infinity; const cx=(tank.arenaWidth||1000)/2, cy=(tank.arenaHeight||1000)/2; for(let i=0;i<enemies.length;i++){ const e=enemies[i]; const d=dist(tank.x,tank.y,e.x,e.y); const hp=(e.hp!=null?e.hp:100); const center=dist(cx,cy,e.x,e.y); const k=d*0.8 + hp*0.7 + center*0.1; if(k<key){key=k; best=e;}} return best; }

  // ===== 행동 =====
  // 1) 탄 회피 우선
  const th = threatBullet();
  if (th){
    const ang=Math.atan2(th.vy, th.vx); const p1=ang+PI/2, p2=ang-PI/2; const relx=tank.x-th.x, rely=tank.y-th.y; const dot1=Math.cos(p1)*relx+Math.sin(p1)*rely; const evade=(dot1>=0)?p1:p2; if(!tryMove(evade)) tryMove(evade + rand(-10*DEG,10*DEG));
  } else {
    // 2) 측후방 오비트: 타겟 기준 ±90° 방향으로 원운동, 주기적 반경 조절
    const tgt = pickTarget(); let moveAng=rand(-PI,PI); if(tgt){
      const to= Math.atan2(tgt.y - tank.y, tgt.x - tank.x);
      const orbitDir = (Math.random()<0.5)?1:-1; // 난수화 방향 플립
      const base = wrap(to + orbitDir * 90*DEG);
      // 반경 조절: 120~200 사이 왕복
      const d = dist(tank.x,tank.y,tgt.x,tgt.y);
      const minR=140, maxR=220;
      if (d < minR) moveAng = wrap(to + PI); // 벌리기
      else if (d > maxR) moveAng = to; // 좁히기
      else moveAng = base; // 원운동
    }
    tryMove(moveAng + rand(-7*DEG,7*DEG));
  }

  // 3) 연속 사격: 리드샷, 소량 난수화
  const target = (function(){
    // 근접한 적에게 우선 사격하도록 재사용
    return pickTarget();
  })();
  if (target){
    const ang = lead(tank, target, proj);
    tank.fire(ang + rand(-3*DEG,3*DEG));
  }
}

