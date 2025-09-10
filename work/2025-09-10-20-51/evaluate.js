#!/usr/bin/env node
/*
Evaluate candidate teams against existing result/*.txt baselines using the headless simulator.
Generates JSON summaries and RESULT.md, and copies the best candidate to result/.
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const simCli = path.join(root, 'simulator', 'cli.js');
const resultDir = path.join(root, 'result');
const workDir = __dirname;
const simOutDir = path.join(workDir, 'sim');
fs.mkdirSync(simOutDir, { recursive: true });

function listOpponents(){
  const files = fs.readdirSync(resultDir).filter(f=>f.endsWith('.txt'));
  return files.map(f=>path.join(resultDir,f));
}

function listCandidates(){
  const candDir = path.join(workDir, 'candidates');
  const files = fs.readdirSync(candDir).filter(f=>f.endsWith('.txt'));
  return files.map(f=>path.join(candDir,f));
}

function runBatch(red, blue, outJson, repeat=80, seed=12345, concurrency=8){
  const args = [simCli, '--red', red, '--blue', blue, '--repeat', String(repeat), '--seed', String(seed), '--fast', '--concurrency', String(concurrency), '--json', outJson];
  const r = spawnSync('node', args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Simulator failed');
  const txt = fs.readFileSync(outJson,'utf8');
  return JSON.parse(txt);
}

function base(b){ return path.basename(b).replace(/\.txt$/,''); }

function evalCandidate(cand, opponents){
  const name = base(cand);
  let totalWins = 0, totalLosses = 0, totalDraws=0, totalMatches=0;
  const perOpp = [];
  for (const opp of opponents){
    const oname = base(opp);
    const Ajson = path.join(simOutDir, `${name}__vs__${oname}__A.json`);
    const Bjson = path.join(simOutDir, `${name}__vs__${oname}__B.json`);
    const A = runBatch(cand, opp, Ajson, 80, 777, 8);
    const B = runBatch(opp, cand, Bjson, 80, 888, 8);
    const Aw = A.aggregate.redWins, Al = A.aggregate.blueWins, Ad = A.aggregate.draws;
    const Bw = B.aggregate.blueWins, Bl = B.aggregate.redWins, Bd = B.aggregate.draws;
    const wins = Aw + Bw;
    const losses = Al + Bl;
    const draws = Ad + Bd;
    const matches = A.aggregate.matches + B.aggregate.matches;
    totalWins += wins; totalLosses += losses; totalDraws += draws; totalMatches += matches;
    perOpp.push({ opponent: oname, wins, losses, draws, matches, winRate: +(wins/(matches-draws||1)).toFixed(3) });
  }
  const wr = +(totalWins/(totalMatches-totalDraws||1)).toFixed(4);
  return { name, totalWins, totalLosses, totalDraws, totalMatches, winRate: wr, perOpp };
}

function pickBest(results){
  return [...results].sort((a,b)=>b.winRate - a.winRate || (b.totalWins-b.totalLosses) - (a.totalWins-a.totalLosses))[0];
}

function writeResultMD(best, all){
  const lines = [];
  lines.push(`# RESULT`);
  lines.push('');
  lines.push(`Best Candidate: ${best.name}`);
  lines.push(`Overall WinRate (excl. draws): ${(best.winRate*100).toFixed(2)}%`);
  lines.push(`Totals: W ${best.totalWins} / L ${best.totalLosses} / D ${best.totalDraws} (matches ${best.totalMatches})`);
  lines.push('');
  lines.push('Per Opponent:');
  for(const opp of best.perOpp){
    lines.push(`- ${opp.opponent}: W ${opp.wins} / L ${opp.losses} / D ${opp.draws} (WR ${(opp.winRate*100).toFixed(2)}%)`);
  }
  lines.push('');
  lines.push('All Candidates Summary:');
  for(const r of all.sort((a,b)=>b.winRate-a.winRate)){
    lines.push(`- ${r.name}: WR ${(r.winRate*100).toFixed(2)}%, Totals W${r.totalWins}/L${r.totalLosses}/D${r.totalDraws}`);
  }
  fs.writeFileSync(path.join(workDir,'RESULT.md'), lines.join('\n'));
}

function main(){
  const opponents = listOpponents();
  if (opponents.length === 0) throw new Error('No opponents found in result/*.txt');
  const candidates = listCandidates();
  const results = [];
  for(const c of candidates){
    console.log(`\n== Evaluating ${path.basename(c)} ==`);
    const r = evalCandidate(c, opponents);
    results.push(r);
    console.log(r);
  }
  const best = pickBest(results);
  writeResultMD(best, results);

  // copy best to result/
  const ts = path.basename(workDir);
  const outA = path.join(resultDir, `${ts}.txt`);
  const outDir = path.join(resultDir, ts);
  fs.mkdirSync(outDir, { recursive: true });
  const outB = path.join(outDir, `${ts}.txt`);
  const src = path.join(workDir, 'candidates', `${best.name}.txt`);
  const code = fs.readFileSync(src,'utf8');
  fs.writeFileSync(outA, code);
  fs.writeFileSync(outB, code);

  console.log(`\nBest candidate saved to:\n - ${outA}\n - ${outB}`);
}

if (require.main === module) {
  main();
}
