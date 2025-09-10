#!/usr/bin/env node
/*
  AI Team Calibrator for tank_battle_platform.html
  - Generates candidate team code with tunable parameters
  - Evaluates vs existing results found under result/ directories using simulator/cli.js
  - Picks the best-performing candidate and writes it to result/<TS>/<TS>.txt
  - Writes evaluation summary to work/<TS>/RESULT.md

  Usage: node calibrate.js
*/
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SIM_CLI = path.join(REPO_ROOT, 'simulator', 'cli.js');
const WORK_DIR = __dirname;
const TS = path.basename(WORK_DIR);
const RESULT_DIR = path.join(REPO_ROOT, 'result', TS);
const EVAL_DIR = path.join(WORK_DIR, 'eval');

function listCompetitors(limit = 10) {
  const resultRoot = path.join(REPO_ROOT, 'result');
  const dirs = fs.readdirSync(resultRoot).filter((d) => {
    try {
      const st = fs.statSync(path.join(resultRoot, d));
      return st.isDirectory() && d !== TS; // exclude our current output
    } catch { return false; }
  }).sort(); // timestamp folders lexicographically sort by time

  const files = [];
  for (let i = dirs.length - 1; i >= 0; i--) {
    const d = dirs[i];
    const full = path.join(resultRoot, d);
    const txts = fs.readdirSync(full).filter((f) => f.endsWith('.txt'));
    if (txts.length === 0) continue;
    // Prefer filename that matches dir name; else first .txt
    let chosen = txts.find((f) => f.replace(/\.txt$/, '') === d);
    if (!chosen) chosen = txts[0];
    files.push(path.join(full, chosen));
    if (files.length >= limit) break;
  }
  return files;
}

function teamCodeFromParams(base, perBot) {
  // perBot[i] can override base values and type/bias per bot
  const bots = [];
  for (let i = 0; i < 6; i++) {
    const P = Object.assign({}, base, perBot[i] || {});
    const typeExpr = `Type.${P.type || 'NORMAL'}`;
    const name = `${P.teamName || 'Aegis'}-${i + 1}`;
    // Compact but strong logic: leading fire + TCA bullet avoidance + ring control + separation
    const code = `function name(){return ${JSON.stringify(name)};}
function type(){return ${typeExpr};}
let __s={last:null,lastV:null,t:0};
function update(tank,enemies,allies,bulletInfo){
  const H=Math.hypot,D=(x,y)=>Math.atan2(y,x)*180/Math.PI,N=(a)=>{a%=360;if(a<0)a+=360;return a;},CL=(v,l,h)=>v<l?l:v>h?h:v;
  __s.t=(__s.t||0)+1;
  const Par=${JSON.stringify({
      rMin: base.rMin || 170,
      rMax: base.rMax || 270,
      strafe: base.strafe || 28,
      threatR: base.threatR || 190,
      fleeBias: base.fleeBias || 16,
      sep: base.sep || 62,
      edge: base.edge || 50,
      leadCap: base.leadCap || 14,
      leadW: base.leadW || 0.95,
      aimJitter: base.aimJitter || 0.14,
      healthW: base.healthW || 1.2,
      distW: base.distW || 0.14,
      finisherHP: base.finisherHP || 28,
      aggrRemain: base.aggrRemain || 3,
      aggrIn: base.aggrIn || 24,
      aggrOut: base.aggrOut || 16,
      bias: P.bias || 0
    })};
  let tgt=null,b=1e9; for(const e of enemies){const k=e.health*Par.healthW + e.distance*Par.distW; if(k<b){b=k;tgt=e;}}
  if(tgt){ let ax=tgt.x, ay=tgt.y; if(__s.last){ const vx=tgt.x-__s.last.x, vy=tgt.y-__s.last.y; const lvx=__s.lastV?__s.lastV.vx:0, lvy=__s.lastV?__s.lastV.vy:0; const svx=lvx*0.55+vx*0.45, svy=lvy*0.55+vy*0.45; __s.lastV={vx:svx,vy:sVy=vY=svy}; const d=H(tgt.x-tank.x,tgt.y-tank.y); const t=CL(d/8,0,Par.leadCap); ax=tgt.x+svx*Par.leadW*t; ay=tgt.y+svy*Par.leadW*t; }
    const j=(((__s.t*13 + tank.x*7 + tank.y*3 + ${i}*11)%23)-11)*0.07*Par.aimJitter; tank.fire(D(ax-tank.x,ay-tank.y)+j); __s.last={x:tgt.x,y:tgt.y}; }
  let moved=0; const go=(a)=>{ if(moved>20) return true; moved++; return tank.move(N(a)); };
  let hot=null,sc=1e9; for(const bu of bulletInfo){ const dx=bu.x-tank.x, dy=bu.y-tank.y; const v=H(bu.vx,bu.vy)||1; const nx=bu.vx/v, ny=bu.vy/v; const proj=dx*nx+dy*ny; if(proj>0){ const px=bu.x-proj*nx, py=bu.y-proj*ny; const d=H(px-tank.x,py-tank.y); const tt=proj/v; const s=d + tt*4; if(d<Par.threatR && s<sc){ sc=s; hot=bu; } } }
  if(hot){ const a=D(hot.vx,hot.vy); const side=(((${P.randSeed || (i+1)})%2)?1:-1)*Par.fleeBias + Par.bias*0.6; const C=[a+90+side,a-90-side,a+120,a-120,a+70,a-70,a+150,a-150]; for(const c of C){ if(go(c)) return; } }
  if(tank.x<Par.edge){ if(go(0)) return; } if(tank.x>900-Par.edge){ if(go(180)) return; } if(tank.y<Par.edge){ if(go(90)) return; } if(tank.y>600-Par.edge){ if(go(270)) return; }
  let near=null,ad=1e9; for(const al of allies){ if(al.distance<ad){ad=al.distance; near=al;} } if(near && ad<Par.sep){ const away=D(tank.x-near.x,tank.y-near.y); if(go(away)) return; if(go(away+18)) return; if(go(away-18)) return; }
  if(tgt){ const to=D(tgt.x-tank.x,tgt.y-tank.y), d=tgt.distance; let r0=Par.rMin,r1=Par.rMax; if((tgt.health<=Par.finisherHP)||enemies.length<=Par.aggrRemain){ r0-=Par.aggrIn; r1-=Par.aggrOut; }
    if(d<r0){ const aw=to+180+Par.bias*0.4; if(go(aw)) return; if(go(aw+16)) return; if(go(aw-16)) return; }
    else if(d>r1){ if(go(to)) return; if(go(to+14)) return; if(go(to-14)) return; }
    else { const s=to + (${P.strafeDir || 1} * Par.strafe) + Par.bias*0.5; if(go(s)) return; if(go(s+16)) return; if(go(s-16)) return; } }
  const sweep=[0,60,120,180,240,300]; for(const s of sweep){ if(go(s+Par.bias)) return; }
}`;
    bots.push(code);
  }
  return bots.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function randomize(base, mag = 1) {
  const jitter = (v, rel = 0.1) => Math.max(0, Math.round(v + (Math.random()*2-1) * v * rel * mag));
  const flj = (v, rel = 0.12) => Math.max(0, +(v + (Math.random()*2-1) * v * rel * mag).toFixed(2));
  const out = { ...base };
  out.rMin = jitter(base.rMin, 0.12);
  out.rMax = jitter(base.rMax, 0.12);
  out.strafe = jitter(base.strafe || 28, 0.25);
  out.threatR = jitter(base.threatR || 190, 0.2);
  out.fleeBias = jitter(base.fleeBias || 16, 0.3);
  out.sep = jitter(base.sep || 62, 0.2);
  out.edge = jitter(base.edge || 50, 0.15);
  out.leadCap = jitter(base.leadCap || 14, 0.25);
  out.leadW = flj(base.leadW || 0.95, 0.08);
  out.aimJitter = flj(base.aimJitter || 0.14, 0.4);
  out.healthW = flj(base.healthW || 1.2, 0.2);
  out.distW = flj(base.distW || 0.14, 0.3);
  out.finisherHP = jitter(base.finisherHP || 28, 0.25);
  out.aggrRemain = jitter(base.aggrRemain || 3, 0.5);
  out.aggrIn = jitter(base.aggrIn || 24, 0.3);
  out.aggrOut = jitter(base.aggrOut || 16, 0.3);
  return out;
}

function perBotTemplate() {
  // Balanced comp: 2 Tankers (front), 2 Normals, 2 Dealers
  const types = ['TANKER','TANKER','NORMAL','NORMAL','DEALER','DEALER'];
  const arr = [];
  for (let i = 0; i < 6; i++) {
    arr.push({
      type: types[i],
      bias: (i < 3 ? 8 : -8) + (i%2 ? 4 : -4),
      strafeDir: (i%2===0 ? 1 : -1),
      randSeed: 31 + i * 17,
    });
  }
  return arr;
}

function runSim(redCodePath, blueCodePath, jsonOut, repeat = 60, baseSeed = 424242, concurrency = 8) {
  const args = ['node', SIM_CLI, '--red', redCodePath, '--blue', blueCodePath, '--repeat', String(repeat), '--seed', String(baseSeed), '--json', jsonOut, '--concurrency', String(concurrency), '--fast'];
  const cmd = args.join(' ');
  const res = spawnSync('bash', ['-lc', cmd], { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe', maxBuffer: 1024*1024*20 });
  if (res.status !== 0) {
    console.error('Simulator run failed:', res.stderr || res.stdout);
    throw new Error('sim failed');
  }
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  return data.aggregate; // { redWins, blueWins, draws, ... }
}

function scoreAggregate(agg) {
  const total = agg.matches || (agg.redWins + agg.blueWins + agg.draws);
  const winRate = total > 0 ? agg.redWins / total : 0;
  // Prefer higher win, then fewer draws, then higher avg alive/energy
  const aux = (agg.avgRedAlive - agg.avgBlueAlive) * 0.02 + (agg.avgRedEnergy - agg.avgBlueEnergy) * 0.0005;
  return winRate + aux;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function main() {
  ensureDir(RESULT_DIR);
  ensureDir(EVAL_DIR);

  const competitors = listCompetitors(8);
  if (competitors.length === 0) {
    console.log('No competitors found in result/. Exiting.');
    process.exit(0);
  }
  console.log('Evaluating against competitors:\n' + competitors.map((p, i) => `  [${i}] ${path.basename(path.dirname(p))}/${path.basename(p)}`).join('\n'));

  const base = {
    rMin: 170, rMax: 270, strafe: 28, threatR: 190, fleeBias: 16, sep: 62, edge: 50,
    leadCap: 14, leadW: 0.95, aimJitter: 0.14, healthW: 1.22, distW: 0.14,
    finisherHP: 28, aggrRemain: 3, aggrIn: 24, aggrOut: 16,
    teamName: 'Aegis'
  };
  const per = perBotTemplate();

  const candidates = [];
  const stage1N = 12, stage2N = 6;
  const repeat1 = 40, repeat2 = 80;
  for (let i = 0; i < stage1N; i++) candidates.push(randomize(base, 1.0));

  const evalCandidate = (params, repeat, tag) => {
    const code = teamCodeFromParams(params, per);
    const candPath = path.join(EVAL_DIR, `candidate_${tag}.js`);
    fs.writeFileSync(candPath, code);
    let totalScore = 0, perOpp = [];
    for (let i = 0; i < competitors.length; i++) {
      const opp = competitors[i];
      const jsonOut = path.join(EVAL_DIR, `res_${tag}_vs_${path.basename(path.dirname(opp))}_${i}.json`);
      const agg = runSim(candPath, opp, jsonOut, repeat);
      const sc = scoreAggregate(agg);
      totalScore += sc;
      perOpp.push({ opponent: opp, aggregate: agg, score: sc });
    }
    return { params, code, total: totalScore, perOpp };
  };

  // Stage 1
  let best = null;
  for (let i = 0; i < candidates.length; i++) {
    const r = evalCandidate(candidates[i], repeat1, `s1_${i}`);
    if (!best || r.total > best.total) best = r;
    console.log(`Stage1 cand ${i+1}/${candidates.length}: totalScore=${r.total.toFixed(4)}`);
  }

  // Stage 2: refine around best
  const refined = [];
  for (let i = 0; i < stage2N; i++) refined.push(randomize(best.params, 0.4));
  for (let i = 0; i < refined.length; i++) {
    const r = evalCandidate(refined[i], repeat2, `s2_${i}`);
    if (r.total > best.total) best = r;
    console.log(`Stage2 cand ${i+1}/${refined.length}: totalScore=${r.total.toFixed(4)}${r.total>best.total?' *':''}`);
  }

  // Save final
  const outPath = path.join(RESULT_DIR, `${TS}.txt`);
  fs.writeFileSync(outPath, best.code);

  // RESULT.md
  const md = [];
  md.push(`# Calibration Result: ${TS}`);
  md.push('');
  md.push('- Referenced: .agent/SIMULATOR.md mechanics and CLI');
  md.push('- Opponents evaluated:');
  for (const opp of competitors) md.push(`  - ${path.basename(path.dirname(opp))}/${path.basename(opp)}`);
  md.push('');
  md.push('## Best Parameters');
  md.push('');
  md.push('```json');
  md.push(JSON.stringify(best.params, null, 2));
  md.push('```');
  md.push('');
  md.push('## Per-Opponent Results (final)');
  md.push('');
  for (const item of best.perOpp) {
    const a = item.aggregate;
    md.push(`- ${path.basename(path.dirname(item.opponent))}: W:${a.redWins} L:${a.blueWins} D:${a.draws} | avgAlive R:${a.avgRedAlive} B:${a.avgBlueAlive} | avgE R:${a.avgRedEnergy} B:${a.avgBlueEnergy}`);
  }
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md.join('\n'));

  console.log(`\nSaved final code -> ${outPath}`);
  console.log(`Saved evaluation -> ${path.join(WORK_DIR, 'RESULT.md')}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
