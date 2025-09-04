// Tanker Bruiser — 전면 압박, 벽-슬라이딩, 지속 사격, 지그재그 회피

function name() { return 'Tanker Bruiser'; }

function type() { return Type.TANKER; }

function update(tank, enemies, allies, bulletInfo) {
  const PI=Math.PI, TAU=PI*2, DEG=PI/180; const EPS=1e-6;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function dist(ax,ay,bx,by){return Math.hypot(bx-ax,by-ay);} 
  function wrap(a){while(a<=-PI)a+=TAU;while(a>PI)a-=TAU;return a;}
  function rand(a,b){return a+(b-a)*Math.random();}
  const proj=(tank&&(tank.bulletSpeed||tank.projectileSpeed))||6.0;

  function lead(src,dst,speed){
    const rx=dst.x-src.x, ry=dst.y-src.y; const vx=(dst.vx||0), vy=(dst.vy||0);
    const A=vx*vx+vy*vy-speed*speed, B=2*(rx*vx+ry*vy), C=rx*rx+ry*ry; let t=0;
    if(Math.abs(A)<1e-6) t=(Math.abs(B)<1e-6)?0:clamp(-C/B,0,1.5); else { const D=B*B-4*A*C; if(D>=0){ const s=Math.sqrt(D); let t1=(-B-s)/(2*A), t2=(-B+s)/(2*A); t=Math.min(t1,t2); if(t<0) t=Math.max(t1,t2); if(t<0) t=0; t=clamp(t,0,1.0);} }
    const ax=dst.x+(dst.vx||0)*t, ay=dst.y+(dst.vy||0)*t; return Math.atan2(ay-src.y, ax-src.x);
  }

  function tryMove(base){ const step=15*DEG; for(let i=0;i<10;i++){ const s=(i%2===0)?1:-1; const k=Math.floor(i/2); if(tank.move(base + s*k*step)) return true;} return false; }

  function pickTarget(){ if(!enemies||enemies.length===0) return null; let best=null,key=Infinity; for(let i=0;i<enemies.length;i++){ const e=enemies[i]; const d=dist(tank.x,tank.y,e.x,e.y); const hp=(e.hp!=null?e.hp:100); const k=d*0.8 + hp*0.4; if(k<key){key=k; best=e;}} return best; }

  function nearWall(){ const W=tank.arenaWidth||1000, H=tank.arenaHeight||1000; const m=50; const left=tank.x<m, right=(W-tank.x)<m, top=tank.y<m, bottom=(H-tank.y)<m; return {left,right,top,bottom,W,H}; }

  // 1) 기본 전진 압박: 타겟 향해 이동하되 지그재그로 예측 회피
  const tgt = pickTarget();
  let moveAng = rand(-PI,PI);
  if (tgt){
    const to = Math.atan2(tgt.y - tank.y, tgt.x - tank.x);
    const d = dist(tank.x,tank.y,tgt.x,tgt.y);
    const desired = 180; // 중근거리 유지
    const zig = (Math.random()<0.5? -1:1) * rand(12*DEG, 25*DEG); // 간헐적 좌우 지그재그
    if (d > desired*1.2) moveAng = wrap(to + zig);
    else if (d < desired*0.8) moveAng = wrap(to + PI + zig*0.5);
    else moveAng = wrap(to + zig);
  }

  // 2) 벽-슬라이딩: 벽 근접 시 벽과 평행한 방향으로 수정
  const w = nearWall();
  if (w.left || w.right) {
    // 수직 벽이면 수평 이동 유지: 위/아래로 슬라이딩
    const up = -PI/2, down = PI/2;
    // 타겟이 더 가까워지는 쪽 선택
    let a1 = up, a2 = down;
    if (tgt){
      const d1 = dist(tank.x + Math.cos(a1)*10, tank.y + Math.sin(a1)*10, tgt.x, tgt.y);
      const d2 = dist(tank.x + Math.cos(a2)*10, tank.y + Math.sin(a2)*10, tgt.x, tgt.y);
      moveAng = (d1<d2)?a1:a2;
    } else moveAng = (Math.random()<0.5)?up:down;
  } else if (w.top || w.bottom) {
    // 수평 벽이면 좌/우로 슬라이딩
    const left = Math.PI, right = 0;
    let a1 = right, a2 = left;
    if (tgt){
      const d1 = dist(tank.x + Math.cos(a1)*10, tank.y + Math.sin(a1)*10, tgt.x, tgt.y);
      const d2 = dist(tank.x + Math.cos(a2)*10, tank.y + Math.sin(a2)*10, tgt.x, tgt.y);
      moveAng = (d1<d2)?a1:a2;
    } else moveAng = (Math.random()<0.5)?left:right;
  }

  tryMove(moveAng);

  // 3) 지속 사격(리드샷, 소량 난수화)
  if (tgt){ tank.fire( lead(tank, tgt, proj) + rand(-3*DEG,3*DEG) ); }
}

