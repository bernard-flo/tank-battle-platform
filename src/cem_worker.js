const { parentPort, workerData } = require('worker_threads');
const { runMatch } = require('../simulator/engine');
const { compileTeamFromCode } = require('../simulator/bot_loader');
const { genMLPCode } = require('./generate_dnn_team');

function evaluate(weights, cfg) {
  const { inputSize, hidden, outputSize, refCode, seeds, maxTicks, runner, fast } = cfg;
  const code = genMLPCode({ inputSize, hiddenSizes: hidden, outputSize, weights });
  const red = compileTeamFromCode(code, 'red', runner);
  const blue = compileTeamFromCode(refCode, 'blue', runner);
  const players = [...red, ...blue];
  let total = 0;
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const res = runMatch(players, { maxTicks, fast, seed });
    const { stats, winner } = res;
    const energyDiff = (stats.redEnergy - stats.blueEnergy);
    const w = winner === 'red' ? 100 : (winner === 'blue' ? -100 : 0);
    const score = energyDiff + w;
    total += score;
  }
  return total / seeds.length;
}

(async () => {
  try {
    const { weights, cfg } = workerData;
    const score = evaluate(weights, cfg);
    parentPort.postMessage({ score });
  } catch (e) {
    parentPort.postMessage({ error: String((e && e.stack) || e) });
  }
})();

