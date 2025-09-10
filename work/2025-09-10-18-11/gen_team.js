#!/usr/bin/env node
/*
Generates a 6-bot team file compatible with tank_battle_platform.html import/export.

Usage:
  node gen_team.js --out team.txt --name Nova --seed 1
  node gen_team.js --out team.txt --params params.json

Params shape (optional):
{
  "teamName": "Nova",
  "roles": ["TANKER","TANKER","DEALER","DEALER","NORMAL","NORMAL"],
  "base": {
    "rMin": 200,
    "rMax": 320,
    "strafe": 22,
    "threatR": 210,
    "threatH": 5,
    "fleeBias": 14,
    "sep": 72,
    "edge": 60,
    "leadCap": 22,
    "leadW": 1.08,
    "aimJitter": 0.12,
    "healthW": 1.22,
    "distW": 0.09,
    "finisherHP": 24,
    "aggrRemain": 3,
    "aggrIn": 28,
    "aggrOut": 20,
    "aimBias": 0,
    "bias": 0
  }
}
*/
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n && !n.startsWith('--')) { args[k] = n; i++; }
      else { args[k] = true; }
    }
  }
  return args;
}

function rng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 0x100000000) / 0x100000000; };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function jitterP(base, r, rnd) {
  const out = { ...base };
  for (const k of Object.keys(out)) {
    const v = base[k];
    if (typeof v === 'number') {
      const scale = (k.includes('Min') || k.includes('Max')) ? 0.08 : 0.15;
      const mag = (rnd() * 2 - 1) * scale; // +/-
      out[k] = v + v * mag;
    }
  }
  // keep invariants
  if (out.rMin > out.rMax) [out.rMin, out.rMax] = [out.rMax, out.rMin];
  out.edge = clamp(out.edge, 40, 90);
  out.leadCap = clamp(out.leadCap, 12, 32);
  out.leadW = clamp(out.leadW, 0.9, 1.25);
  out.aimJitter = clamp(out.aimJitter, 0.05, 0.2);
  out.healthW = clamp(out.healthW, 0.8, 1.8);
  out.distW = clamp(out.distW, 0.02, 0.2);
  out.sep = clamp(out.sep, 50, 110);
  out.strafe = clamp(out.strafe, 12, 36);
  out.finisherHP = clamp(out.finisherHP, 10, 50);
  out.aggrRemain = Math.max(1, Math.min(5, Math.round(out.aggrRemain)));
  out.aggrIn = clamp(out.aggrIn, 10, 60);
  out.aggrOut = clamp(out.aggrOut, 10, 60);
  out.threatR = clamp(out.threatR, 160, 260);
  out.threatH = clamp(out.threatH, 3, 8);
  out.fleeBias = clamp(out.fleeBias, 8, 26);
  out.bias = clamp(out.bias, -20, 20);
  out.aimBias = clamp(out.aimBias || 0, -2, 2);
  return out;
}

function emitBot(idx, teamName, tankType, P, sideSeed) {
  const suffix = tankType === 'TANKER' ? 'T' : (tankType === 'DEALER' ? 'D' : 'N');
  const displayName = `${teamName}-${idx}-${suffix}`;
  const typeNum = { NORMAL: 'Type.NORMAL', TANKER: 'Type.TANKER', DEALER: 'Type.DEALER' }[tankType] || 'Type.NORMAL';
  const stateVar = `__state_${idx-1}`;
  const pJson = JSON.stringify(P);
  const sideJitter = ((sideSeed * 17) % 2 ? 1 : -1);
  return `function name(){return "${displayName}";}
function type(){return ${typeNum};}
let ${stateVar} = { last:null, tick:0, lastVel:null, side: (${sideSeed}*17)%2?1:-1 };
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot, D=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const N=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const CL=(v,l,h)=>v<l?l:v>h?h:v;
  const P=${pJson};
  const S=${stateVar};
  S.tick=(S.tick||0)+1;

  // 1) Target selection (weighted by health and distance)
  let tgt=null, best=1e18;
  for(const e of enemies){
    const k = e.health*${(P.healthW??1.2).toFixed(3)} + e.distance*${(P.distW??0.09).toFixed(3)};
    if(k<best){best=k; tgt=e;}
  }

  // 2) Predictive aim with quadratic intercept
  if(tgt){
    let ax=tgt.x, ay=tgt.y;
    let vx=0, vy=0;
    if(S.last){
      const lvx=S.lastVel?S.lastVel.vx:0, lvy=S.lastVel?S.lastVel.vy:0;
      const ivx=(tgt.x-S.last.x), ivy=(tgt.y-S.last.y);
      vx = lvx*0.5 + ivx*0.5; vy = lvy*0.5 + ivy*0.5; // low-pass blend
      S.lastVel={vx,vy};
      const rx = tgt.x - tank.x, ry = tgt.y - tank.y;
      const s2 = 64; // bullet speed^2 (8^2)
      const aa = vx*vx + vy*vy - s2; const bb = 2*(rx*vx + ry*vy); const cc = rx*rx + ry*ry;
      let tHit = 0;
      if (Math.abs(aa) < 1e-6) { tHit = bb !== 0 ? CL(-cc / bb, 0, ${P.leadCap||20}) : 0; }
      else {
        const disc = bb*bb - 4*aa*cc;
        if (disc >= 0) {
          const sd=Math.sqrt(disc); const t1=(-bb - sd)/(2*aa); const t2=(-bb + sd)/(2*aa);
          const tc = t1>0 && t2>0 ? Math.min(t1,t2) : (t1>0?t1:(t2>0?t2:0));
          tHit = CL(tc, 0, ${P.leadCap||20});
        } else { const d=H(rx,ry); tHit = CL(d/8, 0, ${P.leadCap||20}); }
      }
      ax = tgt.x + vx * ${(P.leadW||1.08).toFixed(3)} * tHit;
      ay = tgt.y + vy * ${(P.leadW||1.08).toFixed(3)} * tHit;
    }
    const jitter = (((S.tick*13 + tank.x*7 + tank.y*3 + ${idx}*11)%23)-11) * ${(P.aimJitter||0.12).toFixed(3)} * 0.07 + ${(P.aimBias||0)};
    tank.fire(D(ax-tank.x,ay-tank.y) + jitter);
    S.last={x:tgt.x,y:tgt.y};
  }

  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };

  // 3) Bullet avoidance (distance to path + time weighting)
  let hot=null,score=1e18;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
    if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s = dist + tt*${P.threatH||5};
      if(dist<${P.threatR||210} && s<score){ score=s; hot=b; }
    }
  }
  if(hot){
    const a=D(hot.vx,hot.vy);
    const side=(S.side||${sideJitter})*${P.fleeBias||14} + ${(P.bias||0)}*0.5;
    const options=[a+90+side, a-90-side, a+120, a-120, a+70, a-70, a+150, a-150];
    for(const c of options){ if(go(c)) return; }
  }

  // 4) Edge avoidance
  if(tank.x < ${P.edge||60}){ if(go(0)) return; }
  if(tank.x > 900-${P.edge||60}){ if(go(180)) return; }
  if(tank.y < ${P.edge||60}){ if(go(90)) return; }
  if(tank.y > 600-${P.edge||60}){ if(go(270)) return; }

  // 5) Ally separation
  let near=null, ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < ${P.sep||72}){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }

  // 6) Range control + strafing
  if(tgt){
    const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance;
    let r0=${P.rMin||200}, r1=${P.rMax||320};
    if((tgt.health<=${P.finisherHP||24})||enemies.length<=${P.aggrRemain||3}){ r0=Math.max(120,r0-(${P.aggrIn||28})); r1=Math.max(160,r1-(${P.aggrOut||20})); }
    if(d<r0){ const aw=to+180+(${P.bias||0})*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + ((S.side||${sideJitter}) * ${P.strafe||22}) + (${P.bias||0})*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; }
  }

  // 7) Fallback sweep
  for(const s of [0,60,120,180,240,300]){ if(go(s+(${P.bias||0}))) return; }
}
`;
}

function generateTeamCode({ seed = 1, teamName = 'Nova', params = null } = {}) {
  const rnd = rng(seed);
  const roles = (params && params.roles) || ['TANKER','TANKER','DEALER','DEALER','NORMAL','NORMAL'];
  const base = (params && params.base) || {
    rMin: 210,
    rMax: 340,
    strafe: 24,
    threatR: 210,
    threatH: 5,
    fleeBias: 15,
    sep: 74,
    edge: 60,
    leadCap: 20,
    leadW: 1.08,
    aimJitter: 0.13,
    healthW: 1.22,
    distW: 0.09,
    finisherHP: 24,
    aggrRemain: 3,
    aggrIn: 28,
    aggrOut: 20,
    aimBias: 0,
    bias: 0,
  };

  // Role-specific tweaks
  const roleBias = {
    TANKER: { rMin: base.rMin - 20, rMax: base.rMax - 20, threatR: base.threatR + 12, threatH: base.threatH + 1, fleeBias: base.fleeBias + 2, healthW: base.healthW + 0.03, distW: base.distW + 0.01, bias: -6 },
    DEALER: { rMin: base.rMin + 60, rMax: base.rMax + 80, threatR: base.threatR - 14, strafe: base.strafe + 4, leadW: base.leadW + 0.04, aimJitter: base.aimJitter - 0.01, finisherHP: base.finisherHP - 2, aggrIn: base.aggrIn + 2, aggrOut: base.aggrOut + 2, aimBias: -0.6, bias: -2 },
    NORMAL: { rMin: base.rMin, rMax: base.rMax, bias: 4 },
  };

  const segments = [];
  for (let i = 0; i < 6; i++) {
    const role = roles[i] || 'NORMAL';
    // random jitter per bot around role-biased base
    const merged = { ...base, ...(roleBias[role] || {}) };
    const P = jitterP(merged, 0.15, rnd);
    const block = emitBot(i+1, teamName, role, P, i);
    segments.push(block);
    if (i !== 5) segments.push('\n\n// ===== 다음 로봇 =====\n\n');
  }
  return segments.join('');
}

function main() {
  const args = parseArgs(process.argv);
  const out = args.out || 'team.txt';
  const teamName = args.name || 'Nova';
  let params;
  if (args.params && fs.existsSync(args.params)) params = JSON.parse(fs.readFileSync(args.params, 'utf8'));

  const seed = args.seed ? parseInt(args.seed, 10) : 1;
  const code = generateTeamCode({ seed, teamName, params });
  const outPath = path.resolve(out);
  fs.writeFileSync(outPath, code, 'utf8');
  console.log(`Generated team -> ${outPath}`);
}

if (require.main === module) main();
module.exports = { generateTeamCode };
