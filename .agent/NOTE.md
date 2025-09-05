# 개발 노트 (지속 참고)

- AI 코드 포맷
  - 각 로봇은 아래 3개 함수를 포함해야 함: `function name() {}`, `function type() { return Type.NORMAL|TANKER|DEALER; }`, `function update(tank, enemies, allies, bulletInfo) {}`
  - 여러 로봇은 `// ===== 다음 로봇 =====` 로 구분하면 플랫폼 import 모달에서 잘 분리됨.
- 시뮬레이션
  - 경량 엔진: `scripts/sim/engine.js` (`simulateMatch(bundleA, bundleB, {seed, maxTicks})`)
  - 배치 실행: `node scripts/sim/run.js` (환경변수 `MATCHES` 지원)
- 학습(진화 탐색)
  - 스크립트: `scripts/train2.js` (간단 유전탐색, 현재 표준)
  - 구조: 입력 16 → 은닉 6 → 출력 5 (Evade/Attack/Orbit/Wall/Lead)
  - 팀 조합: [TANKER, TANKER, DEALER, DEALER, DEALER, NORMAL]
  - 실행: `GENS=8 node scripts/train2.js` (세대 수는 환경변수 `GENS`로 조절)
  - 출력: `result/ai.txt`에 최신 번들 저장, 로그는 `.agent/log/*train2*.json`
  - 참고: `scripts/train.js`는 생성 코드에 `clamp` 주입 누락 이슈가 있어 샌드박스 오류 발생 가능 → 학습은 `train2.js` 사용.
  - 검증: `node scripts/sim/run.js` 실행 시 `.agent/log/*selfplay-summary.json` 생성
  - 팁: 더 강한 탐색을 위해 `GENS=24` 이상 실행 후 상위 엘리트만 이어붙여도 됨.
  - 평가 다양화: baseline 외 미러전(bundleA vs bundleA)과 랜덤 시드 확장을 섞어 과적합 방지.
  - 역할 조합 탐색: `scripts/train_roles.js` 추가 (모델 파라미터 + 6슬롯 역할(Type) 배열을 함께 진화). 실행 예: `GENS=16 node scripts/train_roles.js`
    - 결과는 동일하게 `result/ai.txt`에 저장, 로그는 `.agent/log/*train_roles*.json` 생성
- 경로 주의
  - 절대경로/상대경로 혼동 방지: `process.cwd()` 기준으로 `result/ai.txt`를 해석 (train2는 이미 반영)
  - Docker/CI에서도 동일 동작. 로컬과 경로 차이 없음.
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
  - 회피 벡터는 적 탄의 진행방향에 수직 성분을 사용해 근접 위협 회피 가중.
  - 벽 회피는 여백 60px을 기준으로 선형 가중, 노말화 후 융합.
  - 모든 의사결정은 MLP 출력 4개 가중(Evade/Attack/Orbit/Wall)의 소프트맥스 정규화로 혼합.

## 학습 파이프라인 메모 업데이트 (train2)
- 입력 16, 은닉 6, 출력 5(회피/공격/공전/벽/리드샷) MLP 구조 유지.
- 6개 탱크 역할: [TANKER, TANKER, DEALER, DEALER, DEALER, NORMAL].
- 학습 실행: `GENS=16 node scripts/train2.js`로 유전탐색, 상위 엘리트 유지.
- 산출물: `result/ai.txt` (플랫폼 import 호환), 로그: `.agent/log/*train2*` 및 `*selfplay-summary.json`.
- 검증: `node scripts/sim/run.js` (baseline 상대로 50전 성능 요약).
- 다음 개선: 시드 다양화, 상대 풀 확장(미러전/랜덤 정책), 세대 수 증가, 은닉차원 증대 실험.
