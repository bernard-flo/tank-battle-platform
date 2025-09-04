// Normal Support v1 — 아군 보호/정렬, 포커스 파이어 동조
function name() { return 'Normal Support'; }
function type() { return Type.NORMAL; }

const S5 = { frames:0 };
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);} 
function angleTo(ax,ay,bx,by){return Math.atan2(by-ay,bx-ax);} 
function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function center(all){ const n=all&&all.length||0; if(!n) return null; return {x: all.reduce((s,a)=>s+a.x,0)/n, y: all.reduce((s,a)=>s+a.y,0)/n}; }
function chooseCommonTarget(enemies,allies){ if(!enemies||!enemies.length) return null; // 아군이 가까운 적을 공통 타겟으로 가정
  let best=null,bscore=1e9; for(const e of enemies){ let sum=0; for(const a of (allies||[])){ sum += dist(a,e);} if(sum<bscore){bscore=sum; best=e;} } return best; }
function leadAngle(src,dst,vBullet){ const dx=dst.x-src.x,dy=dst.y-src.y; const dvx=dst.vx||0,dvy=dst.vy||0; const A=dvx*dvx+dvy*dvy - vBullet*vBullet, B=2*(dx*dvx+dy*dvy), C=dx*dx+dy*dy; let t=0; const D=B*B-4*A*C; if(Math.abs(A)<1e-6) t=-C/(B||-1); else if(D>=0){const t1=(-B+Math.sqrt(D))/(2*A),t2=(-B-Math.sqrt(D))/(2*A); t=Math.max(t1,t2);} if(!isFinite(t)||t<0)t=0; const tx=dst.x+dvx*t, ty=dst.y+dvy*t; return Math.atan2(ty-src.y, tx-src.x);} 
function wall(tank,a){ const W=800,H=600,m=28; let r=a; if(tank.x<m) r=0; else if(tank.x>W-m) r=Math.PI; if(tank.y<m) r=Math.PI/2; else if(tank.y>H-m) r=-Math.PI/2; return r; }

function update(tank,enemies,allies,bulletInfo){
  S5.frames++; const P=(typeof PARAMS!=='undefined'&&PARAMS)||{}; const BULLET_SPEED=P.bulletSpeed??400; const midR=P.mid_range??240; const alignW=P.align_weight??0.4; const fireEvery=P.fire_every_frames??5;
  const cen=center(allies); const t=chooseCommonTarget(enemies,allies);
  if(cen){ let toC=angleTo(tank.x,tank.y,cen.x,cen.y); let toE = t? angleTo(tank.x,tank.y,t.x,t.y): toC; let moveA = norm(toE*(1-alignW) + toC*alignW); moveA = wall(tank,moveA); let ok=tank.move(moveA); if(!ok){ for(let i=1;i<=5 && !ok;i++){ ok=tank.move(moveA+i*Math.PI/16)||tank.move(moveA-i*Math.PI/16);} } if(t){ const d=dist(tank,t); if(d>midR*1.2) tank.move(angleTo(tank.x,tank.y,t.x,t.y)); else if(d<midR*0.8) tank.move(angleTo(tank.x,tank.y,t.x,t.y)+Math.PI); } }
  else if(t){ let to=angleTo(tank.x,tank.y,t.x,t.y); to=wall(tank,to); tank.move(to); }

  if(S5.frames%fireEvery===0 && t){ const base=angleTo(tank.x,tank.y,t.x,t.y); let fa=base; try{ const la=leadAngle({x:tank.x,y:tank.y},t,BULLET_SPEED); const delta=norm(la-base); fa=base+clamp(delta,-Math.PI/10,Math.PI/10);}catch(_){} tank.fire(fa);} 
}

