#!/usr/bin/env node
/* Optimize team parameters against existing opponents in result/ */
const fs = require('fs');
const path = require('path');
const { generateTeamCode } = require('./agent_template');
const botLoader = require('../../simulator/bot_loader');
const engine = require('../../simulator/engine');

function listOpponents(root){
  const out=[];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for(const ent of entries){
    if(ent.isFile() && ent.name.endsWith('.txt')){
      out.push(path.join(root, ent.name));
    } else if(ent.isDirectory()){
      const dir = path.join(root, ent.name);
      const txt = path.join(dir, `${ent.name}.txt`);
      if(fs.existsSync(txt)) out.push(txt);
      // also consider any .txt inside dir
      for(const f of fs.readdirSync(dir)){
        if(f.endsWith('.txt')) out.push(path.join(dir, f));
      }
    }
  }
  // de-duplicate
  return Array.from(new Set(out));
}

function runSeriesBattles(redCode, blueCode, repeat=12, fast=true){
  const red = botLoader.compileTeamFromCode(redCode, 'red', 'secure');
  const blue = botLoader.compileTeamFromCode(blueCode, 'blue', 'secure');
  let redWins=0, blueWins=0, draws=0;
  let redEnergy=0, blueEnergy=0;
  let ticks=0;
  const players=[...red,...blue];
  const baseSeed = 1000;
  for(let i=0;i<repeat;i++){
    const res = engine.runMatch(players, { seed: baseSeed+i, maxTicks: 4500, fast });
    if(res.winner==='red') redWins++; else if(res.winner==='blue') blueWins++; else draws++;
    redEnergy += res.stats.redEnergy;
    blueEnergy += res.stats.blueEnergy;
    ticks += res.ticks;
  }
  return { redWins, blueWins, draws, avgTicks: ticks/repeat, avgRedEnergy: redEnergy/repeat, avgBlueEnergy: blueEnergy/repeat };
}

function scoreResult(r){
  // prioritize wins, then energy advantage
  const winScore = r.redWins - r.blueWins;
  const eneScore = (r.avgRedEnergy - r.avgBlueEnergy)/50;
  return winScore*10 + eneScore;
}

function jitter(v,scale){ return v + (Math.random()*2-1)*scale; }

function mutateParams(base){
  const out = JSON.parse(JSON.stringify(base));
  for(const role of Object.keys(out.params)){
    const p = out.params[role];
    p.minRange = Math.max(120, Math.min(320, jitter(p.minRange, 18)));
    p.maxRange = Math.max(p.minRange+60, Math.min(460, jitter(p.maxRange, 22)));
    p.strafeAngle = Math.max(16, Math.min(44, jitter(p.strafeAngle, 6)));
    p.threatRadius = Math.max(120, Math.min(200, jitter(p.threatRadius, 10)));
    p.leadWeight = Math.max(0.85, Math.min(1.05, jitter(p.leadWeight, 0.05)));
    p.aimJitter = Math.max(0, Math.min(0.35, jitter(p.aimJitter, 0.05)));
    p.targetHealthWeight = Math.max(0.8, Math.min(1.8, jitter(p.targetHealthWeight, 0.15)));
    p.targetDistWeight = Math.max(0.05, Math.min(0.25, jitter(p.targetDistWeight, 0.03)));
  }
  // biases
  out.biases = out.biases.map(b=>jitter(b, 4));
  return out;
}

function pickSample(arr, n){
  if(arr.length<=n) return arr.slice();
  const out=[]; const used=new Set();
  while(out.length<n){
    const i = Math.floor(Math.random()*arr.length);
    if(!used.has(i)){ used.add(i); out.push(arr[i]); }
  }
  return out;
}

function main(){
  const projectRoot = path.resolve(__dirname, '..', '..');
  const resultRoot = path.join(projectRoot, 'result');
  const ts = path.basename(path.resolve(__dirname));
  const workDir = __dirname;

  const opponents = listOpponents(resultRoot).filter(p=>!p.includes(ts));
  if(opponents.length===0){
    console.error('No opponents found in result/.');
    process.exit(1);
  }
  const sampleOpp = pickSample(opponents, 18);

  const baseConfig = {
    names: ['Aegis-1','Aegis-2','Aegis-3','Aegis-4','Aegis-5','Aegis-6'],
    layout: ['TANKER','TANKER','NORMAL','NORMAL','DEALER','DEALER'],
    biases: [ -10, 10, -6, 6, -3, 3 ],
    params: {
      TANKER: { minRange:170, maxRange:290, strafeAngle:24, threatRadius:170, leadWeight:0.98, aimJitter:0.12, targetHealthWeight:1.25, targetDistWeight:0.1 },
      NORMAL: { minRange:190, maxRange:310, strafeAngle:28, threatRadius:162, leadWeight:0.98, aimJitter:0.15, targetHealthWeight:1.25, targetDistWeight:0.1 },
      DEALER: { minRange:235, maxRange:380, strafeAngle:34, threatRadius:155, leadWeight:0.99, aimJitter:0.10, targetHealthWeight:1.25, targetDistWeight:0.1 },
    }
  };

  let best = baseConfig;
  let bestScore = -1e9;
  let bestDetail = null;

  const tries = 12;
  for(let t=0;t<tries;t++){
    const cfg = t===0? baseConfig : mutateParams(best);
    const code = generateTeamCode(cfg);
    let aggScore=0; let wins=0, losses=0, draws=0;
    for(const opp of sampleOpp){
      const blueCode = fs.readFileSync(opp, 'utf8');
      const r = runSeriesBattles(code, blueCode, 10, true);
      const sc = scoreResult(r);
      aggScore += sc;
      wins += r.redWins; losses += r.blueWins; draws += r.draws;
    }
    if(aggScore > bestScore){
      bestScore = aggScore; best = cfg; bestDetail = { wins, losses, draws };
      fs.writeFileSync(path.join(workDir, 'best_candidate.txt'), code, 'utf8');
    }
    fs.writeFileSync(path.join(workDir, `candidate_${t}.json`), JSON.stringify({ aggScore, wins, losses, draws, cfg }, null, 2));
  }

  // Evaluate best vs all opponents with fewer repeats
  const finalCode = generateTeamCode(best);
  const summary=[]; let totalWins=0,totalLosses=0,totalDraws=0;
  for(const opp of opponents){
    const blueCode = fs.readFileSync(opp, 'utf8');
    const r = runSeriesBattles(finalCode, blueCode, 6, true);
    summary.push({ opponent: opp, redWins: r.redWins, blueWins: r.blueWins, draws: r.draws, avgTicks: +r.avgTicks.toFixed(2), avgRedEnergy: +r.avgRedEnergy.toFixed(1), avgBlueEnergy: +r.avgBlueEnergy.toFixed(1) });
    totalWins += r.redWins; totalLosses += r.blueWins; totalDraws += r.draws;
  }

  // Save outputs
  const resultDir = path.resolve(projectRoot, 'result', ts);
  if(!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive:true });
  const outTxt = path.join(resultDir, `${ts}.txt`);
  fs.writeFileSync(outTxt, finalCode, 'utf8');

  const md = [];
  md.push(`# RESULT for ${ts}`);
  md.push('');
  md.push('- Opponents tested: ' + opponents.length);
  md.push(`- Aggregate vs-all: Wins=${totalWins}, Losses=${totalLosses}, Draws=${totalDraws}`);
  md.push('- Best config:');
  md.push('');
  md.push('```json');
  md.push(JSON.stringify(best, null, 2));
  md.push('```');
  md.push('');
  md.push('## Per-opponent summary (sample)');
  for(const s of summary.slice(0,50)){
    md.push(`- ${s.opponent}: W${s.redWins}/L${s.blueWins}/D${s.draws}, avgTicks=${s.avgTicks}, E=${s.avgRedEnergy}-${s.avgBlueEnergy}`);
  }
  fs.writeFileSync(path.join(workDir, 'RESULT.md'), md.join('\n'), 'utf8');

  // Also save a machine-readable JSON of summary
  fs.writeFileSync(path.join(resultDir, `summary_${ts}.json`), JSON.stringify({ totalWins, totalLosses, totalDraws, opponents: opponents.length, sample: summary.slice(0,200) }, null, 2));

  console.log('Optimization complete.');
  console.log('Best aggregate score:', bestScore, bestDetail);
  console.log('Saved final team to', outTxt);
}

if (require.main === module){
  main();
}
