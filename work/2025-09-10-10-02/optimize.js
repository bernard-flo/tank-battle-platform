#!/usr/bin/env node
/*
  Optimize a 6-bot team for tank_battle_platform.html using the headless simulator.
  - Scans existing result/*.txt teams as opponents
  - Randomly searches parameter space to maximize win rate
  - Emits best team code to result/<TS>/<TS>.txt and a RESULT.md summary
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runMatch } = require('../../simulator/engine');
const { compileTeamFromCode } = require('../../simulator/bot_loader');

// Resolve timestamp from cwd path
const WORK_DIR = __dirname;
const TS = path.basename(WORK_DIR);
const RESULT_DIR = path.resolve(__dirname, '../../result', TS);
const RESULT_FILE = path.join(RESULT_DIR, `${TS}.txt`);

// Utility
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function randIn(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Build 6-robot code from parameter object
function buildTeamCode(params) {
  const rolePlan = params.rolePlan || ['TANKER','TANKER','DEALER','DEALER','NORMAL','NORMAL'];
  const roleToType = { NORMAL: 'Type.NORMAL', TANKER: 'Type.TANKER', DEALER: 'Type.DEALER' };
  const bots = [];
  for (let i = 0; i < 6; i++) {
    const role = rolePlan[i % rolePlan.length];
    const bias = (params.biases && Number.isFinite(params.biases[i])) ? params.biases[i] : (i%2===0? -params.biasBase : params.biasBase);
    const P = Object.assign({}, params.common, params.roles && params.roles[role] ? params.roles[role] : {});
    // Freeze numeric values to a fixed precision to keep the file compact
    const Pfmt = {};
    for (const [k, v] of Object.entries(P)) {
      Pfmt[k] = (typeof v === 'number') ? +v.toFixed(1) : v;
    }
    const name = `${params.family}-${params.version}-${role[0]}${i+1}`;
    const code = `
function name(){return ${JSON.stringify(name)};}
function type(){return ${roleToType[role]};}
let __state = { last:null, tick:0, lastVel:null };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+${(i*7-13)|0})|0)%2?1:-1;
  const P=${JSON.stringify(Object.assign({}, Pfmt, { bias }))};

  __state.tick = (__state.tick||0) + 1;

  // Target selection: weighted by health and distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){best=k; tgt=e;}
  }

  // Predictive fire with smoothed velocity estimate and capped lead
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__state.last){
      const vx=(tgt.x-__state.last.x), vy=(tgt.y-__state.last.y);
      let lvx=__state.lastVel?__state.lastVel.vx:0, lvy=__state.lastVel?__state.lastVel.vy:0;
      const svx = lvx*0.6 + vx*0.4, svy = lvy*0.6 + vy*0.4;
      __state.lastVel = { vx: svx, vy: svy };
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + svx*P.leadW*tLead;
      aimY = tgt.y + svy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+${(i*5-7)|0})%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __state.last = { x:tgt.x, y:tgt.y };
  }

  // Movement helper
  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: pick hostile bullet whose closest approach is near and ahead
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny; // forward distance along bullet path
    if(proj>0){
      const px=b.x-proj*nx, py=b.y-proj*ny; const d=hypot(px-tank.x,py-tank.y);
      if(d<minD && d<P.threatR){ minD=d; hot=b; }
    }
  }
  if(hot){
    const a=toDeg(hot.vx,hot.vy);
    const side = (rnd>0?1:-1)*P.fleeBias + P.bias*0.6;
    const cands=[a+90+side, a-90-side, a+120, a-120, a+70, a-70];
    for(const c of cands){ if(tryMove(c)) return; }
  }

  // Edge avoidance
  if(tank.x < P.edge){ if(tryMove(0)) return; }
  if(tank.x > 900-P.edge){ if(tryMove(180)) return; }
  if(tank.y < P.edge){ if(tryMove(90)) return; }
  if(tank.y > 600-P.edge){ if(tryMove(270)) return; }

  // Ally separation
  let near=null, ad=1e9; for(const a of allies){ if(a.distance<ad){ ad=a.distance; near=a; } }
  if(near && ad < P.sep){
    const away = toDeg(tank.x-near.x, tank.y-near.y);
    if(tryMove(away)) return; if(tryMove(away+24)) return; if(tryMove(away-24)) return;
  }

  // Engagement spacing + strafe
  if(tgt){
    const to = toDeg(tgt.x-tank.x, tgt.y-tank.y);
    const d  = tgt.distance;
    let minR=P.rMin, maxR=P.rMax;
    if((tgt.health<=P.finisherHP) || enemies.length<=P.aggrRemain){ minR-=P.aggrIn; maxR-=P.aggrOut; }
    if(d < minR){
      const away = to+180 + P.bias*0.4; if(tryMove(away)) return; if(tryMove(away+22)) return; if(tryMove(away-22)) return;
    } else if(d > maxR){
      if(tryMove(to)) return; if(tryMove(to+16)) return; if(tryMove(to-16)) return;
    } else {
      const side = to + (((tank.x*13+tank.y*7+${(i*5-7)|0})|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
`;
    bots.push(code.trim());
  }
  return bots.join('\n\n\n// ===== 다음 로봇 =====\n\n\n');
}

function defaultParams() {
  return {
    family: 'Helios',
    version: 'X1',
    rolePlan: ['TANKER','TANKER','DEALER','DEALER','NORMAL','NORMAL'],
    biasBase: 10,
    biases: [-12, 12, -6, 6, -10, 10],
    common: {
      rMin: 190, rMax: 280, strafe: 30,
      threatR: 90, fleeBias: 13,
      sep: 60, edge: 45,
      leadCap: 12, leadW: 0.85, aimJitter: 0.15,
      healthW: 1.2, distW: 0.1,
      finisherHP: 22, aggrRemain: 4, aggrIn: 30, aggrOut: 18,
    },
    roles: {
      TANKER: { rMin: 170, rMax: 260, strafe: 26, threatR: 100, aggrIn: 36, aggrOut: 16 },
      NORMAL: { rMin: 190, rMax: 290, strafe: 30 },
      DEALER: { rMin: 235, rMax: 340, strafe: 36, leadCap: 14, aimJitter: 0.20 },
    },
  };
}

function mutate(p) {
  const q = JSON.parse(JSON.stringify(p));
  const tweak = (v, s, lo, hi) => clamp(v + randIn(-s, s), lo, hi);
  q.version = 'X1m' + Math.floor(Math.random()*1000);
  q.biasBase = tweak(q.biasBase, 6, -20, 20);
  q.biases = q.biases.map((b,i)=>tweak(b, 6, -25, 25));
  const C = q.common;
  C.rMin = tweak(C.rMin, 20, 120, 260);
  C.rMax = Math.max(C.rMin+60, tweak(C.rMax, 25, C.rMin+60, 400));
  C.strafe = tweak(C.strafe, 8, 10, 60);
  C.threatR = tweak(C.threatR, 12, 40, 140);
  C.fleeBias = tweak(C.fleeBias, 6, 0, 30);
  C.sep = tweak(C.sep, 8, 30, 100);
  C.edge = tweak(C.edge, 6, 20, 80);
  C.leadCap = tweak(C.leadCap, 3, 4, 18);
  C.leadW = clamp(C.leadW + randIn(-0.1, 0.1), 0.5, 1.2);
  C.aimJitter = clamp(C.aimJitter + randIn(-0.05,0.05), 0.0, 0.4);
  C.healthW = clamp(C.healthW + randIn(-0.2,0.2), 0.8, 2.0);
  C.distW = clamp(C.distW + randIn(-0.05,0.05), 0.0, 0.5);
  C.finisherHP = tweak(C.finisherHP, 4, 10, 40);
  C.aggrRemain = clamp(Math.round(C.aggrRemain + randIn(-1.5,1.5)), 1, 6);
  C.aggrIn = tweak(C.aggrIn, 6, 10, 60);
  C.aggrOut = tweak(C.aggrOut, 6, 8, 60);
  for (const k of Object.keys(q.roles)) {
    const R = q.roles[k];
    R.rMin = tweak(R.rMin ?? C.rMin, 18, 120, 300);
    R.rMax = Math.max(R.rMin+60, tweak(R.rMax ?? C.rMax, 22, R.rMin+60, 420));
    R.strafe = tweak(R.strafe ?? C.strafe, 8, 10, 70);
    if (R.threatR !== undefined) R.threatR = tweak(R.threatR, 10, 40, 160);
    if (R.leadCap !== undefined) R.leadCap = tweak(R.leadCap, 3, 4, 20);
    if (R.aimJitter !== undefined) R.aimJitter = clamp(R.aimJitter + randIn(-0.05,0.05), 0.0, 0.5);
    if (R.aggrIn !== undefined) R.aggrIn = tweak(R.aggrIn, 6, 10, 60);
    if (R.aggrOut !== undefined) R.aggrOut = tweak(R.aggrOut, 6, 8, 60);
  }
  return q;
}

function discoverOpponents() {
  const root = path.resolve(__dirname, '../../result');
  const files = [];
  const walk = (dir) => {
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of ents) {
      if (ent.isDirectory()) {
        if (ent.name === TS) continue; // skip our own output dir
        const sub = path.join(dir, ent.name);
        try { walk(sub); } catch (_e) {}
      } else if (ent.isFile() && ent.name.endsWith('.txt')) {
        files.push(path.join(dir, ent.name));
      }
    }
  };
  walk(root);
  // Deduplicate and sort by mtime (prefer recent)
  const uniq = Array.from(new Set(files));
  uniq.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return uniq;
}

function evaluate(redCode, blueCode, repeat=40, baseSeed=12345) {
  // Compile and run repeat matches with incremental seeds in-process for speed
  const red = compileTeamFromCode(redCode, 'red', 'secure');
  const blue = compileTeamFromCode(blueCode, 'blue', 'secure');
  const players = [...red, ...blue];
  let redWins=0, blueWins=0, draws=0;
  for (let i=0;i<repeat;i++) {
    const seed = typeof baseSeed==='number'? (baseSeed+i) : `${baseSeed}-${i}`;
    const res = runMatch(players, { seed, maxTicks: 4800, fast: true });
    if (res.winner === 'red') redWins++;
    else if (res.winner === 'blue') blueWins++;
    else draws++;
  }
  return { redWins, blueWins, draws, matches: repeat };
}

async function main() {
  const opponents = discoverOpponents();
  if (opponents.length === 0) {
    console.error('No opponent .txt files found in result/.');
    process.exit(1);
  }
  // Limit to top-K recent opponents to keep runtime reasonable
  const K = Math.min(parseInt(process.env.OPP_LIMIT||'6',10), opponents.length);
  const oppSel = opponents.slice(0, K);

  const base = defaultParams();
  let best = { params: base, score: -Infinity, detail: null };
  const rounds = parseInt(process.env.ROUNDS||'8',10); // number of candidate evaluations (excluding base)
  const repeatPerOpp = parseInt(process.env.REPEAT||'16',10); // matches per opponent
  const seedBase = 424242;

  function scoreAgainstOpps(code) {
    let total=0, wins=0, totalMatches=0; const perOpp=[];
    for (const opp of oppSel) {
      const bcode = fs.readFileSync(opp, 'utf8');
      const res = evaluate(code, bcode, repeatPerOpp, seedBase);
      const rate = res.redWins / res.matches;
      perOpp.push({ file: opp, redWins: res.redWins, blueWins: res.blueWins, draws: res.draws, rate });
      total += rate;
      wins += res.redWins;
      totalMatches += res.matches;
    }
    return { avgRate: total/oppSel.length, wins, totalMatches, perOpp };
  }

  // Evaluate base first
  console.log(`Evaluating base candidate vs ${K} opponents...`);
  let code = buildTeamCode(base);
  let detail = scoreAgainstOpps(code);
  best = { params: base, score: detail.avgRate, detail };
  console.log(`Base avg win rate: ${(best.score*100).toFixed(1)}%`);

  for (let i=0;i<rounds;i++) {
    const cand = mutate(best.params);
    const ccode = buildTeamCode(cand);
    const det = scoreAgainstOpps(ccode);
    const sc = det.avgRate;
    console.log(`Round ${i+1}/${rounds}: avg ${(sc*100).toFixed(1)}% (best ${(best.score*100).toFixed(1)}%)`);
    if (sc > best.score) {
      best = { params: cand, score: sc, detail: det };
      console.log(`  New best -> ${(sc*100).toFixed(1)}%`);
    }
  }

  // Emit best code
  const bestCode = buildTeamCode(best.params);
  fs.writeFileSync(RESULT_FILE, bestCode);
  // Write RESULT.md
  const lines = [];
  lines.push(`# Optimization Result - ${TS}`);
  lines.push('');
  lines.push(`Family: ${best.params.family}  Version: ${best.params.version}`);
  lines.push(`Opponents: ${K}  Matches per opponent: ${repeatPerOpp}`);
  lines.push(`Average win rate: ${(best.score*100).toFixed(2)}%`);
  lines.push('');
  lines.push('## Per-Opponent Summary');
  for (const r of best.detail.perOpp) {
    lines.push(`- ${path.relative(path.resolve(__dirname,'../../'), r.file)}: ${r.redWins}/${repeatPerOpp} wins, draws ${r.draws} (rate ${(r.rate*100).toFixed(1)}%)`);
  }
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), lines.join('\n'));

  console.log(`\nSaved best code -> ${RESULT_FILE}`);
  console.log(`Saved summary -> ${path.join(WORK_DIR, 'RESULT.md')}`);
}

if (require.main === module) {
  main().catch((e)=>{ console.error(e); process.exit(1); });
}
