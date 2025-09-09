const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Type } = require('./engine');

function splitRobotCodes(code) {
  // HTML과 동일한 규칙: 'function name()' 패턴을 기준으로 분할(줄 시작 고정 아님)
  // tank_battle_platform.html: code.split(/(?=function\s+name\s*\(\s*\))/)
  const parts = String(code).split(/(?=function\s+name\s*\(\s*\))/);
  const robots = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (/^\s*function\s+name\s*\(\s*\)/.test(trimmed)) {
      const clean = trimmed.replace(/\/\/\s*=+.*?=+/g, '').trim();
      robots.push(clean);
    }
  }
  return robots;
}

function extractNameType(code, fallbackName) {
  try {
    // HTML에서는 전역 Type이 존재하므로 type()에서 Type.NORMAL 등을 사용할 수 있다.
    // Node 환경에서도 동일 동작을 위해 Type을 인자로 주입한다.
    const fn = new Function(
      'Type',
      `${code}\nreturn { name: name(), type: (typeof type === 'function' ? type() : ${Type.NORMAL}) };`
    );
    const result = fn(Type);
    const name = result && result.name ? String(result.name) : fallbackName;
    const type = result && Number.isFinite(result.type) ? result.type : Type.NORMAL;
    return { name, type };
  } catch (e) {
    return { name: fallbackName, type: Type.NORMAL };
  }
}

function createRunner(code, mode = 'secure') {
  if (mode === 'fast') {
    // 빠른 모드: 기존 new Function 기반 (보안 취약 가능성 있음)
    return new Function(
      'tank',
      'enemies',
      'allies',
      'bulletInfo',
      `"use strict";
       const window = undefined;
       const document = undefined;
       const globalThis = undefined;
       const global = undefined;
       const process = undefined;
       const require = undefined;
       const module = undefined;
       const Function = undefined;
       const setTimeout = undefined;
       const setInterval = undefined;
       const setImmediate = undefined;
       const WebAssembly = undefined;
       const fetch = undefined;
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

  // 기본(secure) 모드: vm sandbox에서 코드 실행
  const sandbox = {
    // 읽기 전용 상수/객체만 노출
    Type: Object.freeze({ NORMAL: 0, TANKER: 1, DEALER: 2 }),
    console: Object.freeze({ log() {}, warn() {}, error() {} }),
  };
  const context = vm.createContext(sandbox, { codeGeneration: { strings: true, wasm: false } });

  let updateFn;
  try {
    const script = new vm.Script(`"use strict";\n${code}\n;typeof update === 'function' ? update : null;`);
    updateFn = script.runInContext(context, { timeout: 50 });
  } catch (e) {
    // 컴파일 에러 시 no-op 업데이트 반환
    updateFn = null;
  }

  return function runner(tank, enemies, allies, bulletInfo) {
    if (typeof updateFn !== 'function') return;
    // 각 호출마다 입력 객체를 샌드박스 글로벌에 주입하지 않고 직접 인자로 전달
    try {
      // vm의 함수는 해당 컨텍스트에서 실행됨
      updateFn.call(undefined, tank, enemies, allies, bulletInfo);
    } catch (_e) {
      // 사용자 코드 예외는 무시
    }
  };
}

function compileTeamFromCode(teamCode, team = 'red', runnerMode = 'secure') {
  const teamPrefix = team === 'red' ? 'R' : 'B';
  const robots = splitRobotCodes(teamCode);
  const entries = [];
  for (let i = 0; i < 6; i++) {
    const code = robots[i] || defaultCode(i + 1, team);
    const { name, type } = extractNameType(code, `Player ${teamPrefix}${i + 1}`);
    const runner = createRunner(code, runnerMode);
    entries.push({ id: `${teamPrefix}${i + 1}`, name, code, team, type, runner });
  }
  return entries;
}

function compileTeamsFromFiles(redFile, blueFile, runnerMode = 'secure') {
  const redCode = fs.readFileSync(path.resolve(redFile), 'utf8');
  const blueCode = fs.readFileSync(path.resolve(blueFile), 'utf8');
  const red = compileTeamFromCode(redCode, 'red', runnerMode);
  const blue = compileTeamFromCode(blueCode, 'blue', runnerMode);
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
