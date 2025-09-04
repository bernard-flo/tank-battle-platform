// 스니펫 샌드박스 로더(골격)
import fs from 'fs';

export function loadBot(filePath, sandboxVars = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const Type = { NORMAL: 1, TANKER: 2, DEALER: 4 };
  const paramObj = sandboxVars.PARAMS || {};
  // 최소한의 샌드박싱: console 제거
  const fn = new Function('Type','PARAMS', `${code}; return { name, type, update };`);
  const api = fn(Type, Object.freeze(paramObj));
  return api;
}

