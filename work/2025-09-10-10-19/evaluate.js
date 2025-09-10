#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function listOpponents(resultDir, myTs){
  const dirs = fs.readdirSync(resultDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== myTs)
    .map(d => path.join(resultDir, d.name));
  const files = [];
  for(const d of dirs){
    for(const f of fs.readdirSync(d)){
      if(f.endsWith('.txt')) files.push(path.join(d, f));
    }
  }
  return files;
}

function runMatch(redFile, blueFile, repeat=50, seed=777, concurrency=8){
  const jsonOut = path.join(process.cwd(), `.tmp_${path.basename(redFile)}_vs_${path.basename(blueFile)}_${repeat}.json`);
  const args = [path.join('simulator','cli.js'), '--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--fast', '--runner', 'secure', '--concurrency', String(concurrency), '--json', jsonOut];
  execFileSync('node', args, { stdio: ['ignore','pipe','pipe'] });
  const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  fs.unlinkSync(jsonOut);
  return data;
}

function aggregateAgainstSet(cand, opponents, repeatEach=40){
  let total = { matches: 0, redWins:0, blueWins:0, draws:0 };
  const perOpp = [];
  for(const opp of opponents){
    const res = runMatch(cand, opp, repeatEach, 123, Math.min(12, require('os').cpus().length));
    const agg = res.aggregate || { redWins: 0, blueWins: 0, draws: 0, matches: repeatEach };
    perOpp.push({ opponent: opp, ...agg });
    total.matches += agg.matches;
    total.redWins += agg.redWins;
    total.blueWins += agg.blueWins;
    total.draws += agg.draws;
  }
  const winRate = total.redWins / Math.max(1,total.matches);
  return { total, perOpp, winRate };
}

function pickBestCandidate(cands, opponents){
  let best = null;
  for(const c of cands){
    const r = aggregateAgainstSet(c, opponents, 30);
    if(!best || r.total.redWins - r.total.blueWins > best.total.redWins - best.total.blueWins){
      best = { cand: c, ...r };
    }
    console.log(`[Eval] ${path.basename(c)} => wins ${r.total.redWins}/${r.total.matches} (draws ${r.total.draws})`);
  }
  return best;
}

function main(){
  const ts = fs.readFileSync(path.join('work','.timestamp'), 'utf8').trim(); // optional fallback
}

if(require.main===module){
  const myTs = fs.readFileSync(path.join(process.cwd(), '.timestamp'), 'utf8').trim();
  const workDir = process.cwd();
  const candDir = path.join(workDir, 'candidates');
  const candidates = fs.readdirSync(candDir).filter(f=>f.endsWith('.txt')).map(f=>path.join(candDir, f));
  if(candidates.length===0){ console.error('No candidate files.'); process.exit(1); }
  const opponents = listOpponents('result', myTs);
  if(opponents.length===0){ console.error('No opponents found under result/.'); process.exit(1); }
  console.log(`Found ${candidates.length} candidates and ${opponents.length} opponents.`);
  const best = pickBestCandidate(candidates, opponents);
  console.log(`Best candidate: ${path.basename(best.cand)} winRate=${(best.winRate*100).toFixed(2)}%`);
  // Re-evaluate best with higher repeats for final report
  const final = aggregateAgainstSet(best.cand, opponents, 60);
  // Write RESULT.md
  const lines = [];
  lines.push(`# Evaluation Result for ${myTs}`);
  lines.push('');
  lines.push(`Best Candidate: ${path.basename(best.cand)}`);
  lines.push(`Overall: wins=${final.total.redWins}, losses=${final.total.blueWins}, draws=${final.total.draws}, matches=${final.total.matches}, winRate=${(final.total.redWins/final.total.matches*100).toFixed(2)}%`);
  lines.push('');
  lines.push('## Per-Opponent Summary');
  for(const o of final.perOpp){
    const name = path.basename(path.dirname(o.opponent)) + '/' + path.basename(o.opponent);
    const wr = (o.redWins/o.matches*100).toFixed(1);
    lines.push(`- ${name}: wins=${o.redWins}, losses=${o.blueWins}, draws=${o.draws}, matches=${o.matches}, winRate=${wr}%`);
  }
  fs.writeFileSync(path.join(workDir, 'RESULT.md'), lines.join('\n'));
  // Copy best to result dir with required name
  const outDir = path.join('result', myTs);
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${myTs}.txt`);
  fs.copyFileSync(best.cand, outFile);
  console.log(`Saved final team to ${outFile}`);
}
