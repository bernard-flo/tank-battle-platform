/* eslint-disable no-console */
const { workerData, parentPort } = require('worker_threads');
const { runMatch } = require('./engine');
const { compileTeamFromCode } = require('./bot_loader');

const { redCode, blueCode, runnerMode, seeds, maxTicks, fast } = workerData;

// Compile once per worker for efficiency
const red = compileTeamFromCode(redCode, 'red', runnerMode);
const blue = compileTeamFromCode(blueCode, 'blue', runnerMode);
const players = [...red, ...blue];

const results = [];
for (const s of seeds) {
  const r = runMatch(players, { seed: s, maxTicks, record: false, fast });
  results.push({
    seed: s,
    winner: r.winner,
    ticks: r.ticks,
    redAlive: r.stats.redAlive,
    blueAlive: r.stats.blueAlive,
    redEnergy: Math.round(r.stats.redEnergy),
    blueEnergy: Math.round(r.stats.blueEnergy),
  });
}

parentPort.postMessage(results);

