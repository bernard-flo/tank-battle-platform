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
  // 커밋: 작업 디렉토리 생성 및 CURRENT_WORKDIR 기록
  try {
    sh('git add -A');
    sh(`git commit -m "chore: init workdir ${ts} and CURRENT_WORKDIR"`);
  } catch {}

  // 1) 후보 생성 및 간이 경쟁
  console.log(`[1/3] 후보 생성 및 간이 경쟁 -> ${ts}`);
  sh('node tools/build_and_compete.js');
  // 커밋: 후보 생성 및 간이 경쟁 산출물
  try {
    sh('git add -A');
    sh(`git commit -m "chore: build_and_compete outputs for ${ts}"`);
  } catch {}

  // 2) 로컬 시뮬레이션(선택 사항): 새 결과물 vs 일부 상대를 간단히 검증
  //    기본은 건너뜀. 실행하려면 ENABLE_LOCAL_SIM=1 환경변수를 설정하세요.
  if (process.env.ENABLE_LOCAL_SIM === '1') {
    console.log('[2/3] 로컬 시뮬레이션 검증 실행');
    try {
      const resultFile = path.join(cwd, 'result', `${ts}.txt`);
      const resultDir = path.join(cwd, 'result');
      const opps = (fs.existsSync(resultDir) ? fs.readdirSync(resultDir) : [])
        .filter(f => f.endsWith('.txt') && f !== `${ts}.txt`)
        .slice(0, 3);
      if (opps.length === 0) {
        console.log(' - 상대 결과물이 없어 기본 상대와만 테스트합니다.');
        const basic = path.join(resultDir, 'default-basic.txt');
        if (fs.existsSync(basic)) {
          cp.execSync(`node tools/sim.js ${resultFile} ${basic} 5`, { stdio: 'inherit' });
        }
      } else {
        for (const f of opps) {
          const oppPath = path.join(resultDir, f);
          cp.execSync(`node tools/sim.js ${resultFile} ${oppPath} 5`, { stdio: 'inherit' });
        }
      }
    } catch (e) {
      console.warn('로컬 시뮬레이션 중 오류가 발생했습니다(무시):', e.message);
    }
  } else {
    console.log('[2/3] 로컬 시뮬레이션 검증은 건너뜁니다(ENABLE_LOCAL_SIM=1로 활성화 가능).');
  }

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
