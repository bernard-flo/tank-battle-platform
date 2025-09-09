#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 빠른 평가 설정(짧은 maxTicks로 근사 비교)
const ROOT = process.cwd();
const RED = path.resolve(ROOT, 'result-ai.txt');
const BLUE = path.resolve(ROOT, 'reference-ai.txt');
const CLI = path.resolve(ROOT, 'simulator/cli.js');

const REPEAT = parseInt(process.env.REPEAT || '12', 10);
const SEED = process.env.SEED || '4242';
const CONC = parseInt(process.env.CONCURRENCY || '4', 10);
const MAX_TICKS = parseInt(process.env.MAX_TICKS || '400', 10);
const JSON_OUT = path.resolve(ROOT, 'result.json');

function runBatch() {
  const args = [
    CLI,
    '--red', RED,
    '--blue', BLUE,
    '--repeat', String(REPEAT),
    '--seed', String(SEED),
    '--concurrency', String(CONC),
    '--maxTicks', String(MAX_TICKS),
    '--fast', '--json', JSON_OUT,
  ];
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
  console.log('=== Quick Eval Summary (Prometheus vs Reference) ===');
  console.log(stats);

  // 보수적 기준(짧은 maxTicks 근사치): 승률 >= 0.72 또는 (승률 >= 0.62 && 평균 생존/에너지 우세)
  const overwhelm = (stats.redWinRate >= 0.72) || (stats.redWinRate >= 0.62 && stats.avgRedAlive > stats.avgBlueAlive + 1.0 && stats.avgRedEnergy > stats.avgBlueEnergy + 60);
  if (overwhelm) {
    fs.copyFileSync(RED, BLUE);
    console.log('reference-ai.txt 갱신 완료 (Prometheus 우세: quick eval)');
  } else {
    console.log('갱신 조건 미충족(quick eval): reference-ai.txt 유지');
  }
}

if (require.main === module) main();

