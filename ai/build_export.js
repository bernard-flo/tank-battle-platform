import fs from 'fs';
import path from 'path';

const files = [
  'alpha_bulldozer.js',
  'bravo_striker.js',
  'charlie_sweeper.js',
  'delta_guardian.js',
  'echo_interceptor.js',
  'golf_anchor.js'
];

function minify(code){
  // 매우 가벼운 압축: 주석 제거(라인), 연속 공백 축소
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

let out = `// 이 파일의 내용을 "코드 내보내기/가져오기" 기능으로 가져오면 됩니다.\n\n`;
for (const f of files){
  const raw = fs.readFileSync(path.join(process.cwd(), 'ai', f),'utf8');
  const body = minify(raw);
  const title = f.replace('.js','').replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  out += `// ===== ${title} =====\n`;
  out += body + "\n\n";
}
fs.writeFileSync(path.join(process.cwd(), 'ai', 'EXPORT_ALL.txt'), out.trim()+"\n");
console.log('EXPORT_ALL.txt generated.');

