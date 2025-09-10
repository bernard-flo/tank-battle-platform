#!/usr/bin/env node
/*
Generate candidate team code files for the tank battle platform.
Outputs files into ./candidates
*/
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, 'candidates');
fs.mkdirSync(outDir, { recursive: true });

function makeRobotBlock(label, tankType, P) {
  const esc = (x) => String(x).replace(/"/g, '\\"');
  return `function name(){return "${esc(label)}";}
function type(){return ${tankType};}
let __state={last:null};
function update(tank,enemies,allies,bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
  const P=${JSON.stringify(P)};

  // Focus target: prioritize low health and proximity
  let tgt=null; let best=1e12;
  for(const e of enemies){
    const key = e.health*P.healthBias + e.distance*P.distBias;
    if(key<best){best=key; tgt=e;}
  }

  // Aiming with linear lead (approx using last-frame velocity)
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last && __state.last.hasOwnProperty('x')){
      const vx=(tgt.x-__state.last.x); // px per tick
      const vy=(tgt.y-__state.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y;
      const s=8; // bullet speed px/tick
      const a = vx*vx+vy*vy - s*s;
      const b = 2*(dx*vx+dy*vy);
      const c = dx*dx+dy*dy;
      let t=null;
      if (Math.abs(a) < 1e-6) {
        t = c/(-b); // fallback when a~0
      } else {
        const D = b*b - 4*a*c;
        if (D >= 0) {
          const t1 = (-b + Math.sqrt(D))/(2*a);
          const t2 = (-b - Math.sqrt(D))/(2*a);
          t = Math.min(t1,t2);
          if (!(t>0)) t = Math.max(t1,t2);
        }
      }
      if (t && t>0 && t<P.leadCap) {
        aimX = tgt.x + vx*t*P.leadWeight;
        aimY = tgt.y + vy*t*P.leadWeight;
      } else {
        const d = Math.hypot(dx,dy);
        const tLead = clamp(d/s,0,P.leadCap);
        aimX = tgt.x + vx*tLead*P.leadWeight*0.6;
        aimY = tgt.y + vy*tLead*P.leadWeight*0.6;
      }
    }
    const jitter = (((tank.x*31+tank.y*17)%23)-11)*0.05 * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x: tgt.x, y: tgt.y };
  }

  // Movement helpers
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};
  const edge=(m)=>{
    if(tank.x < m && tryMove(0)) return true;
    if(tank.x > 900-m && tryMove(180)) return true;
    if(tank.y < m && tryMove(90)) return true;
    if(tank.y > 600-m && tryMove(270)) return true;
    return false;
  };

  // Bullet threat detection using nearest approach
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatRadius){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = ( (tank.x*13+tank.y*7)%2 ? 1 : -1 );
    const cand=[a+90+P.bias*side, a-90-P.bias*side, a+120, a-120];
    for(const c of cand){ if(tryMove(c)) return; }
  }

  if(edge(P.edgeMargin)) return;

  // Ally separation
  let nearA=null; let ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; nearA=a; } }
  if(nearA && ad < P.allySep){
    const away = toDeg(tank.x-nearA.x, tank.y-nearA.y);
    if(tryMove(away)) return; if(tryMove(away+30)) return; if(tryMove(away-30)) return;
  }

  // Engagement spacing and strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d = tgt.distance;
    if(d < P.minRange){
      const away = to+180 + P.bias*0.5;
      if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return;
    } else if(d > P.maxRange){
      if(tryMove(to)) return; if(tryMove(to+18)) return; if(tryMove(to-18)) return;
    } else {
      const dir = ((tank.x*5+tank.y*3)%2 ? 1 : -1);
      const side = to + dir*P.strafeAngle + P.bias*0.3;
      if(tryMove(side)) return; if(tryMove(side+18)) return; if(tryMove(side-18)) return;
    }
  }

  // Fallback sweeping
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
`;
}

function teamCode(name, roles) {
  const blocks = [];
  for (let i=0;i<6;i++){
    const r = roles[i];
    const label = `${name}-${i+1}`;
    const typeExpr = r.type === 'TANKER' ? 'Type.TANKER' : (r.type==='DEALER' ? 'Type.DEALER' : 'Type.NORMAL');
    blocks.push(makeRobotBlock(label, typeExpr, r.P));
    if (i<5) blocks.push('\n\n// ===== 다음 로봇 =====\n\n');
  }
  return blocks.join('');
}

function writeTeam(name, roles){
  const code = teamCode(name, roles);
  const out = path.join(outDir, `${name}.txt`);
  fs.writeFileSync(out, code);
  return out;
}

function baseRoles(profile){
  // profile: tankMin, tankMax, dealerMin, dealerMax, threat, strafe, bias
  return [
    { type:'TANKER', P: { leadCap:10, leadWeight:1, aimJitter:0.2, minRange:profile.tankMin, maxRange:profile.tankMax, strafeAngle:profile.strafe, threatRadius:profile.threat, allySep:60, edgeMargin:45, bias: profile.bias, healthBias: 1.3, distBias: 0.12 } },
    { type:'TANKER', P: { leadCap:10, leadWeight:1, aimJitter:0.2, minRange:profile.tankMin, maxRange:profile.tankMax, strafeAngle:profile.strafe, threatRadius:profile.threat, allySep:60, edgeMargin:45, bias:-profile.bias, healthBias: 1.3, distBias: 0.12 } },
    { type:'DEALER', P: { leadCap:10, leadWeight:1.1, aimJitter:0.22, minRange:profile.dealerMin, maxRange:profile.dealerMax, strafeAngle:profile.strafe+6, threatRadius:profile.threat+2, allySep:60, edgeMargin:45, bias: profile.bias*0.5, healthBias: 1.25, distBias: 0.10 } },
    { type:'DEALER', P: { leadCap:10, leadWeight:1.1, aimJitter:0.22, minRange:profile.dealerMin, maxRange:profile.dealerMax, strafeAngle:profile.strafe+6, threatRadius:profile.threat+2, allySep:60, edgeMargin:45, bias:-profile.bias*0.5, healthBias: 1.25, distBias: 0.10 } },
    { type:'DEALER', P: { leadCap:10, leadWeight:1.05, aimJitter:0.22, minRange:profile.dealerMin-10, maxRange:profile.dealerMax-10, strafeAngle:profile.strafe+2, threatRadius:profile.threat+3, allySep:60, edgeMargin:45, bias: profile.bias*0.2, healthBias: 1.22, distBias: 0.11 } },
    { type:'NORMAL', P: { leadCap:10, leadWeight:1.0, aimJitter:0.2, minRange:Math.round((profile.tankMin+profile.dealerMin)/2), maxRange:Math.round((profile.tankMax+profile.dealerMax)/2), strafeAngle:profile.strafe+4, threatRadius:profile.threat+1, allySep:60, edgeMargin:45, bias: 0, healthBias: 1.28, distBias: 0.11 } },
  ];
}

function main(){
  const variants = [
    { name: 'ares_v1', profile: { tankMin:160, tankMax:260, dealerMin:220, dealerMax:330, threat:70, strafe:28, bias:10 } },
    { name: 'ares_v2', profile: { tankMin:160, tankMax:260, dealerMin:220, dealerMax:330, threat:72, strafe:30, bias:8 } },
    { name: 'ares_v3', profile: { tankMin:150, tankMax:250, dealerMin:210, dealerMax:320, threat:68, strafe:26, bias:12 } },
    { name: 'ares_v4', profile: { tankMin:170, tankMax:270, dealerMin:230, dealerMax:340, threat:74, strafe:32, bias:6 } },
    { name: 'ares_v5', profile: { tankMin:165, tankMax:265, dealerMin:225, dealerMax:335, threat:71, strafe:29, bias:9 } },
    { name: 'ares_v6', profile: { tankMin:155, tankMax:255, dealerMin:215, dealerMax:325, threat:69, strafe:27, bias:11 } },
    { name: 'ares_v7', profile: { tankMin:160, tankMax:255, dealerMin:215, dealerMax:330, threat:73, strafe:31, bias:7 } },
    { name: 'ares_v8', profile: { tankMin:175, tankMax:275, dealerMin:235, dealerMax:345, threat:75, strafe:33, bias:5 } },
  ];

  const outputs = [];
  for(const v of variants){
    const roles = baseRoles(v.profile);
    const file = writeTeam(v.name, roles);
    outputs.push(file);
  }
  console.log(JSON.stringify(outputs, null, 2));
}

if (require.main === module) main();
