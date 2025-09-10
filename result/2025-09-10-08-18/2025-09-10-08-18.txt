
function name(){return "Raptor-10-1";}
function type(){return Type.TANKER;}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"maxLeadTime":16,"leadWeight":1,"aimJitter":0.18,"minRange":160,"maxRange":270,"strafeAngle":28,"threatRadius":160,"threatFleeBias":16,"allySep":64,"edgeMargin":46,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":24,"finishRemain":3,"finishMinDelta":36,"finishMaxDelta":26,"type":"Type.TANKER","bias":-12};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize low health, then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using interception time (bulletSpeed=8 px/tick)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    let vx=0, vy=0;
    if(__state.last && __state.last.x!==undefined){
      vx = (tgt.x-__state.last.x); // per tick estimate
      vy = (tgt.y-__state.last.y);
      if(__state.lastVel){
        vx = __state.lastVel.vx*0.5 + vx*0.5;
        vy = __state.lastVel.vy*0.5 + vy*0.5;
      }
      __state.lastVel = { vx, vy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed per tick
      const a = (vx*vx + vy*vy) - s*s;
      const b = 2*(dx*vx + dy*vy);
      const c = dx*dx + dy*dy;
      let t = 0;
      if (Math.abs(a) < 1e-6){
        if (Math.abs(b) > 1e-6){
          t = -c/b;
        } else {
          t = 0;
        }
      } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0){
          const sd = Math.sqrt(disc);
          const t1 = (-b - sd)/(2*a);
          const t2 = (-b + sd)/(2*a);
          const cand = [t1, t2].filter(x=>x>0).sort((x,y)=>x-y);
          t = cand.length>0 ? cand[0] : 0;
        }
      }
      t = clamp(t, 0, P.maxLeadTime);
      aimX = tgt.x + vx*t*P.leadWeight;
      aimY = tgt.y + vy*t*P.leadWeight;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + ( (((tank.x*13+tank.y*7)|0)%2) ? P.strafeAngle : -P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Raptor-10-2";}
function type(){return Type.TANKER;}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"maxLeadTime":16,"leadWeight":1,"aimJitter":0.18,"minRange":165,"maxRange":275,"strafeAngle":28,"threatRadius":160,"threatFleeBias":16,"allySep":64,"edgeMargin":46,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":24,"finishRemain":3,"finishMinDelta":36,"finishMaxDelta":26,"type":"Type.TANKER","bias":12};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize low health, then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using interception time (bulletSpeed=8 px/tick)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    let vx=0, vy=0;
    if(__state.last && __state.last.x!==undefined){
      vx = (tgt.x-__state.last.x); // per tick estimate
      vy = (tgt.y-__state.last.y);
      if(__state.lastVel){
        vx = __state.lastVel.vx*0.5 + vx*0.5;
        vy = __state.lastVel.vy*0.5 + vy*0.5;
      }
      __state.lastVel = { vx, vy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed per tick
      const a = (vx*vx + vy*vy) - s*s;
      const b = 2*(dx*vx + dy*vy);
      const c = dx*dx + dy*dy;
      let t = 0;
      if (Math.abs(a) < 1e-6){
        if (Math.abs(b) > 1e-6){
          t = -c/b;
        } else {
          t = 0;
        }
      } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0){
          const sd = Math.sqrt(disc);
          const t1 = (-b - sd)/(2*a);
          const t2 = (-b + sd)/(2*a);
          const cand = [t1, t2].filter(x=>x>0).sort((x,y)=>x-y);
          t = cand.length>0 ? cand[0] : 0;
        }
      }
      t = clamp(t, 0, P.maxLeadTime);
      aimX = tgt.x + vx*t*P.leadWeight;
      aimY = tgt.y + vy*t*P.leadWeight;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + ( (((tank.x*13+tank.y*7)|0)%2) ? P.strafeAngle : -P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Raptor-10-3";}
function type(){return Type.DEALER;}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"maxLeadTime":16,"leadWeight":1,"aimJitter":0.18,"minRange":210,"maxRange":380,"strafeAngle":32,"threatRadius":160,"threatFleeBias":16,"allySep":64,"edgeMargin":46,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":24,"finishRemain":3,"finishMinDelta":36,"finishMaxDelta":26,"type":"Type.DEALER","bias":-4};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize low health, then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using interception time (bulletSpeed=8 px/tick)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    let vx=0, vy=0;
    if(__state.last && __state.last.x!==undefined){
      vx = (tgt.x-__state.last.x); // per tick estimate
      vy = (tgt.y-__state.last.y);
      if(__state.lastVel){
        vx = __state.lastVel.vx*0.5 + vx*0.5;
        vy = __state.lastVel.vy*0.5 + vy*0.5;
      }
      __state.lastVel = { vx, vy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed per tick
      const a = (vx*vx + vy*vy) - s*s;
      const b = 2*(dx*vx + dy*vy);
      const c = dx*dx + dy*dy;
      let t = 0;
      if (Math.abs(a) < 1e-6){
        if (Math.abs(b) > 1e-6){
          t = -c/b;
        } else {
          t = 0;
        }
      } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0){
          const sd = Math.sqrt(disc);
          const t1 = (-b - sd)/(2*a);
          const t2 = (-b + sd)/(2*a);
          const cand = [t1, t2].filter(x=>x>0).sort((x,y)=>x-y);
          t = cand.length>0 ? cand[0] : 0;
        }
      }
      t = clamp(t, 0, P.maxLeadTime);
      aimX = tgt.x + vx*t*P.leadWeight;
      aimY = tgt.y + vy*t*P.leadWeight;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + ( (((tank.x*13+tank.y*7)|0)%2) ? P.strafeAngle : -P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Raptor-10-4";}
function type(){return Type.DEALER;}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"maxLeadTime":16,"leadWeight":1,"aimJitter":0.18,"minRange":200,"maxRange":370,"strafeAngle":26,"threatRadius":160,"threatFleeBias":16,"allySep":64,"edgeMargin":46,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":24,"finishRemain":3,"finishMinDelta":36,"finishMaxDelta":26,"type":"Type.DEALER","bias":4};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize low health, then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using interception time (bulletSpeed=8 px/tick)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    let vx=0, vy=0;
    if(__state.last && __state.last.x!==undefined){
      vx = (tgt.x-__state.last.x); // per tick estimate
      vy = (tgt.y-__state.last.y);
      if(__state.lastVel){
        vx = __state.lastVel.vx*0.5 + vx*0.5;
        vy = __state.lastVel.vy*0.5 + vy*0.5;
      }
      __state.lastVel = { vx, vy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed per tick
      const a = (vx*vx + vy*vy) - s*s;
      const b = 2*(dx*vx + dy*vy);
      const c = dx*dx + dy*dy;
      let t = 0;
      if (Math.abs(a) < 1e-6){
        if (Math.abs(b) > 1e-6){
          t = -c/b;
        } else {
          t = 0;
        }
      } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0){
          const sd = Math.sqrt(disc);
          const t1 = (-b - sd)/(2*a);
          const t2 = (-b + sd)/(2*a);
          const cand = [t1, t2].filter(x=>x>0).sort((x,y)=>x-y);
          t = cand.length>0 ? cand[0] : 0;
        }
      }
      t = clamp(t, 0, P.maxLeadTime);
      aimX = tgt.x + vx*t*P.leadWeight;
      aimY = tgt.y + vy*t*P.leadWeight;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + ( (((tank.x*13+tank.y*7)|0)%2) ? P.strafeAngle : -P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Raptor-10-5";}
function type(){return Type.NORMAL;}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"maxLeadTime":16,"leadWeight":1,"aimJitter":0.18,"minRange":190,"maxRange":340,"strafeAngle":28,"threatRadius":160,"threatFleeBias":16,"allySep":64,"edgeMargin":46,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":24,"finishRemain":3,"finishMinDelta":36,"finishMaxDelta":26,"type":"Type.NORMAL","bias":-6};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize low health, then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using interception time (bulletSpeed=8 px/tick)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    let vx=0, vy=0;
    if(__state.last && __state.last.x!==undefined){
      vx = (tgt.x-__state.last.x); // per tick estimate
      vy = (tgt.y-__state.last.y);
      if(__state.lastVel){
        vx = __state.lastVel.vx*0.5 + vx*0.5;
        vy = __state.lastVel.vy*0.5 + vy*0.5;
      }
      __state.lastVel = { vx, vy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed per tick
      const a = (vx*vx + vy*vy) - s*s;
      const b = 2*(dx*vx + dy*vy);
      const c = dx*dx + dy*dy;
      let t = 0;
      if (Math.abs(a) < 1e-6){
        if (Math.abs(b) > 1e-6){
          t = -c/b;
        } else {
          t = 0;
        }
      } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0){
          const sd = Math.sqrt(disc);
          const t1 = (-b - sd)/(2*a);
          const t2 = (-b + sd)/(2*a);
          const cand = [t1, t2].filter(x=>x>0).sort((x,y)=>x-y);
          t = cand.length>0 ? cand[0] : 0;
        }
      }
      t = clamp(t, 0, P.maxLeadTime);
      aimX = tgt.x + vx*t*P.leadWeight;
      aimY = tgt.y + vy*t*P.leadWeight;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + ( (((tank.x*13+tank.y*7)|0)%2) ? P.strafeAngle : -P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}


// ===== 다음 로봇 =====


function name(){return "Raptor-10-6";}
function type(){return Type.NORMAL;}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P={"maxLeadTime":16,"leadWeight":1,"aimJitter":0.18,"minRange":185,"maxRange":330,"strafeAngle":28,"threatRadius":160,"threatFleeBias":16,"allySep":64,"edgeMargin":46,"targetHealthWeight":1.25,"targetDistWeight":0.1,"finishHp":24,"finishRemain":3,"finishMinDelta":36,"finishMaxDelta":26,"type":"Type.NORMAL","bias":6};
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const toRad=(a)=>a*Math.PI/180;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;

  __state.tick = (__state.tick||0) + 1;

  // 1) Target selection: prioritize low health, then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const key = e.health*P.targetHealthWeight + e.distance*P.targetDistWeight;
    if(key<best){best=key; tgt=e;}
  }

  // 2) Predictive aim using interception time (bulletSpeed=8 px/tick)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    let vx=0, vy=0;
    if(__state.last && __state.last.x!==undefined){
      vx = (tgt.x-__state.last.x); // per tick estimate
      vy = (tgt.y-__state.last.y);
      if(__state.lastVel){
        vx = __state.lastVel.vx*0.5 + vx*0.5;
        vy = __state.lastVel.vy*0.5 + vy*0.5;
      }
      __state.lastVel = { vx, vy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed per tick
      const a = (vx*vx + vy*vy) - s*s;
      const b = 2*(dx*vx + dy*vy);
      const c = dx*dx + dy*dy;
      let t = 0;
      if (Math.abs(a) < 1e-6){
        if (Math.abs(b) > 1e-6){
          t = -c/b;
        } else {
          t = 0;
        }
      } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0){
          const sd = Math.sqrt(disc);
          const t1 = (-b - sd)/(2*a);
          const t2 = (-b + sd)/(2*a);
          const cand = [t1, t2].filter(x=>x>0).sort((x,y)=>x-y);
          t = cand.length>0 ? cand[0] : 0;
        }
      }
      t = clamp(t, 0, P.maxLeadTime);
      aimX = tgt.x + vx*t*P.leadWeight;
      aimY = tgt.y + vy*t*P.leadWeight;
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.08 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // 3) Bullet avoidance (nearest approach within radius)
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( ((tank.x*97+tank.y*131)|0)%2 ? 1 : -1 ) * P.threatFleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edgeMargin){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edgeMargin){ if(tryMove(180)) return; }
  if(tank.y < P.edgeMargin){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edgeMargin){ if(tryMove(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.allySep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // 6) Engagement spacing + strafing (adaptive aggression)
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    let minR=P.minRange, maxR=P.maxRange;
    const remain = enemies.length;
    if((tgt.health<=P.finishHp) || remain<=P.finishRemain){ minR-=P.finishMinDelta; maxR-=P.finishMaxDelta; }
    if(d < minR){
      const away = to+180 + P.bias*0.4;
      if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + ( (((tank.x*13+tank.y*7)|0)%2) ? P.strafeAngle : -P.strafeAngle) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // 7) Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
