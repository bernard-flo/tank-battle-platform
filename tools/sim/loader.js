import fs from 'fs';

export function loadBot(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let meta = { name: 'Unknown', type: 0 };
  try {
    const fn = new Function(code + '\nreturn { name: name(), type: type() };');
    meta = fn();
  } catch (_) {}
  return { ...meta, code };
}

