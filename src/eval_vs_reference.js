#!/usr/bin/env node
// 결과 파일(result/ai_dnn_team.txt)과 reference-ai.txt 대결 통계 출력
const fs = require('fs');
const path = require('path');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');

function parseArgs(){
  const args = process.argv.slice(2);
  const opts = { start: 100, count: 50, maxTicks: 3000, fast: true, runner: 'secure' };
  for(let i=0;i<args.length;i++){
    const a=args[i];
    if(a==='--start') opts.start = +args[++i];
    else if(a==='--count') opts.count = +args[++i];
    else if(a==='--maxTicks') opts.maxTicks = +args[++i];
    else if(a==='--runner') opts.runner = String(args[++i]);
    else if(a==='--fast') opts.fast = true;
    else if(a==='--no-fast') opts.fast = false;
  }
  return opts;
}

function main(){
  const opts = parseArgs();
  const myCode = fs.readFileSync(path.resolve('result/ai_dnn_team.txt'), 'utf8');
  const refCode = fs.readFileSync(path.resolve('result/reference-ai.txt'), 'utf8');
  const red = compileTeamFromCode(myCode, 'red', opts.runner);
  const blue = compileTeamFromCode(refCode, 'blue', opts.runner);
  const players = [...red, ...blue];
  let W=0, L=0, D=0;
  let sumTicks=0;
  let sumRed=0, sumBlue=0;
  for(let i=0;i<opts.count;i++){
    const seed = opts.start + i;
    const r = runMatch(players, { maxTicks: opts.maxTicks, fast: opts.fast, seed });
    if(r.winner==='red') W++; else if(r.winner==='blue') L++; else D++;
    sumTicks += r.ticks; sumRed += r.stats.redEnergy; sumBlue += r.stats.blueEnergy;
  }
  console.log(`vs reference over ${opts.count} seeds`);
  console.log(`W:${W} L:${L} D:${D}`);
  console.log(`avgTicks:${(sumTicks/opts.count).toFixed(1)} avgRed:${(sumRed/opts.count).toFixed(1)} avgBlue:${(sumBlue/opts.count).toFixed(1)}`);
}

if(require.main===module){ main(); }

