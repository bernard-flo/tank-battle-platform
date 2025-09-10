#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sh(cmd, args, opts={}){
  const res = spawnSync(cmd, args, { encoding:'utf8', ...opts });
  if(res.status!==0){
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${res.stderr}`);
  }
  return res.stdout.trim();
}

function listOpponentFiles(resultDir, excludeDir){
  const res = [];
  function walk(dir){
    const ents = fs.readdirSync(dir,{ withFileTypes:true });
    for(const e of ents){
      const p = path.join(dir, e.name);
      if(e.isDirectory()){
        if(path.resolve(p)===path.resolve(excludeDir)) continue;
        walk(p);
      } else if(e.isFile()){
        if(e.name.endsWith('.txt')) res.push(p);
      }
    }
  }
  walk(resultDir);
  return res.sort();
}

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const out = path.join(path.dirname(redFile), `result_${path.basename(blueFile).replace(/\W+/g,'_')}_${repeat}.json`);
  const args = ['simulator/cli.js','--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', out, '--fast', '--runner', 'secure', '--concurrency', String(concurrency)];
  sh('node', args);
  const j = JSON.parse(fs.readFileSync(out,'utf8'));
  return j.aggregate || j.summary;
}

function evaluate(ourFile, oppFile, repeatPerOpp=20, seedBase=24680, concurrency=8){
  const a = runBatch(ourFile, oppFile, repeatPerOpp, seedBase, concurrency);
  const b = runBatch(oppFile, ourFile, repeatPerOpp, seedBase+1337, concurrency);
  const total = a.matches + b.matches;
  const wins = a.redWins + b.blueWins;
  const losses = a.blueWins + b.redWins;
  const draws = a.draws + b.draws;
  const wr = wins/total;
  return { total, wins, losses, draws, wr, a, b };
}

function main(){
  const ROOT = path.resolve(__dirname, '..', '..');
  const TS = path.basename(path.dirname(__filename));
  const RD = path.resolve(ROOT, 'result', TS);
  const ourFile = path.join(RD, TS + '.txt');
  if(!fs.existsSync(ourFile)){
    console.error('Our team file not found:', ourFile);
    process.exit(1);
  }

  const allOpps = listOpponentFiles(path.resolve(ROOT, 'result'), RD);
  if(allOpps.length===0){
    console.error('No opponents found');
    process.exit(1);
  }

  const results = [];
  let sumWr = 0; let beaten = 0; let worst = { wr: 1, opp: null };
  for(const opp of allOpps){
    const r = evaluate(ourFile, opp, 20, 24680, 8);
    results.push({ opponent: opp, ...r });
    sumWr += r.wr;
    if(r.wr > 0.5) beaten++;
    if(r.wr < worst.wr) worst = { wr: r.wr, opp };
    console.log(`${path.basename(ourFile)} vs ${path.basename(path.dirname(opp))}/${path.basename(opp)} => wr=${r.wr.toFixed(3)} draws=${r.draws}`);
  }
  const avgWr = +(sumWr/results.length).toFixed(3);
  const md = [];
  md.push('');
  md.push('---');
  md.push('');
  md.push(`All-opponents evaluation (count=${results.length})`);
  md.push(`- Average WR: ${avgWr}`);
  md.push(`- Beaten: ${beaten}/${results.length}`);
  md.push(`- Worst opponent: ${path.basename(path.dirname(worst.opp))}/${path.basename(worst.opp)} (wr=${worst.wr.toFixed(3)})`);
  md.push('');
  md.push('### Per-opponent WR (sorted asc)');
  results.sort((a,b)=>a.wr-b.wr);
  for(const r of results){
    const base = path.basename(path.dirname(r.opponent)) + '/' + path.basename(r.opponent);
    md.push(`- ${base}: wr=${r.wr.toFixed(3)} (wins=${r.wins}, losses=${r.losses}, draws=${r.draws})`);
  }

  const outMd = path.join(__dirname, 'RESULT.md');
  const prev = fs.existsSync(outMd) ? fs.readFileSync(outMd,'utf8') : '';
  fs.writeFileSync(outMd, prev + '\n' + md.join('\n'));
}

if(require.main===module){
  main();
}
