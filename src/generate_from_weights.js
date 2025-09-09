#!/usr/bin/env node
// 현재 저장된 가중치(result/ai_dnn_weights.json)로부터 팀 코드를 재생성
const fs = require('fs');
const path = require('path');
const { genMLPCode } = require('./generate_dnn_team');

function main(){
  const wpath = path.resolve('result/ai_dnn_weights.json');
  const w = JSON.parse(fs.readFileSync(wpath,'utf8'));
  const code = genMLPCode({ inputSize: w.inputSize, hiddenSizes: w.hiddenSizes, outputSize: w.outputSize, weights: Float64Array.from(w.weights) });
  const outPath = path.resolve('result/ai_dnn_team.txt');
  fs.writeFileSync(outPath, code, 'utf8');
  console.log(`[regen] wrote ${outPath}`);
}

if(require.main===module){ main(); }

