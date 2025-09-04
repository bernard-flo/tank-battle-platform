import fs from 'fs';
import path from 'path';

export function loadBot(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let meta = { name: 'Unknown', type: 0 };
  try {
    const fn = new Function(`const Type={NORMAL:0,TANKER:1,DEALER:2};\n${code}\nreturn { name: name(), type: type() };`);
    meta = fn();
  } catch (_) {}
  const key = path.basename(filePath).replace(/\.js$/, '');
  return { ...meta, code, key };
}
