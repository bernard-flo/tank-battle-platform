// Tanker Bruiser v1 — 전면 압박, 벽-슬라이딩, 지그재그 회피
function name() { return 'Tanker Bruiser'; }
function type() { return Type.TANKER; }

const SB = { frames:0, zig:1 };
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);} 
function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax);} 
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function leadAngle(src,dst,vBullet){ const dx=dst.x-src.x, dy=dst.y-src.y; const dvx=dst.vx||0, dvy=dst.vy||0; const A=dvx*dvx+dvy*dvy - vBullet*vBullet, B=2*(dx*dvx+dy*dvy), C=dx*dx+dy*dy; let t=0; const D=B*B-4*A*C; if(Math.abs(A)<1e-6) t=-C/(B||-1); else if(D>=0){const t1=(-B+Math.sqrt(D))/(2*A), t2=(-B-Math.sqrt(D))/(2*A); t=Math.max(t1,t2);} if(!isFinite(t)||t<0)t=0; const tx=dst.x+dvx*t, ty=dst.y+dvy*t; return Math.atan2(ty-src.y, tx-src.x);} 
function pick(enemies,tank){ if(!enemies||!enemies.length) return null; enemies=enemies.slice(); enemies.sort((a,b)=>dist(tank,a)-dist(tank,b)); return enemies[0]; }
function wallSlide(tank,a){ const W=800,H=600,m=20; let r=a; if(tank.x<m) r=0; else if(tank.x>W-m) r=Math.PI; if(tank.y<m) r=Math.PI/2; else if(tank.y>H-m) r=-Math.PI/2; return r; }
function threatBullet(tank,bullets){ if(!bullets||!bullets.length) return null; let best=null,score=-1e9; for(const b of bullets){ const dx=b.x-tank.x,dy=b.y-tank.y; const d=Math.hypot(dx,dy)+1e-3; const v=Math.hypot(b.vx,b.vy)+1e-3; const s=-(dx*b.vx+dy*b.vy)/(d*v)*(1/d); if(s>score){score=s; best=b;}} return best; }

function update(tank,enemies,allies,bulletInfo){
  SB.frames++; if(SB.frames%180===0) SB.zig*=-1; // 지그재그
  const P=(typeof PARAMS!=='undefined'&&PARAMS)||{}; const BULLET_SPEED=P.bulletSpeed??400; const ideal=P.ideal_range??200; const fireEvery=P.fire_every_frames??4; const strafeDeg=P.strafe_deg??20;
  const t=pick(enemies,tank); if(t){
    let to=angleTo(tank.x,tank.y,t.x,t.y);
    // 벽-슬라이딩 + 지그재그
    let moveA = to + SB.zig * (strafeDeg*Math.PI/180);
    const d=dist(tank,t); if(d>ideal*1.2) moveA = to + SB.zig*(strafeDeg*Math.PI/180); else if(d<ideal*0.85) moveA = to+Math.PI;
    moveA = wallSlide(tank, moveA);
    let ok=tank.move(moveA); if(!ok){ for(let i=1;i<=5 && !ok;i++){ ok=tank.move(moveA+i*Math.PI/16)||tank.move(moveA-i*Math.PI/16);} }
  }
  // 탄 회피(간헐적): 지그재그 각에 흡수되도록 약하게
  const tb = threatBullet(tank, bulletInfo);
  if(tb && SB.frames%3===0){ const a = wallSlide(tank, Math.atan2(tb.vy,tb.vx) + Math.PI/2 * (Math.random()<0.5?1:-1)); tank.move(a); }

  if(SB.frames%fireEvery===0 && t){ const base=angleTo(tank.x,tank.y,t.x,t.y); let fa=base; try{ const la=leadAngle({x:tank.x,y:tank.y},t,BULLET_SPEED); const delta=norm(la-base); fa=base+clamp(delta,-Math.PI/10,Math.PI/10);}catch(_){} tank.fire(fa);} 
}

