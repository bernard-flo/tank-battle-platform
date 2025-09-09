const fs = require('fs');
const path = require('path');
const { Type } = require('./engine');

function splitRobotCodes(code) {
  // Split only when 'function name()' starts at a new line (ignore comments)
  const parts = String(code).split(/(?=^\s*function\s+name\s*\(\s*\))/m);
  const robots = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('function name()')) {
      const clean = trimmed.replace(/\/\/\s*=+.*?=+/g, '').trim();
      robots.push(clean);
    }
  }
  return robots;
}

function extractNameType(code, fallbackName) {
  try {
    const fn = new Function(`${code}\nreturn { name: name(), type: (typeof type === 'function' ? type() : ${Type.NORMAL}) };`);
    const result = fn();
    const name = result && result.name ? String(result.name) : fallbackName;
    const type = result && Number.isFinite(result.type) ? result.type : Type.NORMAL;
    return { name, type };
  } catch (e) {
    return { name: fallbackName, type: Type.NORMAL };
  }
}

function createRunner(code) {
  // Mirror the browser's secure Function call
  return new Function(
    'tank',
    'enemies',
    'allies',
    'bulletInfo',
    `"use strict";
     const window = undefined;
     const document = undefined;
     const tanks = undefined;
     const bullets = undefined;
     const gameRunning = undefined;
     const logMessage = undefined;
     const Tank = undefined;
     const Type = { NORMAL: 0, TANKER: 1, DEALER: 2 };
     const console = Object.freeze({ log: ()=>{}, warn: ()=>{}, error: ()=>{} });
     ${code}
     update(tank, enemies, allies, bulletInfo);
    `
  );
}

function compileTeamFromCode(teamCode, team = 'red') {
  const teamPrefix = team === 'red' ? 'R' : 'B';
  const robots = splitRobotCodes(teamCode);
  const entries = [];
  for (let i = 0; i < 6; i++) {
    const code = robots[i] || defaultCode(i + 1, team);
    const { name, type } = extractNameType(code, `Player ${teamPrefix}${i + 1}`);
    const runner = createRunner(code);
    entries.push({ id: `${teamPrefix}${i + 1}`, name, code, team, type, runner });
  }
  return entries;
}

function compileTeamsFromFiles(redFile, blueFile) {
  const redCode = fs.readFileSync(path.resolve(redFile), 'utf8');
  const blueCode = fs.readFileSync(path.resolve(blueFile), 'utf8');
  const red = compileTeamFromCode(redCode, 'red');
  const blue = compileTeamFromCode(blueCode, 'blue');
  return [...red, ...blue];
}

function defaultCode(i, team) {
  const teamPrefix = team === 'red' ? 'R' : 'B';
  return `function name() {\n  return 'Player ${teamPrefix}${i}';\n}\nfunction type() {\n  return Type.NORMAL; // Type.TANKER, Type.DEALER\n}\nfunction update(tank, enemies, allies, bulletInfo) {\n  if (enemies.length > 0) {\n    let nearest = enemies[0];\n    for (let enemy of enemies) {\n      if (enemy.distance < nearest.distance) {\n        nearest = enemy;\n      }\n    }\n    const fireAngle = Math.atan2(nearest.y - tank.y, nearest.x - tank.x) * 180 / Math.PI;\n    tank.fire(fireAngle);\n    if(!tank.move(Math.random() * 360)) {\n      tank.move(fireAngle + 180);\n    }\n  }\n}`;
}

module.exports = {
  splitRobotCodes,
  extractNameType,
  createRunner,
  compileTeamFromCode,
  compileTeamsFromFiles,
  defaultCode,
};
