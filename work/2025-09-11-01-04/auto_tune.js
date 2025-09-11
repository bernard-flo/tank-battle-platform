#!/usr/bin/env node
/*
Auto-tune Tank AI against recent opponents.
- Generates multiple candidate teams with parameter variations
- Evaluates vs recent result/*.txt opponents using simulator/cli.js
- Picks best by aggregate win rate and writes final code to result/TS/TS.txt
- Writes RESULT.md summary in working directory
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Resolve repository root (two levels up from this script)
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SIM_CLI = path.join(REPO_ROOT, 'simulator', 'cli.js');
const TS = path.basename(process.cwd());
const OUT_RESULT_DIR = path.join(REPO_ROOT, 'result', TS);
const OUT_WORK_DIR = path.join(REPO_ROOT, 'work', TS);

function listRecentOpponents(limit = 12) {
  const resDir = path.join(REPO_ROOT, 'result');
  const dirs = fs.readdirSync(resDir)
    .filter((d) => fs.existsSync(path.join(resDir, d, `${d}.txt`)))
    .map((d) => ({ d, mtime: fs.statSync(path.join(resDir, d)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((x) => path.join(resDir, x.d, `${x.d}.txt`));
  return dirs;
}

function buildTeamCode(params) {
  const cfg = Object.assign({
    namePrefix: 'Aquila',
    comp: ['TANKER','TANKER','DEALER','DEALER','DEALER','NORMAL'],
    jitter: 0.35,
    allySepDist: 60,
    bulletThreat: { TANKER: 66, DEALER: 72, NORMAL: 68 },
    kite: {
      TANKER: { near: 170, far: 260, side: 12 },
      DEALER: { near: 225, far: 335, side: 24 },
      NORMAL: { near: 200, far: 300, side: 8 },
    },
    strafePref: [0, 90, 180, 270],
  }, params || {});

  function oneBot(idx, role, roleOffset) {
    const nm = `${cfg.namePrefix}-${role[0]}${idx+1}`;
    const typeExpr = role === 'TANKER' ? 'Type.TANKER' : role === 'DEALER' ? 'Type.DEALER' : 'Type.NORMAL';
    const threat = cfg.bulletThreat[role];
    const k = cfg.kite[role];
    const jitter = cfg.jitter * (role === 'DEALER' ? 1.1 : role === 'TANKER' ? 0.9 : 1.0);

    return `function name(){return "${nm}";}
function type(){return ${typeExpr};}
function update(tank,enemies,allies,bulletInfo){
  function ang(a){a%=360; if(a<0)a+=360; return a;}
  function deg(x,y){return Math.atan2(y,x)*180/Math.PI;}
  function closest(arr){let r=null,md=1e9; for(const e of arr){if(e.distance<md){md=e.distance;r=e;}} return r;}
  function threat(b){
    const dx=b.x-tank.x, dy=b.y-tank.y; const dv=Math.hypot(b.vx,b.vy)||1; const nx=b.vx/dv, ny=b.vy/dv;
    const proj = dx*nx+dy*ny; if(proj>0){ const px=b.x-proj*nx, py=b.y-proj*ny; const d=Math.hypot(px-tank.x,py-tank.y); return d<(${threat}); } return false;
  }
  function tryMove(a){ return tank.move(ang(a)); }

  const tgt = enemies.length?closest(enemies):null;
  if(tgt){
    const base = deg(tgt.x-tank.x,tgt.y-tank.y);
    const jit = ((tank.x*31+tank.y*17)%23-11)*${jitter.toFixed(3)};
    tank.fire(base + jit);
  }
  // Dodge bullets first
  let hot=null, minD=1e9; for(const b of bulletInfo){const d=Math.hypot(b.x-tank.x,b.y-tank.y); if(d<minD && threat(b)){minD=d; hot=b;}}
  if(hot){
    const a = deg(hot.vx,hot.vy);
    const cand=[a+90+(${roleOffset}), a-90-(${roleOffset}), a+110, a-110];
    for(const c of cand){ if(tryMove(c)) return; }
  }
  // Ally separation to reduce collisions
  if(allies.length){ const ally=closest(allies); if(ally && ally.distance < ${cfg.allySepDist}){ const av=deg(tank.x-ally.x,tank.y-ally.y); if(tryMove(av)) return; if(tryMove(av+30)) return; if(tryMove(av-30)) return; }}
  // Kiting / approach / side-strafe
  if(tgt){ const d=tgt.distance; const to=deg(tgt.x-tank.x,tgt.y-tank.y);
    if(d < ${k.near}){ const away = to+180 + (${roleOffset}); if(tryMove(away)) return; if(tryMove(away+25)) return; if(tryMove(away-25)) return; }
    else if(d > ${k.far}){ if(tryMove(to)) return; if(tryMove(to+20)) return; if(tryMove(to-20)) return; }
    else { const side = to + (${k.side}); if(tryMove(side)) return; if(tryMove(side+20)) return; if(tryMove(side-20)) return; }
  }
  // Fallback strafes
  const pref=${JSON.stringify(cfg.strafePref)}; for(const p of pref){ if(tryMove(p+(${roleOffset}))) return; }
}`;
  }

  const pieces = [];
  for (let i = 0; i < 6; i++) {
    const role = cfg.comp[i] || 'NORMAL';
    const offset = role === 'DEALER' ? 22 - i*2 : role === 'TANKER' ? -12 + i*3 : 0;
    pieces.push(oneBot(i, role, offset));
  }
  return pieces.join('\n\n// ===== 다음 로봇 =====\n\n');
}

function runMatchBatch(redFile, blueFile, repeat = 24, seed = 123, concurrency = 8) {
  const jsonOut = path.join(OUT_WORK_DIR, `tmp_${path.basename(redFile)}_vs_${path.basename(blueFile)}.json`);
  const args = [SIM_CLI, '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--fast', '--runner', 'secure', '--concurrency', String(concurrency), '--json', jsonOut];
  const r = spawnSync('node', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`simulator failed: ${r.stderr || r.stdout}`);
  }
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  const agg = data.aggregate;
  return { redWins: agg.redWins, blueWins: agg.blueWins, draws: agg.draws, matches: agg.matches };
}

function evaluateCandidates(candidates, opponents, repeatPerOpp = 18) {
  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const candFile = path.join(OUT_WORK_DIR, `cand_${i+1}.txt`);
    fs.writeFileSync(candFile, cand.code);
    let wins = 0, losses = 0, draws = 0, games = 0;
    const breakdown = [];
    for (const opp of opponents) {
      const r = runMatchBatch(candFile, opp, repeatPerOpp, 4321, Math.min(12, require('os').cpus().length));
      wins += r.redWins; losses += r.blueWins; draws += r.draws; games += r.matches;
      breakdown.push({ opponent: opp.replace(REPO_ROOT+path.sep, ''), winRate: +(r.redWins / r.matches * 100).toFixed(1), W: r.redWins, L: r.blueWins, D: r.draws, n: r.matches });
    }
    const winRate = games ? wins / games : 0;
    results.push({ idx: i+1, name: cand.name, wins, losses, draws, games, winRate, breakdown });
  }
  results.sort((a,b)=> b.winRate - a.winRate || b.wins - a.wins);
  return results;
}

function main() {
  const opponents = listRecentOpponents(12);
  if (opponents.length === 0) throw new Error('No opponents found in result/*/*.txt');

  const base = {
    namePrefix: 'Aquila',
    comp: ['TANKER','TANKER','DEALER','DEALER','DEALER','NORMAL'],
    jitter: 0.33,
    allySepDist: 60,
    bulletThreat: { TANKER: 66, DEALER: 72, NORMAL: 68 },
    kite: {
      TANKER: { near: 170, far: 260, side: 12 },
      DEALER: { near: 225, far: 335, side: 24 },
      NORMAL: { near: 200, far: 300, side: 8 },
    },
    strafePref: [0, 90, 180, 270],
  };

  const variants = [];
  const jitters = [0.28, 0.33, 0.38];
  const dealerNear = [215, 230, 245];
  const dealerFar = [320, 335, 350];
  const tankNear = [160, 175];
  const tankFar = [250, 270];
  let id = 0;
  for (const j of jitters) {
    for (const dn of dealerNear) {
      for (const df of dealerFar) {
        const cfg = JSON.parse(JSON.stringify(base));
        cfg.namePrefix = `Aquila-${++id}`;
        cfg.jitter = j;
        cfg.kite.DEALER.near = dn;
        cfg.kite.DEALER.far = df;
        cfg.kite.TANKER.near = tankNear[(id+j*100)%tankNear.length|0];
        cfg.kite.TANKER.far = tankFar[(id+df)%tankFar.length|0];
        variants.push({ name: cfg.namePrefix, code: buildTeamCode(cfg), cfg });
        if (variants.length >= 12) break;
      }
      if (variants.length >= 12) break;
    }
    if (variants.length >= 12) break;
  }

  // Include a balanced NORMAL-heavy variant
  const normalHeavy = JSON.parse(JSON.stringify(base));
  normalHeavy.namePrefix = 'Aquila-N';
  normalHeavy.comp = ['TANKER','NORMAL','DEALER','NORMAL','DEALER','NORMAL'];
  variants.push({ name: normalHeavy.namePrefix, code: buildTeamCode(normalHeavy), cfg: normalHeavy });

  const results = evaluateCandidates(variants, opponents, 16);
  const best = results[0];

  // Write best code to result dir
  const bestFile = path.join(OUT_RESULT_DIR, `${TS}.txt`);
  fs.writeFileSync(bestFile, variants[best.idx-1].code);

  // Summarize
  let md = `# Evaluation Result\n\nBest: ${best.name} (winRate=${(best.winRate*100).toFixed(1)}%)\n\n## Candidates\n`;
  for (const r of results) {
    md += `- ${r.name}: winRate=${(r.winRate*100).toFixed(1)}% (games=${r.games}, wins=${r.wins}, losses=${r.losses}, draws=${r.draws})\n`;
  }
  md += `\n## Breakdown vs Opponents (Best)\n`;
  for (const b of best.breakdown) {
    md += `- vs ${b.opponent}: winRate=${b.winRate}%, W:${b.W} L:${b.L} D:${b.D} (n=${b.n})\n`;
  }
  fs.writeFileSync(path.join(OUT_WORK_DIR, 'RESULT.md'), md);

  console.log(`Wrote best code -> ${bestFile}`);
  console.log(`RESULT.md saved in work/${TS}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
