# 개발 노트 (지속 참고)

- AI 코드 포맷
  - 각 로봇은 아래 3개 함수를 포함해야 함: `function name() {}`, `function type() { return Type.NORMAL|TANKER|DEALER; }`, `function update(tank, enemies, allies, bulletInfo) {}`
  - 여러 로봇은 `// ===== 다음 로봇 =====` 로 구분하면 플랫폼 import 모달에서 잘 분리됨.
- 시뮬레이션
  - 경량 엔진: `scripts/sim/engine.js` (`simulateMatch(bundleA, bundleB, {seed, maxTicks})`)
  - 배치 실행: `node scripts/sim/run.js` (환경변수 `MATCHES` 지원)
- 학습(진화 탐색)
  - 스크립트: `scripts/train2.js` (간단 유전탐색)
  - 구조: 입력 16 → 은닉 6 → 출력 5 (Evade/Attack/Orbit/Wall/Lead)
  - 팀 조합: [TANKER, TANKER, DEALER, DEALER, DEALER, NORMAL]
  - 실행: `node scripts/train2.js` (환경변수 `GENS`로 세대 수 조절)
  - 출력: `result/ai.txt`에 최신 번들 저장, 로그는 `.agent/log/*train2*.json`
- 경로 주의
  - Node `__dirname` 기준 상대 경로가 컨테이너 루트(`/`)로 풀리는 경우가 있었음 → 항상 `path.resolve(process.cwd(),'result/ai.txt')` 혹은 프로젝트 기준 상대 경로 사용 권장.
- 성능 팁
  - `rg`로 코드 탐색, 파일 출력은 250줄 단위 확인 규칙 준수.
  - 진화 탐색 중 stdout 대용량(코드 전체) 출력 금지: 요약만 출력.

(이전 내용)
