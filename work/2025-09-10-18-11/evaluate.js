#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { runMatch } = require('../../simulator/engine');
const { compileTeamFromCode } = require('../../simulator/bot_loader');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i+1]; if (n && !n.startsWith('--')) { args[k]=n; i++; } else { args[k]=true; } }
  }
  return args;
}

function listOpponents(limit = 10, excludeStamp = null, order = 'desc') {
  const resultDir = path.resolve('../../result');
  const dirs = fs.readdirSync(resultDir).filter((d) => fs.statSync(path.join(resultDir, d)).isDirectory());
  const entries = [];
  for (const d of dirs) {
    if (excludeStamp && d === excludeStamp) continue;
    const txts = fs.readdirSync(path.join(resultDir, d)).filter((f)=>f.endsWith('.txt'));
    if (txts.length===0) continue;
    let pick = txts[0]; let best=-1; for (const f of txts) { const s=fs.statSync(path.join(resultDir,d,f)).size; if (s>best) {best=s; pick=f;} }
    entries.push({ dir:d, file: pick, path: path.join(resultDir, d, pick), size: best });
  }
  entries.sort((a,b)=> (a.dir < b.dir ? 1 : -1));
  if (order==='asc') entries.reverse();
  return entries.slice(0, limit);
}

async function evalPair(redCode, blueCode, seeds, baseSeed) {
  const red = compileTeamFromCode(redCode, 'red', 'secure');
  const blue = compileTeamFromCode(blueCode, 'blue', 'secure');
  const players = [...red, ...blue];
  let redWins=0, blueWins=0, draws=0, ticks=0, rAl=0, bAl=0, rEn=0, bEn=0;
  for (let i=0;i<seeds;i++){
    const s = baseSeed + i;
    const res = runMatch(players, { seed: s, fast: true, maxTicks: 5000 });
    if (res.winner==='red') redWins++; else if (res.winner==='blue') blueWins++; else draws++;
    ticks += res.ticks; rAl += res.stats.redAlive; bAl += res.stats.blueAlive; rEn += Math.round(res.stats.redEnergy); bEn += Math.round(res.stats.blueEnergy);
  }
  return { matches: seeds, redWins, blueWins, draws, avgTicks: +(ticks/seeds).toFixed(2), avgRedAlive:+(rAl/seeds).toFixed(3), avgBlueAlive:+(bAl/seeds).toFixed(3), avgRedEnergy:+(rEn/seeds).toFixed(2), avgBlueEnergy:+(bEn/seeds).toFixed(2) };
}

async function main(){
  const args = parseArgs(process.argv);
  const stamp = args.stamp;
  const seeds = Math.max(8, parseInt(args.seeds || '20', 10));
  const limit = Math.max(4, parseInt(args.limit || '10', 10));
  const order = args.oldest ? 'asc' : 'desc';
  const baseSeed = Math.floor(Math.random()*1e9);
  const teamPath = path.resolve(`../../result/${stamp}/${stamp}.txt`);
  const code = fs.readFileSync(teamPath, 'utf8');
  const opponents = listOpponents(limit, stamp, order);
  const lines = [];
  lines.push(`\n## Additional Evaluation (${order==='desc'?'newest':'oldest'})`);
  lines.push(`Opponents: ${opponents.length}, seeds per opponent: ${seeds}`);
  for (const o of opponents) {
    const blue = fs.readFileSync(o.path,'utf8');
    const s = await evalPair(code, blue, seeds, baseSeed);
    lines.push(`- ${o.dir}/${o.file}: wins ${s.redWins}/${s.matches}, draws ${s.draws}, avgTicks ${s.avgTicks}, avgAlive R:${s.avgRedAlive} B:${s.avgBlueAlive}, avgEnergy R:${s.avgRedEnergy} B:${s.avgBlueEnergy}`);
  }
  fs.appendFileSync(path.resolve('./RESULT.md'), '\n'+lines.join('\n')+'\n');
  console.log('Appended evaluation to RESULT.md');
}

if (require.main===module) main().catch((e)=>{console.error(e);process.exit(1);});

