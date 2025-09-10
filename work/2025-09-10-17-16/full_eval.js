#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'simulator', 'cli.js');
const WORKDIR = __dirname;
const OUR = path.join(WORKDIR, 'team.js');

function sh(cmd, opts={}){
  return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function findOpponents(){
  const resDir = path.join(ROOT, 'result');
  const files = [];
  for(const entry of fs.readdirSync(resDir)){
    const p = path.join(resDir, entry);
    const st = fs.statSync(p);
    if(st.isFile() && entry.endsWith('.txt')) files.push(p);
    if(st.isDirectory()){
      for(const f of fs.readdirSync(p)){
        if(f.endsWith('.txt')) files.push(path.join(p,f));
      }
    }
  }
  const ourDirName = path.basename(WORKDIR);
  const ourOut = path.join(resDir, ourDirName, `${ourDirName}.txt`);
  return files.filter(f => path.resolve(f) !== path.resolve(ourOut));
}

function runBatch(red, blue, repeat=40, concurrency=8){
  const tmp = path.join(WORKDIR, `.out_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  const cmd = `node ${CLI} --red ${red} --blue ${blue} --repeat ${repeat} --concurrency ${concurrency} --seed 777 --fast --runner secure --json ${tmp}`;
  sh(cmd, { cwd: ROOT });
  const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  return data.aggregate;
}

(async function main(){
  const opponents = findOpponents();
  console.log('Opponents:', opponents.length);
  const rows = [];
  let totalScore = 0, wins=0, losses=0, draws=0;
  for(const opp of opponents){
    const red = runBatch(OUR, opp);
    const blue = runBatch(opp, OUR);
    const score = (red.redWins + blue.blueWins) - (red.blueWins + blue.redWins);
    totalScore += score;
    wins += red.redWins + blue.blueWins;
    losses += red.blueWins + blue.redWins;
    draws += red.draws + blue.draws;
    rows.push({ opp, score, redWins:red.redWins, blueWins:blue.blueWins, redLoss:red.blueWins, blueLoss:blue.redWins, draws: red.draws+blue.draws });
    console.log(path.basename(opp), 'score', score);
  }
  rows.sort((a,b)=>b.score-a.score);
  const md = [];
  md.push('');
  md.push('## Full Evaluation vs all result/*.txt');
  md.push(`- Opponents: ${opponents.length}`);
  md.push(`- Total score: ${totalScore}`);
  md.push(`- Wins: ${wins}, Losses: ${losses}, Draws: ${draws}`);
  md.push('');
  md.push('| Opponent | Score | Wins | Losses | Draws |');
  md.push('|---|---:|---:|---:|---:|');
  for(const r of rows){
    md.push(`| ${path.basename(r.opp)} | ${r.score} | ${r.redWins + r.blueWins} | ${r.redLoss + r.blueLoss} | ${r.draws} |`);
  }
  fs.appendFileSync(path.join(WORKDIR, 'RESULT.md'), '\n' + md.join('\n'));
})();
