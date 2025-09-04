// 강적 AI 스위트 (문자열 코드)
// 플랫폼과 동일한 인터페이스: name(), type(), update()

export const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };

function wrap(name, typeExpr, body){
  return `function name(){return '${name}';}\nfunction type(){return ${typeExpr};}\nfunction update(tank,enemies,allies,bulletInfo){${body}}`;
}

// 공통: TTI(가까워지는 시간) 기반 탄환 위협 감지 함수 소스
const threatUtil = `function bestThreat(){let best=null,score=1e9;for(let b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y,vx=b.vx,vy=b.vy;const s2=vx*vx+vy*vy;if(!s2)continue;const t=-(rx*vx+ry*vy)/s2;if(t<0||t>24)continue;const cx=rx+vx*t,cy=ry+vy*t;const d=Math.hypot(cx,cy);const safe=tank.size/2+8;if(d>safe+10)continue;const sc=d*0.88+t*3;if(sc<score){score=sc;best=b;}}return best;}`;

const tryMoveUtil = `function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}`;

// Aggro 탱커: 전진 압박 + 탄 회피
export const AggroTanker = wrap(
  'Adv Aggro Tanker', 'Type.TANKER',
  `${tryMoveUtil}${threatUtil}
   if(!enemies.length)return;let tgt=enemies[0];for(let e of enemies){if(e.distance<tgt.distance)tgt=e;}
   const to=Math.atan2(tgt.y-tank.y,tgt.x-tank.x)*180/Math.PI; const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI;
   const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; if(!tryMove([deg,deg+20,deg-20,deg+40,deg-40]))tryMove([deg+180]);} else { tryMove([to, to+15, to-15, toC]); }
   const jit=(Math.random()-0.5)*8; tank.fire(to+jit);`
);

// Shield 탱커: 아군 중심과 적 중심 사이 유지
export const ShieldTanker = wrap(
  'Shield Tanker', 'Type.TANKER',
  `${tryMoveUtil}${threatUtil}
   if(!enemies.length)return; const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const acx=allies.length?allies.reduce((s,a)=>s+a.x,0)/allies.length:tank.x; const acy=allies.length?allies.reduce((s,a)=>s+a.y,0)/allies.length:tank.y; const mx=(ecx+acx)/2,my=(ecy+acy)/2; const toM=Math.atan2(my-tank.y,mx-tank.x)*180/Math.PI;
   const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; tryMove([deg,deg+20,deg-20,deg+35,deg-35]);} else { tryMove([toM,toM+20,toM-20]); }
   let n=enemies[0];for(let e of enemies)if(e.distance<n.distance)n=e; const toN=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(toN+(Math.random()-0.5)*6);`
);

// Kiter: 중원거리 유지 + 스트레이프 + 약한 선행
export const Kiter = wrap(
  'Pro Kiter', 'Type.DEALER',
  `${tryMoveUtil}${threatUtil}
   if(!enemies.length)return; let n=enemies[0];for(let e of enemies)if(e.distance<n.distance)n=e; const to=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; const err=n.distance-220; let strafe=to+90*(Math.random()<0.5?1:-1); if(Math.abs(err)>40) strafe= err<0? to+180: to; const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; tryMove([deg,deg+25,deg-25,deg+45,deg-45]);} else { tryMove([strafe,strafe+20,strafe-20,to,to+180]); } tank.fire(to+(err>0? Math.min(18,Math.max(-18,n.distance/12))*0.25:0));`
);

// Interceptor: 탄 회피 최우선 + 적 중심 향한 탄젠셜 이동
export const Interceptor = wrap(
  'Pro Interceptor', 'Type.NORMAL',
  `${tryMoveUtil}${threatUtil}
   if(!enemies.length)return; const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI; const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; if(!tryMove([deg,deg+25,deg-25,deg+45,deg-45])) tryMove([deg+160,deg-160]); } else { const d=Math.hypot(ecx-tank.x, ecy-tank.y); let ang=toC + (d<220?180:90)*(Math.random()<0.5?1:-1); tryMove([ang,ang+20,ang-20,toC]); } let n=enemies[0]; for(let e of enemies) if(e.distance<n.distance) n=e; const to=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(to);`
);

// Sniper: 원거리 선호 + 더 강한 선행
export const Sniper = wrap(
  'Long Sniper', 'Type.DEALER',
  `${tryMoveUtil}
   if(!enemies.length)return; let t=enemies[0]; for(let e of enemies) if(e.health<t.health) t=e; const to=Math.atan2(t.y-tank.y,t.x-tank.x)*180/Math.PI; const err=t.distance-260; let ang=to+90*(Math.random()<0.5?1:-1); if(err<-40) ang=to+180; if(err>80) ang=to; tryMove([ang,ang+20,ang-20,to+180]); const lead=Math.min(24,Math.max(-24,t.distance/9)); const jitter=(Math.random()-0.5)*4; tank.fire(to+(err>0?lead*0.25:0)+jitter);`
);

// Sweeper: 적 중심을 따라가며 약한 산포 사격
export const Sweeper = wrap(
  'Center Sweeper', 'Type.NORMAL',
  `${tryMoveUtil}
   if(!enemies.length)return; const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI; const d=Math.hypot(ecx-tank.x,ecy-tank.y); let orbit=toC+ (d<200?180:90); tryMove([orbit,orbit+20,orbit-20,toC]); let tgt=enemies[0]; for(let e of enemies){const s1=tgt.distance+Math.max(0,tgt.health)*0.02; const s2=e.distance+Math.max(0,e.health)*0.02; if(s2<s1) tgt=e;} const toT=Math.atan2(tgt.y-tank.y,tgt.x-tank.x)*180/Math.PI; const off=[-6,0,6]; tank.fire(toT + off[Math.floor(Math.random()*off.length)]);`
);

export const adversaryPack = [AggroTanker, ShieldTanker, Kiter, Interceptor, Sniper, Sweeper];

