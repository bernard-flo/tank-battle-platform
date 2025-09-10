#!/usr/bin/env node
/*
  Tank Battle AI tuner
  - Generates parameterized 6-bot team code
  - Evaluates vs existing results/*.txt using simulator/cli.js
  - Searches a handful of variants and selects the best aggregate win rate
  - Writes final code to result/<TS>/<TS>.txt and writes RESULT.md summary
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// Resolve repo root (this file lives under work/<TS>/)
const WORKDIR = __dirname;
const REPO = path.resolve(WORKDIR, '..', '..');
const SIM_CLI = path.join(REPO, 'simulator', 'cli.js');

function getTimestamp() {
  try { return fs.readFileSync(path.join(WORKDIR, '.timestamp'), 'utf8').trim(); } catch { return 'run'; }
}

const TS = getTimestamp();
const OUT_DIR = path.join(REPO, 'result', TS);
const OUT_FILE = path.join(OUT_DIR, `${TS}.txt`);

function ensureDirs() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function listOpponents() {
  // Collect existing *.txt team exports under result/ (depth 2)
  const base = path.join(REPO, 'result');
  const out = [];
  for (const entry of fs.readdirSync(base)) {
    const p = path.join(base, entry);
    try {
      const st = fs.statSync(p);
      if (st.isFile() && p.endsWith('.txt')) out.push(p);
      else if (st.isDirectory()) {
        for (const f of fs.readdirSync(p)) {
          if (f.endsWith('.txt')) out.push(path.join(p, f));
        }
      }
    } catch {}
  }
  // Exclude our own OUT_FILE if exists (to avoid self-play during iteration)
  return out.filter((p) => path.resolve(p) !== path.resolve(OUT_FILE));
}

function nproc() {
  try { return Math.max(1, os.cpus().length); } catch { return 2; }
}

// Param helpers
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function jitter(v, scale) { return v + (Math.random() * 2 - 1) * scale; }

// Team generator: returns string with 6 robots (function name/type/update)
function generateTeamCode(presetName, params) {
  // params contains role configs: tanker, dealer, normal
  // Each role config P object will be embedded directly to avoid overhead
  const roles = [
    { name: `${presetName}-T1`, type: 'Type.TANKER', P: params.tanker, idx: 0 },
    { name: `${presetName}-D2`, type: 'Type.DEALER', P: params.dealer, idx: 1 },
    { name: `${presetName}-N3`, type: 'Type.NORMAL', P: params.normal, idx: 2 },
    { name: `${presetName}-N4`, type: 'Type.NORMAL', P: params.normal2 || params.normal, idx: 3 },
    { name: `${presetName}-D5`, type: 'Type.DEALER', P: params.dealer2 || params.dealer, idx: 4 },
    { name: `${presetName}-N6`, type: 'Type.NORMAL', P: params.normal3 || params.normal, idx: 5 },
  ];

  function robotCode({ name, type, P, idx }) {
    const Pjson = JSON.stringify(P);
    // Minimal formatting for speed in browser and simulator
    return `function name(){return "${name}";}
function type(){return ${type};}
let __state_${idx}={last:null,tick:0,lastVel:null,side: ((${idx}*17)%2?1:-1)};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v; 
  const P=${Pjson};
  const S=__state_${idx}; S.tick=(S.tick||0)+1;
  // 1) Target selection (health-weighted, distance bias, finisher preference)
  let tgt=null,best=1e18; for(const e of enemies){ const tw=(e.health<=P.finisherHP?-80:0) + (P.prefDealer?(e.type===2?-10:0):0) + (P.prefNormal?(e.type===0?-6:0):0); const k=e.health*P.healthW + e.distance*P.distW + (e.x+e.y)*(P.tieBias||0) + tw; if(k<best){best=k; tgt=e;} }
  // 2) Predictive leading aim (quadratic intercept, low-pass velocity estimate)
  if(tgt){ let ax=tgt.x,ay=tgt.y,vx=0,vy=0; if(S.last){ const lvx=S.lastVel?S.lastVel.vx:0,lvy=S.lastVel?S.lastVel.vy:0; const ivx=(tgt.x-S.last.x),ivy=(tgt.y-S.last.y); vx=lvx*0.5+ivx*0.5; vy=lvy*0.5+ivy*0.5; S.lastVel={vx,vy}; const rx=tgt.x-tank.x,ry=tgt.y-tank.y,s2=64; const aa=vx*vx+vy*vy-s2, bb=2*(rx*vx+ry*vy), cc=rx*rx+ry*ry; let tHit=0; if(Math.abs(aa)<1e-6){ tHit=bb!==0?CL(-cc/bb,0,P.leadCap):0; } else { const disc=bb*bb-4*aa*cc; if(disc>=0){ const sd=Math.sqrt(disc), t1=(-bb-sd)/(2*aa), t2=(-bb+sd)/(2*aa); const tc=t1>0&&t2>0?Math.min(t1,t2):(t1>0?t1:(t2>0?t2:0)); tHit=CL(tc,0,P.leadCap);} } ax=tgt.x+vx*P.leadW*tHit; ay=tgt.y+vy*P.leadW*tHit; }
    const jitter=(((S.tick*13 + tank.x*7 + tank.y*3 + ${idx}*11)%23)-11)*0.07*(P.aimJitter||0)+(P.aimBias||0); tank.fire(D(ax-tank.x,ay-tank.y)+jitter); S.last={x:tgt.x,y:tgt.y}; }
  // Helper to attempt moves
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  // 3) Bullet avoidance: perpendicular sidestep weighted by time-to-closest-approach
  let hot=null,score=1e18; for(const b of bulletInfo){ const dx=b.x-tank.x,dy=b.y-tank.y; const v=H(b.vx,b.vy)||1; const nx=b.vx/v,ny=b.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx,py=b.y-proj*ny; const dist=H(px-tank.x,py-tank.y); const tt=proj/v; const s=dist+tt*(P.threatH||4); if(dist<P.threatR && s<score){ score=s; hot=b; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(S.side||1)*P.fleeBias + (P.bias||0)*0.5; const opts=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of opts){ if(go(c)) return; } }
  // 4) Wall avoidance
  if(tank.x<P.edge){ if(go(0)) return; } if(tank.x>900-P.edge){ if(go(180)) return; } if(tank.y<P.edge){ if(go(90)) return; } if(tank.y>600-P.edge){ if(go(270)) return; }
  // 5) Ally separation
  let near=null,ad=1e18; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } } if(near && ad<P.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  // 6) Range control & strafing
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=P.rMin,r1=P.rMax; if((tgt.health<=P.finisherHP)||enemies.length<=P.aggrRemain){ r0=Math.max(120,r0-(P.aggrIn||30)); r1=Math.max(160,r1-(P.aggrOut||20)); } if(d<r0){ const aw=to+180+(P.bias||0)*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; } else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; } else { const s=to+((S.side||1)*P.strafe)+(P.bias||0)*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  // 7) Sweep fallback
  for(const s of [0,60,120,180,240,300]){ if(go(s+(P.bias||0))) return; }
}`;
  }

  return roles.map(robotCode).join('\n\n// ===== 다음 로봇 =====\n\n');
}

function baseParams() {
  return {
    tanker: {
      rMin: 175, rMax: 265, strafe: 22, threatR: 190, threatH: 4, fleeBias: 18,
      sep: 70, edge: 52, leadCap: 20, leadW: 1.05, aimJitter: 0.10, aimBias: 0,
      healthW: 1.20, distW: 0.11, finisherHP: 26, aggrRemain: 3, aggrIn: 24, aggrOut: 16,
      prefDealer: 1, prefNormal: 0, bias: -8
    },
    dealer: {
      rMin: 215, rMax: 335, strafe: 32, threatR: 175, threatH: 5, fleeBias: 16,
      sep: 64, edge: 56, leadCap: 23, leadW: 1.15, aimJitter: 0.08, aimBias: -0.3,
      healthW: 1.18, distW: 0.09, finisherHP: 22, aggrRemain: 2, aggrIn: 35, aggrOut: 24,
      prefDealer: 1, prefNormal: 0, bias: -6
    },
    normal: {
      rMin: 185, rMax: 295, strafe: 26, threatR: 185, threatH: 4, fleeBias: 16,
      sep: 66, edge: 50, leadCap: 21, leadW: 1.08, aimJitter: 0.11, aimBias: 0,
      healthW: 1.22, distW: 0.10, finisherHP: 24, aggrRemain: 3, aggrIn: 28, aggrOut: 18,
      prefDealer: 1, prefNormal: 1, bias: -4
    }
  };
}

function mutateParams(p, spread=1.0) {
  const out = JSON.parse(JSON.stringify(p));
  function mutRole(role, scale) {
    const r = out[role];
    for (const k of Object.keys(r)) {
      const v = r[k];
      if (typeof v !== 'number') continue;
      const s = (k.match(/rMin|rMax|threatR|sep|edge/) ? 6 : k.match(/strafe|aggrIn|aggrOut|finisherHP/) ? 3 : 0.06);
      r[k] = +((jitter(v, s * scale * spread))).toFixed(3);
    }
  }
  mutRole('tanker', 1.0);
  mutRole('dealer', 1.0);
  mutRole('normal', 1.0);
  // Second/third normals slight offsets to diversify swarm
  out.normal2 = Object.assign({}, out.normal, { bias: clamp(out.normal.bias + 12, -20, 20) });
  out.dealer2 = Object.assign({}, out.dealer, { bias: clamp(out.dealer.bias - 12, -20, 20) });
  out.normal3 = Object.assign({}, out.normal, { bias: clamp(out.normal.bias + 6, -20, 20) });
  return out;
}

function writeCandidate(filePath, code) {
  fs.writeFileSync(filePath, code);
}

function runBatch(redFile, blueFile, repeat=20, seed=12345, concurrency=Math.min(8, nproc())) {
  const tmpJson = path.join(WORKDIR, `result_${path.basename(redFile)}_vs_${path.basename(blueFile)}_${repeat}.json`);
  const args = ['node', SIM_CLI, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', tmpJson, '--runner', 'secure', '--fast', '--concurrency', String(concurrency)];
  execFileSync(args[0], args.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
  const data = JSON.parse(fs.readFileSync(tmpJson, 'utf8'));
  try { fs.unlinkSync(tmpJson); } catch {}
  const agg = data.aggregate || {};
  return { redWins: agg.redWins||0, blueWins: agg.blueWins||0, draws: agg.draws||0, matches: agg.matches||repeat, avgTicks: agg.avgTicks||0 };
}

function scoreAgainstOpponents(candidateFile, opponents, opts) {
  let totalWins = 0, totalLosses = 0, totalDraws = 0, totalMatches = 0;
  for (const opp of opponents) {
    const res = runBatch(candidateFile, opp, opts.repeat, opts.seed, opts.concurrency);
    totalWins += res.redWins; totalLosses += res.blueWins; totalDraws += res.draws; totalMatches += res.matches;
  }
  const winRate = totalMatches ? totalWins / totalMatches : 0;
  return { totalWins, totalLosses, totalDraws, totalMatches, winRate };
}

function main() {
  ensureDirs();
  const opponents = listOpponents();
  if (opponents.length === 0) {
    console.error('No opponents found in result/. Create at least one baseline first.');
    process.exit(1);
  }
  const candidateFile = path.join(WORKDIR, 'candidate.js');
  const preset = 'HeliosX';
  const base = baseParams();
  const population = [base];
  // Create mutated variants
  for (let i = 0; i < 9; i++) population.push(mutateParams(base, 1 + i*0.12));

  const repeat = Math.max(12, Math.min(20, 4 * Math.ceil(Math.sqrt(opponents.length))));
  const opts = { repeat, seed: 777, concurrency: Math.min(8, nproc()) };
  let best = { winRate: -1, idx: -1, metrics: null, params: null };

  for (let i = 0; i < population.length; i++) {
    const p = population[i];
    const code = generateTeamCode(preset, p);
    writeCandidate(candidateFile, code);
    const metrics = scoreAgainstOpponents(candidateFile, opponents, opts);
    if (metrics.winRate > best.winRate) {
      best = { winRate: metrics.winRate, idx: i, metrics, params: p, code };
    }
    console.log(`[tuner] candidate ${i+1}/${population.length} -> winRate ${(metrics.winRate*100).toFixed(1)}% (${metrics.totalWins}/${metrics.totalMatches}, draws ${metrics.totalDraws})`);
  }

  // Save best as final output
  writeCandidate(OUT_FILE, best.code);

  // Write RESULT.md
  const lines = [];
  lines.push(`# Tuning Result - ${TS}`);
  lines.push('');
  lines.push(`- Preset: ${preset}`);
  lines.push(`- Candidates tested: ${population.length}`);
  lines.push(`- Opponents: ${opponents.length}`);
  lines.push(`- Repeat per opponent: ${opts.repeat}, Concurrency: ${opts.concurrency}`);
  lines.push(`- Best index: ${best.idx}, WinRate: ${(best.winRate*100).toFixed(2)}%`);
  lines.push('');
  lines.push('## Best Parameters');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(best.params, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Aggregate vs All Opponents');
  lines.push('');
  lines.push(`- Total: ${best.metrics.totalMatches}, Wins: ${best.metrics.totalWins}, Losses: ${best.metrics.totalLosses}, Draws: ${best.metrics.totalDraws}`);
  fs.writeFileSync(path.join(WORKDIR, 'RESULT.md'), lines.join('\n'));

  console.log(`[tuner] Saved final -> ${OUT_FILE}`);
}

if (require.main === module) {
  main();
}

