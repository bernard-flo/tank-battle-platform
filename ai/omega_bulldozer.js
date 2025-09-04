function name(){return 'Omega Bulldozer';}
function type(){return Type.TANKER;}
function update(tank,enemies,allies,bulletInfo){
    function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}function bestThreat(){let best=null,score=1e9;for(let b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y,vx=b.vx,vy=b.vy;const s2=vx*vx+vy*vy;if(!s2)continue;const t=-(rx*vx+ry*vy)/s2;if(t<0||t>24.692863045898704)continue;const cx=rx+vx*t,cy=ry+vy*t;const d=Math.hypot(cx,cy);const safe=tank.size/2+12.178304044154258;if(d>safe+12.178304044154258)continue;const sc=d*0.88+t*3;if(sc<score){score=sc;best=b;}}return best;}
    if(!enemies||!enemies.length)return;
    // 팀 집중사격: 체력/거리 가중치
    let tgt=enemies[0];
    for(let e of enemies){const s1=Math.max(0,tgt.health)*0.6 + tgt.distance*0.25; const s2=Math.max(0,e.health)*0.6 + e.distance*0.25; if(s2<s1) tgt=e;}
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
    const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI; const toT=Math.atan2(tgt.y-tank.y,tgt.x-tank.x)*180/Math.PI;
    let dodged=false; const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; dodged=tryMove([deg,deg+20,deg-20,deg+40,deg-40]);}
    if(!dodged){
      const cx=450, cy=300; const toF=Math.atan2(cy-tank.y,cx-tank.x)*180/Math.PI;
      const desired=(tgt.distance>144.3976463677829)? toC : toT; const pull=0.46720153795515384;
      const mix=desired*(1-pull) + toF*pull; tryMove([mix, mix+15, mix-15, desired, desired+35, desired-35]);
    }
    const spread = tgt.distance>160? 14 : 10; const jitter=(Math.random()-0.5)*spread; tank.fire(toT + jitter);
  }