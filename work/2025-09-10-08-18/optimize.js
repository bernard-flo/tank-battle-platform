#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Tank Battle AI Optimizer
 * - Generates several high-performance team variants
 * - Simulates against existing results in ./result/**
 * - Picks the best-performing variant and writes it to result/<ts>/<ts>.txt
 * - Summarizes comparisons to RESULT.md
 *
 * Usage: node optimize.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TS = path.basename(path.resolve(__dirname));
const WORK_DIR = path.resolve(__dirname);
const CAND_DIR = path.join(WORK_DIR, 'candidates');
const SIM_CLI = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result', TS);

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function listOpponentFiles() {
  const resDir = path.join(ROOT, 'result');
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // skip the directory we are going to write into for this run
        if (path.basename(full) === TS) continue;
        walk(full);
      } else if (e.isFile()) {
        if (/\.txt$/i.test(e.name)) {
          try {
            const head = fs.readFileSync(full, 'utf8');
            if (head.includes('function name()') && head.includes('function update(')) {
              files.push(full);
            }
          } catch (_) {}
        }
      }
    }
  }
  walk(resDir);
  // Also include top-level *.txt under result
  for (const name of fs.readdirSync(resDir)) {
    const full = path.join(resDir, name);
    if (fs.statSync(full).isFile() && /\.txt$/i.test(name)) {
      const data = fs.readFileSync(full, 'utf8');
      if (data.includes('function name()') && data.includes('function update(')) {
        files.push(full);
      }
    }
  }
  // Unique & stable order
  return Array.from(new Set(files)).sort();
}

function makeBotCode(botName, tankType, P) {
  // P is a plain object with numeric params; we inline it as JSON
  // Update logic includes:
  // - Target selection by health+distance
  // - Predictive fire using closed-form intercept (bullet speed=8)
  // - Bullet avoidance (perpendicular dodge)
  // - Edge avoidance, ally separation, engagement ring, strafing
  const pJson = JSON.stringify(P);
  const code = `
function name(){return ${JSON.stringify(botName)};}
function type(){return ${tankType};}
let __state = { last:null, tick:0, lastVel:null };
function update(tank,enemies,allies,bulletInfo){
  "use strict";
  const P=${pJson};
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
`;
  return code;
}

function makeTeamCode(teamName, profiles) {
  const pieces = [];
  for (let i = 0; i < 6; i++) {
    const p = profiles[i];
    const botName = `${teamName}-${i+1}`;
    const tankType = p.type; // literal like 'Type.TANKER'
    pieces.push(makeBotCode(botName, tankType, p.P));
  }
  return pieces.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function writeCandidate(id, code) {
  if (!fs.existsSync(CAND_DIR)) fs.mkdirSync(CAND_DIR, { recursive: true });
  const file = path.join(CAND_DIR, `${id}.js`);
  fs.writeFileSync(file, code);
  return file;
}

function runBatch(redFile, blueFile, repeat = 40) {
  const args = [SIM_CLI, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', '1000', '--fast', '--concurrency', String(Math.min(8, repeat)), '--runner', 'secure'];
  const { status, stdout, stderr } = spawnSync('node', args, { encoding: 'utf8' });
  if (status !== 0) {
    throw new Error(`Simulator failed: ${stderr}`);
  }
  // Parse summary lines for batch results
  const lines = stdout.split(/\r?\n/);
  const agg = { redWins:0, blueWins:0, draws:0 };
  for (const ln of lines) {
    const m = ln.match(/Wins\s*-\s*Red:\s*(\d+),\s*Blue:\s*(\d+),\s*Draws:\s*(\d+)/);
    if (m) {
      agg.redWins = parseInt(m[1], 10);
      agg.blueWins = parseInt(m[2], 10);
      agg.draws = parseInt(m[3], 10);
      break;
    }
  }
  return agg;
}

function main(){
  const opponents = listOpponentFiles();
  if (opponents.length === 0) {
    console.error('No opponent code found in ./result. Aborting.');
    process.exit(1);
  }
  console.log('Opponents:', opponents.map(p=>path.relative(ROOT,p)));

  // Define candidate variants (6-bot profiles)
  // Types: Type.TANKER, Type.DEALER, Type.NORMAL
  const T = { NORMAL: 'Type.NORMAL', TANKER: 'Type.TANKER', DEALER: 'Type.DEALER' };
  function makeProfiles(base){
    // base provides common P; we clone and adjust per slot
    const mk=(over)=>({ P: { ...base, ...over }, type: over.type || base.type });
    return [
      mk({ type:T.TANKER, bias:-12, minRange: base.minRange-10, maxRange: base.maxRange-10 }),
      mk({ type:T.TANKER, bias:+12, minRange: base.minRange-5,  maxRange: base.maxRange-5 }),
      mk({ type:T.DEALER, bias:-4,  minRange: base.minRange+40, maxRange: base.maxRange+100, strafeAngle: base.strafeAngle+4 }),
      mk({ type:T.DEALER, bias:+4,  minRange: base.minRange+30, maxRange: base.maxRange+90,  strafeAngle: base.strafeAngle-2 }),
      mk({ type:T.NORMAL, bias:-6,  minRange: base.minRange+20, maxRange: base.maxRange+60 }),
      mk({ type:T.NORMAL, bias:+6,  minRange: base.minRange+15, maxRange: base.maxRange+50 }),
    ];
  }

  const bases = [
    { id:'Raptor-10', base: { maxLeadTime:16, leadWeight:1.0, aimJitter:0.18, minRange:170, maxRange:280, strafeAngle:28, threatRadius:160, threatFleeBias:16, allySep:64, edgeMargin:46, targetHealthWeight:1.25, targetDistWeight:0.10, finishHp:24, finishRemain:3, finishMinDelta:36, finishMaxDelta:26, type:'Type.NORMAL', bias:0 } },
    { id:'Raptor-Lead', base: { maxLeadTime:18, leadWeight:1.08, aimJitter:0.14, minRange:165, maxRange:275, strafeAngle:26, threatRadius:158, threatFleeBias:14, allySep:62, edgeMargin:46, targetHealthWeight:1.30, targetDistWeight:0.08, finishHp:22, finishRemain:3, finishMinDelta:34, finishMaxDelta:24, type:'Type.NORMAL', bias:0 } },
    { id:'Raptor-Orbit', base: { maxLeadTime:15, leadWeight:0.98, aimJitter:0.22, minRange:190, maxRange:340, strafeAngle:32, threatRadius:156, threatFleeBias:15, allySep:66, edgeMargin:48, targetHealthWeight:1.20, targetDistWeight:0.12, finishHp:22, finishRemain:2, finishMinDelta:40, finishMaxDelta:30, type:'Type.NORMAL', bias:0 } },
    { id:'Raptor-Rush', base: { maxLeadTime:12, leadWeight:1.00, aimJitter:0.16, minRange:140, maxRange:240, strafeAngle:24, threatRadius:162, threatFleeBias:12, allySep:60, edgeMargin:44, targetHealthWeight:1.15, targetDistWeight:0.14, finishHp:30, finishRemain:4, finishMinDelta:30, finishMaxDelta:22, type:'Type.NORMAL', bias:0 } },
  ];

  const candidates = bases.map(({id, base}) => ({ id, profiles: makeProfiles(base) }));

  const evaluations = [];
  for (const cand of candidates) {
    const code = makeTeamCode(cand.id, cand.profiles);
    const candFile = writeCandidate(cand.id, code);
    let totalWins = 0, totalLoss = 0, totalDraw = 0;
    const perOpp = [];
    for (const opp of opponents) {
      // A) candidate as red
      const A = runBatch(candFile, opp, 36);
      // B) candidate as blue
      const B = runBatch(opp, candFile, 36);
      const wins = A.redWins + B.blueWins;
      const losses = A.blueWins + B.redWins;
      const draws = A.draws + B.draws;
      totalWins += wins; totalLoss += losses; totalDraw += draws;
      perOpp.push({ opponent: path.relative(ROOT, opp), wins, losses, draws });
      console.log(`[${cand.id}] vs ${path.basename(opp)} -> W:${wins} L:${losses} D:${draws}`);
    }
    evaluations.push({ id: cand.id, file: candFile, totalWins, totalLoss, totalDraw, perOpp });
  }

  evaluations.sort((a,b)=> (b.totalWins - b.totalLoss) - (a.totalWins - a.totalLoss));
  const best = evaluations[0];
  console.log(`Best: ${best.id} (W:${best.totalWins} L:${best.totalLoss} D:${best.totalDraw})`);

  // Ensure result dir exists
  fs.mkdirSync(RESULT_DIR, { recursive: true });
  const finalPath = path.join(RESULT_DIR, `${TS}.txt`);
  fs.copyFileSync(best.file, finalPath);

  // RESULT.md
  const md = [];
  md.push(`# Optimization Result: ${TS}`);
  md.push('');
  md.push(`Chosen Team: ${best.id}`);
  md.push('');
  md.push('## Overall');
  md.push(`- Wins: ${best.totalWins}`);
  md.push(`- Losses: ${best.totalLoss}`);
  md.push(`- Draws: ${best.totalDraw}`);
  md.push('');
  md.push('## Per Opponent');
  for (const r of best.perOpp) {
    md.push(`- ${r.opponent}: W${r.wins} / L${r.losses} / D${r.draws}`);
  }
  fs.writeFileSync(path.join(WORK_DIR, 'RESULT.md'), md.join('\n'));

  console.log(`\nSaved best team -> ${path.relative(ROOT, finalPath)}`);
}

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(e.stack || String(e)); process.exit(1); }
}

