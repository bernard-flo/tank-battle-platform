#!/usr/bin/env node
/*
  Tank AI Optimizer
  - Generates parametric 6-bot teams
  - Simulates vs all existing teams in result/ directory
  - Picks best-performing candidate and writes final output to result/<TS>/<TS>.txt
  - Saves comparison summary to RESULT.md in working directory
*/

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Resolve project root from this file
const projectRoot = path.resolve(__dirname, '../..');
const simulatorCli = path.join(projectRoot, 'simulator', 'cli.js');

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function listOpponentFiles() {
  // Collect .txt team files in result/ (both nested and flat)
  const resDir = path.join(projectRoot, 'result');
  const out = [];
  for (const entry of fs.readdirSync(resDir)) {
    const p = path.join(resDir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      const inner = path.join(p, `${entry}.txt`);
      if (fs.existsSync(inner)) out.push(inner);
      // fallback: any .txt under the directory
      for (const f of fs.readdirSync(p)) {
        if (f.endsWith('.txt')) out.push(path.join(p, f));
      }
    } else if (stat.isFile() && entry.endsWith('.txt')) {
      out.push(p);
    }
  }
  // De-duplicate
  return [...new Set(out)].sort();
}

function teamNameFromPath(p) {
  const b = path.basename(p);
  return b.replace(/\.txt$/, '');
}

function writeCandidate(dir, name, code) {
  const f = path.join(dir, 'candidates', `${name}.js`);
  fs.writeFileSync(f, code);
  return f;
}

function runBatch(redFile, blueFile, repeat = 30, concurrency = 8) {
  const tmpJson = path.join(projectRoot, 'result', `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  const cmd = [
    'node', simulatorCli,
    '--red', redFile,
    '--blue', blueFile,
    '--repeat', String(repeat),
    '--concurrency', String(concurrency),
    '--fast',
    '--runner', 'secure',
    '--json', tmpJson,
  ].map((x) => (x.includes(' ') ? `'${x.replace(/'/g, "'\''")}'` : x)).join(' ');
  try {
    sh(cmd, { cwd: projectRoot });
    const data = JSON.parse(fs.readFileSync(tmpJson, 'utf8'));
    fs.unlinkSync(tmpJson);
    return data.aggregate || data.summary || null;
  } catch (e) {
    try { fs.unlinkSync(tmpJson); } catch (_) {}
    throw e;
  }
}

function genBotBlock(roleName, roleType, P, idxBias = 0) {
  // roleType: 'NORMAL' | 'TANKER' | 'DEALER'
  // P: parameter object used inside the block
  const n = roleName;
  return `
function name(){return ${JSON.stringify(n)};}
function type(){return Type.${roleType};}
let __s = { last: null, tick: 0 };
function update(tank, enemies, allies, bulletInfo){
  const toDeg=(x,y)=>Math.atan2(y,x)*180/Math.PI;
  const norm=(a)=>{a%=360; if(a<0)a+=360; return a;};
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hypot=Math.hypot;
  const rnd=((tank.x*97+tank.y*131+${idxBias})|0)%2?1:-1;
  const P=${JSON.stringify(P)};

  __s.tick=(__s.tick||0)+1;

  // Target selection: lowest effective HP then distance
  let tgt=null; let best=1e9;
  for(const e of enemies){
    const k = e.health*P.healthW + e.distance*P.distW;
    if(k<best){ best=k; tgt=e; }
  }

  // Predictive lead using last observation of same slot target
  if(tgt){
    let aimX=tgt.x, aimY=tgt.y;
    if(__s.last){
      const vx=(tgt.x-__s.last.x);
      const vy=(tgt.y-__s.last.y);
      const dx=tgt.x-tank.x, dy=tgt.y-tank.y; const d=hypot(dx,dy);
      const tLead = clamp(d/8, 0, P.leadCap);
      aimX = tgt.x + vx*P.leadW*tLead;
      aimY = tgt.y + vy*P.leadW*tLead;
    }
    const jitter = ((((tank.x*31+tank.y*17+${idxBias})%23)-11)*0.07) * P.aimJitter;
    const fireAngle = toDeg(aimX-tank.x, aimY-tank.y) + jitter;
    tank.fire(fireAngle);
    __s.last = { x:tgt.x, y:tgt.y };
  }

  let tries=0; const tryMove=(a)=>{tries++; return tank.move(norm(a));};

  // Bullet avoidance: lateral dodge relative to bullet vector
  let hot=null; let minD=1e9;
  for(const b of bulletInfo){
    const dx=b.x-tank.x, dy=b.y-tank.y; const v=hypot(b.vx,b.vy)||1;
    const nx=b.vx/v, ny=b.vy/v; const proj=dx*nx+dy*ny;
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
      const side = to + (((tank.x*13+tank.y*7+${idxBias})|0)%2?P.strafe:-P.strafe) + P.bias*0.5;
      if(tryMove(side)) return; if(tryMove(side+16)) return; if(tryMove(side-16)) return;
    }
  }

  // Fallback sweep
  const sweep=[0,60,120,180,240,300];
  for(const s of sweep){ if(tryMove(s+P.bias)) return; }
}
`.trim();
}

function genTeamCode(label, params) {
  const blocks = [];
  // 6 bots: 2x TANKER, 2x NORMAL, 2x DEALER with mild param tweaks
  blocks.push(genBotBlock(`${label}-T1`, 'TANKER', params.TANKER[0], 11));
  blocks.push(genBotBlock(`${label}-T2`, 'TANKER', params.TANKER[1], 19));
  blocks.push(genBotBlock(`${label}-N1`, 'NORMAL', params.NORMAL[0], -7));
  blocks.push(genBotBlock(`${label}-N2`, 'NORMAL', params.NORMAL[1], 5));
  blocks.push(genBotBlock(`${label}-D1`, 'DEALER', params.DEALER[0], -13));
  blocks.push(genBotBlock(`${label}-D2`, 'DEALER', params.DEALER[1], 23));
  return blocks.join('\n\n\n// ===== 다음 로봇 =====\n\n\n');
}

function randBetween(a,b){ return a + Math.random()*(b-a); }
function round1(x){ return Math.round(x*10)/10; }

function sampleParams(seedBias = 0) {
  // Base ranges tuned from strong baselines with slight randomization
  // Add flavors to diversify search against strong opponents (e.g., heavy kiting)
  function role(rMin, rMax, strafe, threatR, fleeBias, sep, edge, bias){
    return {
      rMin: round1(randBetween(rMin[0], rMin[1])),
      rMax: round1(randBetween(rMax[0], rMax[1])),
      strafe: round1(randBetween(strafe[0], strafe[1])),
      threatR: round1(randBetween(threatR[0], threatR[1])),
      fleeBias: round1(randBetween(fleeBias[0], fleeBias[1])),
      sep: round1(randBetween(sep[0], sep[1])),
      edge: round1(randBetween(edge[0], edge[1])),
      bias: round1(randBetween(bias[0], bias[1])),
      leadCap: round1(randBetween(10, 15)),
      leadW: round1(randBetween(0.8, 1.2)),
      aimJitter: round1(randBetween(0.05, 0.22)),
      healthW: round1(randBetween(1.0, 1.4)),
      distW: round1(randBetween(0.08, 0.16)),
      finisherHP: round1(randBetween(16, 26)),
      aggrRemain: Math.floor(randBetween(2, 4.9)),
      aggrIn: round1(randBetween(22, 42)),
      aggrOut: round1(randBetween(16, 32)),
    };
  }

  // Flavor selection
  const flavors = ['balanced','aggressive','kite'];
  const flavor = flavors[Math.floor(randBetween(0, flavors.length))];
  let T1, T2, N1, N2, D1, D2;
  if (flavor === 'aggressive') {
    T1 = role([130,160],[210,245],[24,30],[76,90],[14,20],[56,68],[38,50],[-12, 8]);
    T2 = role([135,165],[215,255],[24,30],[76,90],[14,20],[56,68],[38,50],[ -8,12]);
    N1 = role([150,180],[230,270],[26,34],[74,86],[12,18],[56,68],[40,50],[-10, 6]);
    N2 = role([155,185],[235,275],[26,34],[74,86],[12,18],[56,68],[40,50],[ -6,10]);
    D1 = role([190,225],[285,325],[30,38],[70,82],[12,18],[56,68],[40,50],[ -6, 8]);
    D2 = role([195,230],[290,335],[30,38],[70,82],[12,18],[56,68],[40,50],[ -4,12]);
  } else if (flavor === 'kite') {
    T1 = role([160,190],[260,300],[28,36],[70,82],[12,16],[58,72],[40,54],[-8, 8]);
    T2 = role([165,195],[265,305],[28,36],[70,82],[12,16],[58,72],[40,54],[ -6,10]);
    N1 = role([180,215],[280,330],[30,38],[68,78],[12,16],[58,72],[40,54],[-10, 6]);
    N2 = role([185,220],[285,340],[30,40],[68,78],[12,16],[58,72],[40,54],[ -6,10]);
    D1 = role([230,270],[330,380],[34,44],[66,76],[12,16],[58,72],[40,54],[ -6,10]);
    D2 = role([235,275],[335,385],[34,44],[66,76],[12,16],[58,72],[40,54],[ -4,12]);
  } else {
    // balanced (default)
    T1 = role([140,170],[220,260],[24,32],[72,86],[12,18],[56,68],[38,50],[-10,10]);
    T2 = role([150,180],[230,270],[24,32],[72,86],[12,18],[56,68],[38,50],[ -6,14]);
    N1 = role([160,195],[240,290],[26,34],[70,82],[12,16],[56,68],[40,50],[-10,8]);
    N2 = role([165,200],[250,300],[26,34],[70,82],[12,16],[56,68],[40,50],[ -6,10]);
    D1 = role([200,240],[300,340],[30,38],[68,78],[12,16],[56,68],[40,50],[-6, 8]);
    D2 = role([205,245],[305,355],[30,38],[68,78],[12,16],[56,68],[40,50],[ -4,12]);
  }

  return {
    TANKER: [T1, T2],
    NORMAL: [N1, N2],
    DEALER: [D1, D2],
  };
}

function evaluateCandidate(cPath, opponents, repeat, concurrency) {
  let totalWins = 0, totalLosses = 0, totalDraws = 0;
  const perOpponent = [];
  for (const opp of opponents) {
    // As red
    const R = runBatch(cPath, opp, repeat, concurrency);
    const rWins = R.redWins || (R.winner==='red'?1:0);
    const rLoss = R.blueWins || (R.winner==='blue'?1:0);
    const rDraw = R.draws || (R.winner==='draw'?1:0);
    // As blue
    const B = runBatch(opp, cPath, repeat, concurrency);
    const bWins = B.blueWins || (B.winner==='blue'?1:0);
    const bLoss = B.redWins || (B.winner==='red'?1:0);
    const bDraw = B.draws || (B.winner==='draw'?1:0);

    const wins = rWins + bWins;
    const losses = rLoss + bLoss;
    const draws = rDraw + bDraw;
    totalWins += wins; totalLosses += losses; totalDraws += draws;
    perOpponent.push({ opponent: opp, wins, losses, draws, R, B });
  }
  return { totalWins, totalLosses, totalDraws, perOpponent };
}

function main() {
  const TS = fs.readFileSync(path.join(__dirname, 'TIMESTAMP'), 'utf8').trim();
  const wd = __dirname;
  const opponents = listOpponentFiles();
  const labelBase = 'Astra';

  // Generate candidate set
  const candidates = [];
  const C = process.env.CAND ? parseInt(process.env.CAND, 10) : 16; // number of random candidates
  for (let i = 0; i < C; i++) {
    const params = sampleParams(i);
    const label = `${labelBase}-v${i+1}`;
    const code = genTeamCode(label, params);
    const file = writeCandidate(wd, label, code);
    candidates.push({ label, file, params });
  }

  const repeat = process.env.REPEAT ? parseInt(process.env.REPEAT, 10) : 25;
  const concurrency = process.env.CONC ? parseInt(process.env.CONC, 10) : 8;

  // Evaluate
  let best = null;
  for (const cand of candidates) {
    const r = evaluateCandidate(cand.file, opponents, repeat, concurrency);
    const score = r.totalWins - r.totalLosses; // net wins
    cand.result = r;
    cand.score = score;
    console.log(`[Candidate ${cand.label}] Wins: ${r.totalWins}, Losses: ${r.totalLosses}, Draws: ${r.totalDraws}, Score: ${score}`);
    if (!best || score > best.score) best = cand;
  }

  if (!best) throw new Error('No best candidate selected');

  // Write final result to result/<TS>/<TS>.txt
  const outDir = path.join(projectRoot, 'result', TS);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${TS}.txt`);
  const finalCode = genTeamCode(best.label, best.params);
  fs.writeFileSync(outFile, finalCode);

  // Save RESULT.md with per-opponent breakdown
  const md = [];
  md.push(`# Result Summary for ${TS}`);
  md.push('');
  md.push(`Team: ${best.label}`);
  md.push(`Repeat: ${repeat}, Concurrency: ${concurrency}`);
  md.push('');
  md.push(`Overall: Wins ${best.result.totalWins}, Losses ${best.result.totalLosses}, Draws ${best.result.totalDraws}, Score ${best.score}`);
  md.push('');
  md.push('## Per Opponent');
  for (const p of best.result.perOpponent) {
    const name = teamNameFromPath(p.opponent);
    md.push(`- ${name}: W ${p.wins} / L ${p.losses} / D ${p.draws}`);
  }
  fs.writeFileSync(path.join(wd, 'RESULT.md'), md.join('\n'));

  console.log(`\nFinalized -> ${outFile}`);
}

if (require.main === module) {
  main();
}
