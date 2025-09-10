#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Generate a 6-bot team code compatible with tank_battle_platform.html and simulator
// Team name: Nova-9 (variants per slot)

function robotBlock(label, typeConst, idx, P) {
  // Slightly vary certain params by robot index for diversity
  const jitterSeed = idx * 11;
  const sideFlip = ((idx * 17) % 2 ? 1 : -1);
  const block = `function name(){return \"Nova-9-${label}\";}
function type(){return ${typeConst};}
let __s_${idx} = { last:null, tick:0, lastVel:null, side:${sideFlip} };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P=${JSON.stringify(P)};
  const S=__s_${idx};
  S.tick=(S.tick||0)+1;

  // 1) Target selection with role bias (prefer dealers/low health, then distance)
  let tgt=null, best=1e18;
  for(const e of enemies){
    // infer type by size heuristic if available (dealer ~33, tanker ~45, normal ~35)
    let tBias=0; // negative -> prefer
    const sz = e.size || 0;
    if(sz>=43) tBias += P.tankerBias; // tanker
    else if(sz<=34) tBias += P.dealerBias; // dealer
    const k = e.health*P.healthW + e.distance*P.distW + tBias;
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim using quadratic intercept solve (s=8 px/tick)
  if(tgt){
    let ax=tgt.x, ay=tgt.y; let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*P.velLP + ivx*(1-P.velLP);
      vy = lvy*P.velLP + ivy*(1-P.velLP);
      S.lastVel={vx,vy};
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y; const s2=64;
      const aa = vx*vx + vy*vy - s2;
      const bb = 2*(rx*vx + ry*vy);
      const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) {
        tHit = bb !== 0 ? CL(-cc / bb, 0, P.leadCap) : 0;
      } else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd = Math.sqrt(disc);
          const t1 = (-bb - sd) / (2*aa);
          const t2 = (-bb + sd) / (2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, P.leadCap);
        } else {
          const d = H(rx,ry); tHit = CL(d/8, 0, P.leadCap);
        }
      }
      ax = tgt.x + vx * P.leadW * tHit;
      ay = tgt.y + vy * P.leadW * tHit;
    }
    const jitter = ((((S.tick*13 + tank.x*7 + tank.y*3 + ${jitterSeed})%23)-11) * (P.aimJitter||0.12) * 0.07) + (P.aimBias||0);
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  // Helper to attempt moves: cap attempts locally (engine caps successes to 1)
  let tried=0; const go=(a)=>{ if(tried>20) return true; tried++; return tank.move(N(a)); };

  // 3) Bullet avoidance with time-to-collision weighting
  let hot=null, score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v;
    const proj=dx*nx+dy*ny; if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y);
      const tt=proj/v; // ticks to closest approach
      const s = dist + tt*P.threatH - (P.threatBonus||0);
      if(dist<P.threatR && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.4;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < P.edge){ if(go(0)) return; }
  if(tank.x > 900-P.edge){ if(go(180)) return; }
  if(tank.y < P.edge){ if(go(90)) return; }
  if(tank.y > 600-P.edge){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+16)) return; if(go(away-16)) return; }

  // 6) Range control + strafing
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=P.rMin, r1=P.rMax;
    if(tgt.health<=P.finisherHP || enemies.length<=P.aggrRemain){ r0=Math.max(120, r0-P.aggrIn); r1=Math.max(160, r1-P.aggrOut); }
    if(d<r0){ const aw=to+180+(P.bias||0)*0.3; if(go(aw)) return; if(go(aw+14)) return; if(go(aw-14)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+12)) return; if(go(to-12)) return; }
    else { const s=to + ((S.side||1) * P.strafe) + (P.bias||0)*0.4; if(go(s)) return; if(go(s+14)) return; if(go(s-14)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}`;
  return block;
}

function buildTeam(params) {
  const parts = [];
  // Slots: 2 Tankers (frontline), 2 Dealers (backline), 2 Normals (flex)
  const T = 'Type.TANKER';
  const D = 'Type.DEALER';
  const N = 'Type.NORMAL';

  // Tankers
  parts.push(robotBlock('T1', T, 0, params.tanker1));
  parts.push(robotBlock('T2', T, 1, params.tanker2));
  // Dealers
  parts.push(robotBlock('D1', D, 2, params.dealer1));
  parts.push(robotBlock('D2', D, 3, params.dealer2));
  // Normals
  parts.push(robotBlock('N1', N, 4, params.normal1));
  parts.push(robotBlock('N2', N, 5, params.normal2));

  return parts.join("\n\n\n// ===== 다음 로봇 =====\n\n\n");
}

function defaultParams() {
  const base = {
    // Targeting weights
    healthW: 1.24,
    distW: 0.085,
    dealerBias: -12,
    tankerBias: +6,
    // Aim
    velLP: 0.55,
    leadCap: 22,
    leadW: 1.10,
    aimJitter: 0.13,
    aimBias: 0,
    // Movement
    rMin: 210,
    rMax: 340,
    strafe: 24,
    sep: 76,
    edge: 60,
    threatR: 220,
    threatH: 5,
    threatBonus: 0,
    fleeBias: 16,
    finisherHP: 24,
    aggrRemain: 3,
    aggrIn: 28,
    aggrOut: 18,
    bias: 0,
  };
  // Role-specialized tweaks
  const tanker = { ...base, rMin: 190, rMax: 300, strafe: 22, bias: -6 };
  const dealer = { ...base, rMin: 280, rMax: 440, strafe: 28, leadW: 1.12, aimBias: -0.5, threatR: 200, sep: 72, edge: 64, dealerBias: -16, tankerBias: +8 };
  const normal = { ...base, rMin: 220, rMax: 350, strafe: 24, bias: +4 };
  return {
    tanker1: { ...tanker },
    tanker2: { ...tanker, rMin: 196, rMax: 308, bias: -8 },
    dealer1: { ...dealer },
    dealer2: { ...dealer, rMin: 294, rMax: 456, aimBias: -0.7 },
    normal1: { ...normal },
    normal2: { ...normal, bias: +6 },
  };
}

function variantParams(seedBias=0) {
  const p = defaultParams();
  // Small systematic variations to create 3 additional variants
  const tweak = (o, f) => Object.fromEntries(Object.entries(o).map(([k,v])=>[k, f(k,v)]));
  const scale = 1 + (seedBias%3 - 1) * 0.03; // 0.97, 1.0, 1.03
  for (const k of ['tanker1','tanker2','dealer1','dealer2','normal1','normal2']) {
    p[k] = tweak(p[k], (key, val) => {
      if (typeof val === 'number') return val * (['bias','aimBias'].includes(key)?1:scale);
      return val;
    });
  }
  // Role-specific nudges
  p.tanker1.rMin -= 6; p.tanker2.rMax += 8;
  p.dealer1.rMax += 12; p.dealer2.leadCap += 2;
  p.normal1.strafe += 2; p.normal2.strafe -= 2;
  return p;
}

function main() {
  const outDir = process.argv[2] || process.env.OUT_DIR || path.join('result', process.env.TS || 'temp');
  const outName = process.argv[3] || process.env.OUT_NAME || path.basename(outDir);
  const outPath = path.join(outDir, `${outName}.txt`);
  const variant = process.argv[4] ? parseInt(process.argv[4],10) : 0;
  const params = variant === 0 ? defaultParams() : variantParams(variant);
  const code = buildTeam(params);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, code);
  console.log(`Wrote team -> ${outPath}`);
}

if (require.main === module) main();

