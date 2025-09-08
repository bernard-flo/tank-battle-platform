#!/usr/bin/env node
/*
  전체 파이프라인 오케스트레이터
  - timestamp 디렉토리 생성
  - CURRENT_WORKDIR 기록
  - 베이스 후보 생성/평가(build_and_compete)
  - 로컬 시뮬레이터 기반 파라미터 탐색(sim.js)
  - result/<ts>.txt 로 최종 결과물 저장
  - 각 단계 결과를 로그로 남김
*/

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts={}) {
  return cp.execSync(cmd, { stdio: ['ignore','pipe','pipe'], ...opts }).toString().trim();
}

function timestamp() {
  try { return sh('date +%F-%H-%M'); } catch {
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }
}

function main() {
  const ts = timestamp();
  const cwd = process.cwd();
  const workdir = path.join(cwd, ts);
  if (!fs.existsSync(workdir)) fs.mkdirSync(workdir);
  fs.writeFileSync(path.join(cwd, 'CURRENT_WORKDIR'), ts);

  // 1) 후보 생성 및 간이 경쟁
  console.log(`[1/3] 후보 생성 및 간이 경쟁 -> ${ts}`);
  sh('node tools/build_and_compete.js');

  // 2) 로컬 최적화 (탐색 횟수/게임수 조절 가능)
  console.log('[2/3] 파라미터 탐색(로컬 시뮬레이터) 진행');
  const env = { ...process.env,
    SIM_ITERS: process.env.SIM_ITERS || '48',
    SIM_GAMES: process.env.SIM_GAMES || '2',
    SIM_TICKS: process.env.SIM_TICKS || '900',
    SIM_MAX_OPP: process.env.SIM_MAX_OPP || '12',
  };
  cp.execSync(`node tools/sim.js ${ts}`, { env, stdio: 'inherit' });

  // 3) 요약 로그 남기기
  console.log('[3/3] 완료: 결과/요약 파일 확인');
  const outPath = path.join(cwd, 'result', `${ts}.txt`);
  const sumPath = path.join(workdir, 'summary.json');
  if (fs.existsSync(outPath)) {
    console.log(' - result:', outPath);
  } else {
    console.warn(' - result 파일이 생성되지 않았습니다.');
  }
  if (fs.existsSync(sumPath)) {
    console.log(' - summary:', sumPath);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
