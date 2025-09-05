#!/usr/bin/env node
/* Run batch self-play of result/ai.txt vs baseline or mirror */
const fs = require('fs');
const path = require('path');
const { simulateMatch } = require('./engine');

function nowISO(){ return new Date().toISOString().replace(/[:]/g,'-'); }

const aiPath = path.resolve(__dirname, '../../result/ai.txt');
const bundleA = fs.readFileSync(aiPath, 'utf8');

// Opponent: baseline pack of 6 default bots (empty string => engine fills baseline)
const bundleB = '';

const N = parseInt(process.env.MATCHES || '50', 10);
let redWins = 0, blueWins = 0, draws = 0; const ticks = [];
for (let i=0;i<N;i++) {
  const seed = 1000 + i;
  const r = simulateMatch(bundleA, bundleB, { seed, maxTicks: 1200 });
  if (r.winner === 'red') redWins++; else if (r.winner === 'blue') blueWins++; else draws++;
  ticks.push(r.tick);
}
const avgTick = (ticks.reduce((a,b)=>a+b,0)/ticks.length).toFixed(1);
const summary = {
  matches: N, redWins, blueWins, draws, avgEndTick: Number(avgTick),
  ts: new Date().toISOString()
};
console.log(JSON.stringify(summary, null, 2));

// persist summary log
const logDir = path.resolve(__dirname, '../../.agent/log');
fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(path.join(logDir, `${nowISO()}-selfplay-summary.json`), JSON.stringify(summary, null, 2));

