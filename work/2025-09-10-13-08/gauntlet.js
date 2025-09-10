#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sh(cmd, args){
  const res = spawnSync(cmd, args, { encoding:'utf8' });
  if(res.status!==0){ throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${res.stderr}`); }
  return res.stdout.trim();
}

const ROOT = path.resolve(__dirname, '..', '..');
const SIM = path.join(ROOT, 'simulator', 'cli.js');
const RESULT_DIR = path.join(ROOT, 'result');
const WORK_DIR = __dirname;
const OUT_BASENAME = path.basename(WORK_DIR);
const OUR_FILE = path.join(RESULT_DIR, OUT_BASENAME, `${OUT_BASENAME}.txt`);

function listOpponents(dir, excludeDir){
  const out=[];
  function walk(d){
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      const p=path.join(d,e.name);
      if(e.isDirectory()){
        if(path.resolve(p)===path.resolve(excludeDir)) continue;
        walk(p);
      } else if(e.isFile() && e.name.endsWith('.txt')) out.push(p);
    }
  }
  walk(dir);
  return out.sort();
}

function runBatch(redFile, blueFile, repeat, seed, concurrency){
  const out = path.join(WORK_DIR, `gauntlet_${path.basename(blueFile).replace(/\W+/g,'_')}_${repeat}.json`);
  sh('node', [SIM,'--red', redFile, '--blue', blueFile, '--repeat', String(repeat), '--seed', String(seed), '--json', out, '--fast', '--runner', 'secure', '--concurrency', String(concurrency)]);
  return JSON.parse(fs.readFileSync(out,'utf8')).aggregate;
}

function evaluate(ourFile, oppFile, repeatPerDir=16, seedBase=20240910, concurrency=8){
  const a = runBatch(ourFile, oppFile, repeatPerDir, seedBase, concurrency);
  const b = runBatch(oppFile, ourFile, repeatPerDir, seedBase+4242, concurrency);
  const total = a.matches + b.matches;
  const wins = a.redWins + b.blueWins;
  const losses = a.blueWins + b.redWins;
  const draws = a.draws + b.draws;
  const wr = total>0 ? wins/total : 0;
  return { total, wins, losses, draws, winRate: wr, a, b };
}

(function main(){
  if(!fs.existsSync(OUR_FILE)){
    console.error('Our team file not found:', OUR_FILE);
    process.exit(1);
  }
  const all = listOpponents(RESULT_DIR, path.join(RESULT_DIR, OUT_BASENAME));
  const opps = all.slice(-12);
  const results=[];
  let sumWins=0,sumTotal=0,minWR=1;
  for(const opp of opps){
    const r = evaluate(OUR_FILE, opp, 16, 20240910, 8);
    results.push({ opponent: opp, ...r });
    sumWins+=r.wins; sumTotal+=r.total; if(r.winRate<minWR) minWR=r.winRate;
    console.log(`${path.basename(OUR_FILE)} vs ${path.basename(opp)}: wr=${(r.winRate*100).toFixed(1)}% (${r.wins}/${r.total})`);
  }
  const overall = { winRate: sumTotal? sumWins/sumTotal : 0, minOppRate: minWR, totalMatches: sumTotal, wins: sumWins, losses: sumTotal-sumWins, draws: results.reduce((a,c)=>a+c.draws,0) };
  const md=[];
  md.push('');
  md.push('## Gauntlet vs recent results');
  md.push(`- Opponents: ${opps.map(p=>path.relative(RESULT_DIR,p)).join(', ')}`);
  md.push(`- Overall winRate: ${(overall.winRate*100).toFixed(1)}%`);
  md.push(`- Min opponent winRate: ${(overall.minOppRate*100).toFixed(1)}%`);
  md.push(`- Matches: ${overall.totalMatches} (W:${overall.wins} L:${overall.losses-overall.draws} D:${overall.draws})`);
  fs.appendFileSync(path.join(WORK_DIR,'RESULT.md'), '\n'+md.join('\n')+'\n');
})();
