import fs from 'fs';
import path from 'path';

const root = process.cwd();
const aiDir = path.join(root, 'ai');
const htmlPath = path.join(root, 'tank_battle_platform.html');

// 원하는 순서로 파일을 나열 (EXPORT_OMEGA.txt 순서 기준)
const files = [
  'omega_bulldozer.js',
  'omega_anchor.js',
  'omega_striker.js',
  'omega_sniper.js',
  'omega_interceptor.js',
  'omega_sweeper.js'
];

function readCode(file){
  const code = fs.readFileSync(path.join(aiDir, file), 'utf8').trim();
  // 보수적으로 끝 공백 제거
  return code;
}

function buildArrayLiteral(){
  const items = files.map(f => '`' + readCode(f).replace(/`/g, '\\`') + '`');
  return 'const OMEGA_TEAM_CODES = [\n' + items.join(',\n') + '\n];';
}

function updateHtml(){
  const html = fs.readFileSync(htmlPath, 'utf8');
  const arrLiteral = buildArrayLiteral();

  // 정규식으로 기존 블록 교체
  const re = /const\s+OMEGA_TEAM_CODES\s*=\s*\[([\s\S]*?)\];/m;
  if (!re.test(html)){
    throw new Error('OMEGA_TEAM_CODES 블록을 찾을 수 없습니다.');
  }
  const updated = html.replace(re, arrLiteral);
  fs.writeFileSync(htmlPath, updated, 'utf8');
}

updateHtml();
console.log('tank_battle_platform.html: OMEGA_TEAM_CODES 갱신 완료.');

