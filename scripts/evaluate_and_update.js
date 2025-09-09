#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 설정
const RED = path.resolve(process.cwd(), 'result-ai.txt');
const BLUE = path.resolve(process.cwd(), 'reference-ai.txt');
const CLI = path.resolve(process.cwd(), 'simulator/cli.js');
const REPEAT = parseInt(process.env.REPEAT || '120', 10);
const SEED = process.env.SEED || '7777';
const CONC = parseInt(process.env.CONCURRENCY || '8', 10);
const FAST = '--fast';
const JSON_OUT = path.resolve(process.cwd(), 'result.json');

function runBatch() {
  const args = [CLI, '--red', RED, '--blue', BLUE, '--repeat', String(REPEAT), '--seed', String(SEED), '--concurrency', String(CONC), FAST, '--json', JSON_OUT];
  const res = spawnSync('node', args.filter(Boolean), { encoding: 'utf8' });
  const out = (res.stdout || '') + (res.stderr || '');
  console.log(out);
  if (res.status !== 0) {
    throw new Error('simulator/cli.js failed');
  }
  const data = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));
  const summaries = data.summaries || (data.summary ? [data.summary] : []);
  let redWins = 0, blueWins = 0, draws = 0;
  let redEnergy = 0, blueEnergy = 0, redAlive = 0, blueAlive = 0;
  for (const s of summaries) {
    if (s.winner === 'red') redWins++; else if (s.winner === 'blue') blueWins++; else draws++;
    redEnergy += s.redEnergy; blueEnergy += s.blueEnergy; redAlive += s.redAlive; blueAlive += s.blueAlive;
  }
  const n = summaries.length || 1;
  return {
    redWins,
    blueWins,
    draws,
    redWinRate: redWins / n,
    blueWinRate: blueWins / n,
    avgRedEnergy: redEnergy / n,
    avgBlueEnergy: blueEnergy / n,
    avgRedAlive: redAlive / n,
    avgBlueAlive: blueAlive / n,
  };
}

function main() {
  const stats = runBatch();
  console.log('=== Eval Summary (Nemesis vs Reference) ===');
  console.log(stats);

  // 갱신 기준: 승률 >= 0.7 또는 (승률 >= 0.6 && 평균 에너지/생존이 확연히 우세)
  const overwhelm = (stats.redWinRate >= 0.7) || (stats.redWinRate >= 0.6 && stats.avgRedAlive > stats.avgBlueAlive + 1.0 && stats.avgRedEnergy > stats.avgBlueEnergy + 80);

  if (overwhelm) {
    fs.copyFileSync(RED, BLUE);
    console.log('reference-ai.txt 갱신 완료 (Nemesis 우세)');
    process.exit(0);
  } else {
    console.log('갱신 조건 미충족: reference-ai.txt 유지');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

