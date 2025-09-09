const { parentPort, workerData } = require('worker_threads');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { genMLPCode } = require('./generate_dnn_team');

function evaluate(weights, cfg){
  const { seeds, maxTicks, runner, fast } = cfg;
  const inputSize = 8 + (4*5) + (3*5) + (5*6) + 3; // 76
  const hidden = [64,64];
  const outputSize = 5;
  const code = genMLPCode({ inputSize, hiddenSizes: hidden, outputSize, weights: Float64Array.from(weights) });
  const refCode = require('fs').readFileSync(require('path').resolve('result/reference-ai.txt'),'utf8');
  const red = compileTeamFromCode(code, 'red', runner);
  const blue = compileTeamFromCode(refCode, 'blue', runner);
  const players = [...red, ...blue];
  let total = 0;
  for (let i=0;i<seeds.length;i++){
    const seed = seeds[i];
    const res = runMatch(players, { maxTicks, fast, seed });
    const { stats, winner } = res;
    const energyDiff = (stats.redEnergy - stats.blueEnergy);
    const w = winner === 'red' ? 100 : (winner === 'blue' ? -100 : 0);
    total += (energyDiff + w);
  }
  return total / seeds.length;
}

(async () => {
  try{
    const { center, noise, cfg } = workerData;
    const score = evaluate(noise, cfg); // here, noise is actually a full weight vector to eval
    parentPort.postMessage({ score });
  }catch(e){
    parentPort.postMessage({ error: String((e && e.stack) || e) });
  }
})();
