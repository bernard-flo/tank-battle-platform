import fs from 'fs';
import path from 'path';
import seedrandom from 'seedrandom';
import { Type, DEFAULTS } from './engine.js';

function readParams(botKey){
  try {
    const p = path.resolve('tools/sim/params', botKey + '.json');
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, 'utf-8');
      return JSON.parse(txt);
    }
  } catch (e) {}
  return {};
}

export function loadBot(filePath, seed = 42){
  const code = fs.readFileSync(filePath, 'utf-8');
  const botKey = path.basename(filePath).replace(/\.js$/,'');
  const params = readParams(botKey);

  // 시드 RNG 주입
  const rng = seedrandom(String(seed) + '|' + botKey);
  const safeRandom = () => rng();

  // 샌드박스 Function: 외부 전역 차단
  const wrapper = new Function('with(this){ ' + code + '; return { name, type, update }; }');
  // PARAMS/Type 주입, Math.random 오버라이드
  const sandbox = Object.create(null);
  // bulletSpeed는 per-tick 단위로 주입
  const perTickBullet = DEFAULTS.BULLET_SPEED * DEFAULTS.DT;
  sandbox.PARAMS = Object.freeze({ ...params, bulletSpeed: perTickBullet });
  sandbox.Type = Type;
  sandbox.Math = { ...Math, random: safeRandom };

  const api = wrapper.call(sandbox);
  const botName = api.name();
  const tVal = api.type();
  let typeName = 'NORMAL';
  if (tVal === Type.TANKER) typeName = 'TANKER';
  else if (tVal === Type.DEALER) typeName = 'DEALER';

  return {
    key: botKey,
    file: filePath,
    name: botName,
    type: tVal,
    typeName,
    params,
    update: api.update,
  };
}
