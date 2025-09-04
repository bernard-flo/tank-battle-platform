import fs from 'fs';

export const Type = Object.freeze({ NORMAL: 1, DEALER: 2, TANKER: 4 });

export function loadBot(path, params = {}) {
  const code = fs.readFileSync(path, 'utf8');
  // 샌드박스: console/require 전부 없음
  const factory = new Function('Type', 'PARAMS', `"use strict"; let console=undefined, require=undefined, process=undefined, fetch=undefined;\n${code}\nreturn { name: name(), type: type(), update };`);
  const bot = factory(Type, Object.freeze(params||{}));
  if (typeof bot.name !== 'string') throw new Error('Bot missing name()');
  if (typeof bot.update !== 'function') throw new Error('Bot missing update()');
  return bot;
}

