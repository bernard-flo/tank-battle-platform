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
  - 참고: `scripts/train.js`는 업데이트 코드 문자열 내 `clamp` 함수 정의가 누락되어 샌드박스에서 `clamp is not defined` 오류가 발생함. 실제 학습은 `train2.js` 사용 권장.
- 경로 주의
  - Node `__dirname` 기준 상대 경로가 컨테이너 루트(`/`)로 풀리는 경우가 있었음 → 항상 `path.resolve(process.cwd(),'result/ai.txt')` 혹은 프로젝트 기준 상대 경로 사용 권장.
- 성능 팁
  - `rg`로 코드 탐색, 파일 출력은 250줄 단위 확인 규칙 준수.
  - 진화 탐색 중 stdout 대용량(코드 전체) 출력 금지: 요약만 출력.

(이전 내용)

## Alpha-MLP Pack v0.1 (이번 실행 메모)
- 6개 개체 공통 구조: 입력(위치/체력/타입/최근접-적/탄압력/벽/아군중심) → 은닉 6 → 출력 4~5 (Evade, Attack, Cohesion/Orbit, Wall, AimLead)
- 각 역할별 차등 세팅
  - Tanker: 벽/회피 가중 상향, 돌진 억제, 유지거리 큼
  - Dealer: 공격가중/리드샷 상향, 회피 민감도 낮춤
  - Normal: 균형형, 아군 응집 우선
- Import 호환: 로봇 사이 `// ===== 다음 로봇 =====` 구분자 포함
- 주의: 플랫폼 샌드박스 내 Type 상수는 주입됨. 외부 전역 사용 금지.
- 개선 아이디어: 과적합 방지 위해 리드샷 범위 클램프, move 실패 시 백오프 난수 각도 시도 최대 3회.
