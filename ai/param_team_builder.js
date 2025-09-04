// 파라미터 기반 6개 탱크 코드 생성기
// 역할: 탱커2(Front, Anchor), 딜러2(Striker/Kiter, Sniper), 노말2(Interceptor, Sweeper)
// 산출물: 각 역할의 name(), type(), update() 함수로 이루어진 순수 코드 문자열

export function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

export function buildTeam(params){
  const p = withDefaults(params);
  return [
    { file: 'omega_bulldozer.js', code: templateBulldozer(p.bulldozer) },
    { file: 'omega_anchor.js', code: templateAnchor(p.anchor) },
    { file: 'omega_striker.js', code: templateStriker(p.striker) },
    { file: 'omega_sniper.js', code: templateSniper(p.sniper) },
    { file: 'omega_interceptor.js', code: templateInterceptor(p.interceptor) },
    { file: 'omega_sweeper.js', code: templateSweeper(p.sweeper) }
  ];
}

function withDefaults(params={}){
  // 각 역할별 기본 파라미터
  const def = {
    bulldozer: { dodgeTTI: 24, dodgePad: 10, spreadFar: 10, spreadNear: 6, engageDist: 120, centerPull: 0.35 },
    anchor:    { lineNear: 120, dodgeTTI: 20, dodgePad: 6, fireJitter: 8 },
    striker:   { kite: 210, kiteTol: 40, leadScale: 0.25, dodgeTTI: 22 },
    sniper:    { prefer: 260, near: 40, far: 80, leadBase: 9, leadScale: 0.25, jitter: 4 },
    interceptor:{ centerDist: 220, dodgeTTI: 24 },
    sweeper:   { orbitNear: 200, offsetsFar: [-6,0,6], offsetsNear: [-4,0,4] }
  };
  return {
    bulldozer: { ...def.bulldozer, ...(params.bulldozer||{}) },
    anchor:    { ...def.anchor,    ...(params.anchor||{}) },
    striker:   { ...def.striker,   ...(params.striker||{}) },
    sniper:    { ...def.sniper,    ...(params.sniper||{}) },
    interceptor:{ ...def.interceptor, ...(params.interceptor||{}) },
    sweeper:   { ...def.sweeper,   ...(params.sweeper||{}) }
  };
}

function header(name, typeExpr){
  return `function name(){return '${name}';}\nfunction type(){return ${typeExpr};}`;
}

function utilTryMove(){
  return `function tryMove(angles){for(let a of angles){if(tank.move(a))return true;}return false;}`;
}

function utilThreat(ttilimit, pad){
  // TTI 기반 위협 평가 유틸리티. ttilimit(프레임), pad(여유)
  return `function bestThreat(){let best=null,score=1e9;for(let b of bulletInfo){const rx=b.x-tank.x,ry=b.y-tank.y,vx=b.vx,vy=b.vy;const s2=vx*vx+vy*vy;if(!s2)continue;const t=-(rx*vx+ry*vy)/s2;if(t<0||t>${ttilimit})continue;const cx=rx+vx*t,cy=ry+vy*t;const d=Math.hypot(cx,cy);const safe=tank.size/2+${pad};if(d>safe+${pad})continue;const sc=d*0.88+t*3;if(sc<score){score=sc;best=b;}}return best;}`;
}

function templateBulldozer(p){
  const body = `
    ${utilTryMove()}${utilThreat(p.dodgeTTI, p.dodgePad)}
    if(!enemies||!enemies.length)return;
    // 팀 집중사격: 체력/거리 가중치
    let tgt=enemies[0];
    for(let e of enemies){const s1=Math.max(0,tgt.health)*0.6 + tgt.distance*0.25; const s2=Math.max(0,e.health)*0.6 + e.distance*0.25; if(s2<s1) tgt=e;}
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
    const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI; const toT=Math.atan2(tgt.y-tank.y,tgt.x-tank.x)*180/Math.PI;
    let dodged=false; const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; dodged=tryMove([deg,deg+20,deg-20,deg+40,deg-40]);}
    if(!dodged){
      const cx=450, cy=300; const toF=Math.atan2(cy-tank.y,cx-tank.x)*180/Math.PI;
      const desired=(tgt.distance>${p.engageDist})? toC : toT; const pull=${p.centerPull};
      const mix=desired*(1-pull) + toF*pull; tryMove([mix, mix+15, mix-15, desired, desired+35, desired-35]);
    }
    const spread = tgt.distance>160? ${p.spreadFar} : ${p.spreadNear}; const jitter=(Math.random()-0.5)*spread; tank.fire(toT + jitter);
  `;
  return [header('Omega Bulldozer','Type.TANKER'), `function update(tank,enemies,allies,bulletInfo){${body}}`].join('\n');
}

function templateAnchor(p){
  const body = `
    ${utilTryMove()}${utilThreat(p.dodgeTTI, p.dodgePad)}
    if(!enemies||!enemies.length)return;
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length;
    const acx=allies.length?allies.reduce((s,a)=>s+a.x,0)/allies.length:tank.x; const acy=allies.length?allies.reduce((s,a)=>s+a.y,0)/allies.length:tank.y;
    const fx=(acx*2+ecx)/3, fy=(acy*2+ecy)/3; const toF=Math.atan2(fy-tank.y,fx-tank.x)*180/Math.PI; const df=Math.hypot(fx-tank.x,fy-tank.y);
    let ang = df<${p.lineNear}? toF+90 : toF;
    let avoided=false; const th=bestThreat(); if(th){const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; avoided=tryMove([deg,deg+20,deg-20,deg+35,deg-35]);}
    if(!avoided) tryMove([ang, ang+15, ang-15, toF]);
    let n=enemies[0]; for(let e of enemies){const s1=Math.max(0,n.health)*0.6+n.distance*0.25;const s2=Math.max(0,e.health)*0.6+e.distance*0.25; if(s2<s1)n=e;}
    const toN=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; const jitter=(Math.random()-0.5)*${p.fireJitter}; tank.fire(toN + jitter);
  `;
  return [header('Omega Anchor','Type.TANKER'), `function update(tank,enemies,allies,bulletInfo){${body}}`].join('\n');
}

function templateStriker(p){
  const body = `
    ${utilTryMove()}${utilThreat(p.dodgeTTI, 8)}
    if(!enemies||!enemies.length)return;
    let n=enemies[0]; for(let e of enemies){const s1=Math.max(0,n.health)*0.6+n.distance*0.25;const s2=Math.max(0,e.health)*0.6+e.distance*0.25; if(s2<s1)n=e;}
    const to=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; const err=n.distance-${p.kite};
    let strafe = to + 90*(Math.random()<0.5?1:-1);
    if(Math.abs(err)>${p.kiteTol}) strafe = err<0? to+180 : to;
    let dodged=false; const th=bestThreat(); if(th){ const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; dodged=tryMove([deg,deg+20,deg-20,deg+40,deg-40]); }
    if(!dodged) tryMove([strafe, strafe+20, strafe-20, to, to+180]);
    const lead=Math.min(20, Math.max(-20, n.distance/11)); tank.fire(to + (err>0? (lead*${p.leadScale}) : 0));
  `;
  return [header('Omega Striker','Type.DEALER'), `function update(tank,enemies,allies,bulletInfo){${body}}`].join('\n');
}

function templateSniper(p){
  const body = `
    ${utilTryMove()}
    if(!enemies||!enemies.length)return;
    let t=enemies[0]; for(let e of enemies) if(e.health<t.health) t=e;
    const to=Math.atan2(t.y-tank.y,t.x-tank.x)*180/Math.PI; const err=t.distance-${p.prefer};
    let ang=to+90*(Math.random()<0.5?1:-1); if(err<-${p.near}) ang=to+180; if(err>${p.far}) ang=to; tryMove([ang, ang+20, ang-20, to+180]);
    const lead=Math.min(24, Math.max(-24, t.distance/${p.leadBase})); const jitter=(Math.random()-0.5)*${p.jitter}; tank.fire(to + (err>0? lead*${p.leadScale}:0) + jitter);
  `;
    return [header('Omega Sniper','Type.DEALER'), `function update(tank,enemies,allies,bulletInfo){${body}}`].join('\n');
}

function templateInterceptor(p){
  const body = `
    ${utilTryMove()}${utilThreat(p.dodgeTTI, 10)}
    if(!enemies||!enemies.length)return;
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI;
    const th=bestThreat(); if(th){ const deg=(Math.atan2(th.vy,th.vx)+Math.PI/2)*180/Math.PI; if(!tryMove([deg,deg+25,deg-25,deg+45,deg-45])) tryMove([deg+160,deg-160]); }
    else { const d=Math.hypot(ecx-tank.x,ecy-tank.y); let ang=toC + (d<${p.centerDist}?180:90)*(Math.random()<0.5?1:-1); tryMove([ang, ang+20, ang-20, toC]); }
    let n=enemies[0]; for(let e of enemies) if(e.distance<n.distance) n=e; const to=Math.atan2(n.y-tank.y,n.x-tank.x)*180/Math.PI; tank.fire(to);
  `;
  return [header('Omega Interceptor','Type.NORMAL'), `function update(tank,enemies,allies,bulletInfo){${body}}`].join('\n');
}

function templateSweeper(p){
  const body = `
    ${utilTryMove()}
    if(!enemies||!enemies.length)return;
    const ecx=enemies.reduce((s,e)=>s+e.x,0)/enemies.length; const ecy=enemies.reduce((s,e)=>s+e.y,0)/enemies.length; const toC=Math.atan2(ecy-tank.y,ecx-tank.x)*180/Math.PI;
    const d=Math.hypot(ecx-tank.x,ecy-tank.y); let orbit=toC + (d<${p.orbitNear}?180:90); tryMove([orbit, orbit+20, orbit-20, toC]);
    let tgt=enemies[0]; for(let e of enemies){const s1=tgt.distance+Math.max(0,tgt.health)*0.02; const s2=e.distance+Math.max(0,e.health)*0.02; if(s2<s1) tgt=e;}
    const toT=Math.atan2(tgt.y-tank.y,tgt.x-tank.x)*180/Math.PI; const off=(tgt.distance>200? ${JSON.stringify(p.offsetsFar)} : ${JSON.stringify(p.offsetsNear)}); tank.fire(toT + off[Math.floor(Math.random()*off.length)]);
  `;
  return [header('Omega Sweeper','Type.NORMAL'), `function update(tank,enemies,allies,bulletInfo){${body}}`].join('\n');
}

