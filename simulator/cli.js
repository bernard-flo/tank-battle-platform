#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { runMatch } = require('./engine');
const { compileTeamsFromFiles, compileTeamFromCode, defaultCode } = require('./bot_loader');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function readOrDefault(filePath, team) {
  if (!filePath) {
    // Build default 6-bot team
    const pieces = [];
    for (let i = 1; i <= 6; i++) pieces.push(defaultCode(i, team));
    return pieces.join('\n\n// ===== 다음 로봇 =====\n\n');
  }
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const redFile = args.red;
  const blueFile = args.blue;
  const seed = args.seed;
  const maxTicks = args.maxTicks ? parseInt(args.maxTicks, 10) : 5000;
  const jsonOut = args.json;
  const repeat = args.repeat ? parseInt(args.repeat, 10) : 1;
  const replayOut = args.replay; // when set, record replay frames
  const recordEvery = args.recordEvery ? parseInt(args.recordEvery, 10) : 1;
  const fast = !!args.fast;

  const redCode = readOrDefault(redFile, 'red');
  const blueCode = readOrDefault(blueFile, 'blue');

  const red = compileTeamFromCode(redCode, 'red');
  const blue = compileTeamFromCode(blueCode, 'blue');
  const players = [...red, ...blue];

  const baseSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1e9);

  const summaries = [];
  let redWins = 0;
  let blueWins = 0;
  let draws = 0;
  let ticksSum = 0;
  let redAliveSum = 0;
  let blueAliveSum = 0;
  let redEnergySum = 0;
  let blueEnergySum = 0;

  let lastReplay = null;
  for (let i = 0; i < repeat; i++) {
    const s = typeof baseSeed === 'number' ? baseSeed + i : `${baseSeed}-${i}`;
    const wantReplay = !!replayOut && repeat === 1; // only supported for single run
    const result = runMatch(players, { seed: s, maxTicks, record: wantReplay, recordEvery, fast });
    if (wantReplay && result.replay) lastReplay = result.replay;
    const summary = {
      seed: s,
      winner: result.winner,
      ticks: result.ticks,
      redAlive: result.stats.redAlive,
      blueAlive: result.stats.blueAlive,
      redEnergy: Math.round(result.stats.redEnergy),
      blueEnergy: Math.round(result.stats.blueEnergy),
    };
    summaries.push(summary);
    if (summary.winner === 'red') redWins++;
    else if (summary.winner === 'blue') blueWins++;
    else draws++;
    ticksSum += summary.ticks;
    redAliveSum += summary.redAlive;
    blueAliveSum += summary.blueAlive;
    redEnergySum += summary.redEnergy;
    blueEnergySum += summary.blueEnergy;
  }

  if (repeat === 1) {
    const s = summaries[0];
    console.log('=== Match Result ===');
    console.log(`Seed: ${s.seed}`);
    console.log(`Winner: ${s.winner.toUpperCase()}`);
    console.log(`Ticks: ${s.ticks}`);
    console.log(`Red  - Alive: ${s.redAlive}, Energy: ${s.redEnergy}`);
    console.log(`Blue - Alive: ${s.blueAlive}, Energy: ${s.blueEnergy}`);
  } else {
    const agg = {
      matches: repeat,
      redWins,
      blueWins,
      draws,
      avgTicks: +(ticksSum / repeat).toFixed(2),
      avgRedAlive: +(redAliveSum / repeat).toFixed(3),
      avgBlueAlive: +(blueAliveSum / repeat).toFixed(3),
      avgRedEnergy: +(redEnergySum / repeat).toFixed(2),
      avgBlueEnergy: +(blueEnergySum / repeat).toFixed(2),
      baseSeed,
    };
    console.log('=== Batch Result ===');
    console.log(`Matches: ${agg.matches}, BaseSeed: ${agg.baseSeed}`);
    console.log(`Wins   - Red: ${agg.redWins}, Blue: ${agg.blueWins}, Draws: ${agg.draws}`);
    console.log(`Avg    - Ticks: ${agg.avgTicks}, RedAlive: ${agg.avgRedAlive}, BlueAlive: ${agg.avgBlueAlive}`);
    console.log(`AvgEne - Red: ${agg.avgRedEnergy}, Blue: ${agg.avgBlueEnergy}`);
  }

  if (jsonOut) {
    const out = repeat === 1 ? { summary: summaries[0] } : { summaries, aggregate: {
      matches: repeat,
      redWins,
      blueWins,
      draws,
      avgTicks: +(ticksSum / repeat).toFixed(2),
      avgRedAlive: +(redAliveSum / repeat).toFixed(3),
      avgBlueAlive: +(blueAliveSum / repeat).toFixed(3),
      avgRedEnergy: +(redEnergySum / repeat).toFixed(2),
      avgBlueEnergy: +(blueEnergySum / repeat).toFixed(2),
      baseSeed,
    } };
    fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(out, null, 2));
    console.log(`Saved JSON -> ${jsonOut}`);
  }

  if (replayOut) {
    if (repeat !== 1) {
      console.warn('Replay output is only supported when --repeat 1; skipping replay save.');
    } else {
      const outPath = path.resolve(replayOut);
      fs.writeFileSync(outPath, JSON.stringify(lastReplay, null, 2));
      console.log(`Saved Replay -> ${replayOut}`);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
