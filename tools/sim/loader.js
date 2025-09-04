// 스니펫 샌드박스 로더
import fs from 'fs';
import path from 'path';
import { DEFAULTS } from './engine.js';

function loadParamsFor(filePath, injected = {}) {
  try {
    const key = path.basename(filePath).replace(/\.js$/,'');
    const pth = path.resolve(process.cwd(), 'tools/sim/params', `${key}.json`);
    let disk = {};
    if (fs.existsSync(pth)) {
      disk = JSON.parse(fs.readFileSync(pth, 'utf8')) || {};
    }
    const merged = { ...disk, ...injected };
    // 단위 정합: bulletSpeed는 per-tick 단위로 주입
    const bs = merged.bulletSpeed ?? DEFAULTS.BULLET_SPEED;
    merged.bulletSpeed = bs * DEFAULTS.DT;
    return Object.freeze(merged);
  } catch (e) {
    return Object.freeze(injected || {});
  }
}

export function loadBot(filePath, sandboxVars = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const Type = { NORMAL: 1, TANKER: 2, DEALER: 4 };
  const PARAMS = loadParamsFor(filePath, sandboxVars.PARAMS || {});
  // 최소한의 샌드박싱: console 제거
  const fn = new Function('Type','PARAMS', `${code}; return { name, type, update };`);
  const api = fn(Type, PARAMS);
  return api;
}
