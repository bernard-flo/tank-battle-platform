#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(path.join(__dirname, '..', '..'));
const RUNID = path.basename(path.resolve(__dirname));
const WKDIR = path.resolve(__dirname);
const RSDIR = path.join(ROOT, 'result', RUNID);

function sh(cmd) { return cp.execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }); }

function listOpponents(maxCount = 6) {
  const resultDir = path.join(ROOT, 'result');
  const entries = [];
  for (const d of fs.readdirSync(resultDir)) {
    const p = path.join(resultDir, d);
    if (fs.statSync(p).isFile() && d.endsWith('.txt')) {
      if (d.startsWith(RUNID)) continue;
      entries.push(p);
    } else if (fs.statSync(p).isDirectory()) {
      if (d === RUNID) continue;
      const f = path.join(p, `${d}.txt`);
      if (fs.existsSync(f)) entries.push(f);
    }
  }
  entries.sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const seen=new Set(); const out=[];
  for (const p of entries) { const k=path.basename(p); if(seen.has(k)) continue; seen.add(k); out.push(p); if(out.length>=maxCount) break; }
  return out;
}

function evaluate(teamFile, oppFile) {
  const cli = path.join(ROOT, 'simulator', 'cli.js');
  const out1 = path.join(WKDIR, `eval_${path.basename(teamFile,'.txt')}_vs_${path.basename(oppFile,'.txt')}_R.json`);
  sh(`node ${cli} --red ${teamFile} --blue ${oppFile} --repeat 40 --seed 251052 --fast --concurrency 8 --json ${out1}`);
  const r1 = JSON.parse(fs.readFileSync(out1,'utf8'));
  const out2 = path.join(WKDIR, `eval_${path.basename(teamFile,'.txt')}_vs_${path.basename(oppFile,'.txt')}_B.json`);
  sh(`node ${cli} --red ${oppFile} --blue ${teamFile} --repeat 40 --seed 251052 --fast --concurrency 8 --json ${out2}`);
  const r2 = JSON.parse(fs.readFileSync(out2,'utf8'));
  const redWins = r1.aggregate.redWins; const blueWins = r2.aggregate.blueWins; const total = r1.aggregate.matches + r2.aggregate.matches;
  return { winRate: (redWins+blueWins)/total, matches: total };
}

function main() {
  const finalTeam = path.join(RSDIR, `${RUNID}.txt`);
  if (!fs.existsSync(finalTeam)) {
    console.error('Final team file not found:', finalTeam);
    process.exit(1);
  }
  const opps = listOpponents(6);
  let sum=0; const details=[];
  for (const opp of opps) {
    const { winRate, matches } = evaluate(finalTeam, opp);
    sum += winRate; details.push({ opp: path.basename(opp), winRate, matches });
    console.log(`${path.basename(finalTeam)} vs ${path.basename(opp)} => ${(winRate*100).toFixed(1)}%`);
  }
  const avg = sum / details.length;
  let md = `# Result ${RUNID}\n\n`;
  md += `Average win rate vs recent opponents: ${(avg*100).toFixed(2)}%\\n\n`;
  md += `## Opponent Breakdown\\n`;
  for (const d of details) md += `- ${d.opp}: ${(d.winRate*100).toFixed(1)}% over ${d.matches} games\\n`;
  fs.writeFileSync(path.join(WKDIR, 'RESULT.md'), md, 'utf8');
}

main();

