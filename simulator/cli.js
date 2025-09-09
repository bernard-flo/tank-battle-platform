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

  const redCode = readOrDefault(redFile, 'red');
  const blueCode = readOrDefault(blueFile, 'blue');

  const red = compileTeamFromCode(redCode, 'red');
  const blue = compileTeamFromCode(blueCode, 'blue');
  const players = [...red, ...blue];

  const result = runMatch(players, { seed, maxTicks });

  const summary = {
    winner: result.winner,
    ticks: result.ticks,
    redAlive: result.stats.redAlive,
    blueAlive: result.stats.blueAlive,
    redEnergy: Math.round(result.stats.redEnergy),
    blueEnergy: Math.round(result.stats.blueEnergy),
  };

  console.log('=== Match Result ===');
  console.log(`Winner: ${summary.winner.toUpperCase()}`);
  console.log(`Ticks: ${summary.ticks}`);
  console.log(`Red  - Alive: ${summary.redAlive}, Energy: ${summary.redEnergy}`);
  console.log(`Blue - Alive: ${summary.blueAlive}, Energy: ${summary.blueEnergy}`);

  if (jsonOut) {
    fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ summary }, null, 2));
    console.log(`Saved JSON summary -> ${jsonOut}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

