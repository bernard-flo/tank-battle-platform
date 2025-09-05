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

### 이번 실행 스냅샷 (2025-09-05T06:12Z)
- 사용 스크립트: `scripts/train_roles.js` (역할+가중치 동시 진화)
- 파라미터: `GENS=10`
- 결과: baseline 상대로 12/12 승, avgTick≈286.2, 역할 = [DEALER, TANKER, TANKER, DEALER, NORMAL, DEALER]
- 산출물/로그: `result/ai.txt` 갱신, `.agent/log/*train_roles*` 요약 생성

### 이번 실행 스냅샷 (2025-09-05T06:59Z)
- 사용 스크립트: `scripts/train_roles.js` (역할+가중치 동시 진화)
- 파라미터: `GENS=16`
- 결과: baseline 상대로 80/80 승, avgEndTick≈243.1, 역할 조합은 자동 탐색 결과값 사용
- 산출물: `result/ai.txt`(6개 탱크, Import 구분자 포함) 갱신, 플랫폼 임포트 즉시 가능
- 검증/로그: `.agent/log/*selfplay-summary.json`, 제너레이션 요약 `.agent/log/*train_roles*`

### 이번 실행 스냅샷 (2025-09-05T07:11Z)
- 사용 스크립트: `scripts/train_roles.js` (역할+가중치 동시 진화)
- 파라미터: `GENS=24`
- 결과: baseline 상대로 12/12 승, avgTick≈256.5. 최종 역할 = [DEALER, DEALER, TANKER, NORMAL, DEALER, NORMAL]
- 검증: baseline 상대로 100전 100승, avgEndTick≈262.9
- 산출물: `result/ai.txt` 갱신(6개 탱크 코드, MLP 16→6→5). 플랫폼 `tank_battle_platform.html`에서 Import 가능.
# Neuro-Tank Pack v1 — 개발 노트

- 실행 환경: `tank_battle_platform.html`은 매 틱마다 `new Function(code)`로 AI 코드를 재평가합니다.
  - 따라서 탱크 AI는 프레임 간 영속 상태를 보존할 수 없습니다(전역/정적 변수 사용 불가).
  - 허용 API: `update(tank, enemies, allies, bulletInfo)` 내 `tank.move(angle)`, `tank.fire(angle)`과 읽기 전용 `tank.x/y/health/type/size`.
  - 입력: `enemies`(위치/거리/각도/체력), `allies`(위치/거리/체력), `bulletInfo`(적 탄 위치/속도 벡터/거리).
- 결과물 규격: Import 시 `function name(){...} function type(){...} function update(...) { ... }` 블록 6개를 순차 배치.
- v1 구조: 16→6→5 MLP(활성함수 tanh), 출력 5개
  - [0..3]: 이동 벡터 기저(탄 회피, 타겟 돌진, 공전(직교), 벽 회피)의 혼합 가중치
  - [4]: 사격 각도 오프셋(리드 보정, -~+ 약간 제한)
- 특징량(16):
  - 탱크 좌표 정규화(2), 체력(1), 타입 원핫(3), 최근접/타겟 상대벡터/거리(3), 적/아군 중심 상대단위벡터(4), 탄 위협량(1), 벽 밀어내기 벡터(2)
- 제약 최적화:
  - 프레임리스 학습 제약으로 온라인 학습 대신, 고정 MLP 가중치와 역할별(탱커/딜러/노멀) 편향을 사용.
  - 딜러는 거리 유지 항(-target)을 추가 가중해 카이팅, 탱커는 돌진/벽압 가중 강화.
- 향후 계획:
  1) Node/Python 시뮬레이터로 환경 근사 후 자가대전(PSRO/NE)으로 가중치 진화
  2) 역할별 파라미터 공유(헤드 분기) + CMA-ES/ES/PG로 오프라인 튜닝
  3) `result/ai.txt` 자동 갱신 파이프라인과 성능 로그 `.agent/log/*-selfplay-summary.json` 연동
  4) 프레임 비영속성 극복용 특성: 벽/탄/군집 기반 반응형 정책 고도화
- 주의: HTML은 수정 불가, Import 형식만 준수해 갱신.
### Tank AI 번들 구조 (tank_battle_platform.html 호환)
- 각 로봇은 `function name()`, `function type()`, `function update(tank,enemies,allies,bulletInfo)` 3개 함수로 구성됨.
- 여러 로봇 코드는 `function name()`을 기준으로 분리되며, 중간 구분 주석은 없어도 됨.
- `Type` 상수: `Type.NORMAL`, `Type.TANKER`, `Type.DEALER`.

### 학습/평가 스크립트 개요
- `scripts/sim/engine.js`: HTML 규칙을 근사한 노드용 시뮬레이터. self-play 평가에 사용.
- `scripts/train.js`, `scripts/train2.js`: 3개 역할별(탱커/딜러/노말) 공유 모델을 진화적 탐색으로 최적화.
- `scripts/train_roles.js`: 역할(6슬롯의 탱크 타입 배열)까지 함께 탐색. 성능이 우수함.

### 실행 방법 요약
- 빠른 학습(예: 8세대): `GENS=8 node scripts/train_roles.js`
- 더 강한 정책을 위해 세대를 늘릴 수 있음: `GENS=24` 이상 권장. 수행시간 증가 주의.
- 출력: `result/ai.txt`로 내보내며, HTML Import 모달에 그대로 붙여넣어 사용.

### 신경망/피처링
- MLP(D=16 → H=6 → O=5): 출력은 [회피, 공격, 공전, 벽압] 가중치 + 사격 리드각.
- 입력 피처: 위치/체력/타입 원핫/최근접 적 벡터/적 센트로이드/아군 센트로이드/탄 회피장/벽 압력.
- `update` 내에서 한 번의 전진계산으로 이동 벡터와 사격각 결정. 이동 실패 시 보조 각도로 재시도(최대 10회 제약 대응).

### 향후 개선 메모
- 평가 다양화: 랜덤 시드/초기 배치 변이/상대 AI 풀 확장.
- 다목표 적합도: 생존 수, 에너지 합, 평균 종결틱을 조합해 학습 안정화.
- 모델 확대: H 증대 또는 2층 MLP, 혹은 역할별 전용 헤드 추가.
- 온라인/하이브리드 파인튜닝: 브라우저 리플레이로 수집한 전투 로그를 오프라인 적합도에 반영.

## 2025-09-05T06-01-27Z
- 엔진 파라미터 동기화 완료: HTML과 동일 수치로 학습-실행 편차 축소.
- 현재 번들 생성 명령: GENS=12 node scripts/train2.js
- 검증 명령: node scripts/sim/run.js (MATCHES 환경변수 지원).
- 주의: train_roles는 시간이 다소 오래 걸리므로 세대 수를 단계적으로 확장.

## RL 번들 업데이트 (GENS=18)
- 스크립트: `node scripts/train_roles.js` (POP=20, ELITE=5, seeds=2000..2011)
- 모델: 16→6→5 MLP, 활성 tanh, 출력[회피/추격/공전/벽회피 가중, 조준 리드]
- 최종 역할: [DEALER, DEALER, NORMAL, DEALER, TANKER, DEALER]
- 성능: baseline 상대로 12전 12승, 평균 종료 tick ≈ 287.8
- 산출물: `result/ai.txt` (6로봇, Import 구분자 포함)
- 주의: HTML 엔진의 move 10회 제한/총알속성/사이즈 반영됨(엔진 동기화 OK)
\n## 실행 스냅샷 2025-09-05T06:28:11Z\n- train_roles: GENS=12, POP=20, ELITE=5\n- 결과: 12/12 승, 평균 종료틱≈263.5, 역할=[NORMAL, DEALER, TANKER, DEALER, DEALER, DEALER]\n- 산출물: result/ai.txt 갱신, Import 모달 호환\n
\n## 2025-09-05T06-36-58Z
- train_roles 16세대 추가 실행 → `result/ai.txt` 최적 번들 갱신
- 최종 역할: [TANKER, DEALER, TANKER, DEALER, DEALER, NORMAL] (내부 값: [1,2,1,2,2,0])
- 성능: baseline 12전 12승, 자가평가 50전 50승 0패 0무, avgEndTick≈260.4
- 산출물/로그: `result/ai.txt` 덮어씀, `.agent/log/*train_roles*`, `.agent/log/*selfplay-summary.json` 추가
- 다음: GENS 확대(>=24) 및 상대 풀 다양화(미러전 포함)로 일반화 향상
### Tank AI 패키지 운영 메모 (2025-09-05)

- 플랫폼 실행 제약: 각 프레임마다 사용자 코드가 `new Function`으로 격리 실행됨. 프레임 간 상태 보존 불가 → 순수 반응형(policy-only) 설계 필요.
- 입력 특징(inVec): 위치 정규화, 체력 비율, 타입 원핫, 최근접/집중 적 방향, 아군 중심 방향, 적 총알 회피 벡터 강도, 벽 회피 벡터. 총 16차원.
- 정책 MLP: 16→6(tanh)→5 선형. 출력 해석: [회피 가중치, 공격 가중치, 공전(측면) 가중치, 벽 가중치, 조준 리드] → softmax 유사 정규화로 이동 벡터 혼합.
- 타입 조합: 2 TANKER, 2 DEALER, 2 NORMAL 목표. 기존 팩(Atlas~Sage)은 2-3-1이었으므로 Raptor를 NORMAL로 스위치.
- 성능 개선 계획: self-play로 리플레이 생성 → 간단한 에볼루션/ES로 `b2`(바이어스) 우선 튜닝 → 필요 시 `W2` 소폭 변이. UI 기반 수동 임포트/익스포트 한계로, 결과물은 항상 `/result/ai.txt` 한 파일로 유지.
- 안전/성능: update 내 루프 제한, `move` 실패 시 3방향(기본/±70°) 재시도 뒤 랜덤 폴백. 연산 가벼운 `tanh`/선형만 사용.

### 이번 실행 스냅샷 (2025-09-05T07-27-15Z)
- 사용 스크립트: `scripts/train_roles.js`
- 파라미터: `GENS=16`
- 결과: baseline 50전 50승 0패 0무, avgEndTick≈255.1, 최종 역할 = [DEALER, NORMAL, TANKER, DEALER, DEALER, DEALER]
- 산출물: `result/ai.txt` 최신화, Import 구분자 포함 유지
- 참고: 브라우저 샌드박스 구조상 프레임 간 상태는 보존되지 않으므로, 모든 정책은 순수 반응형 구현을 유지함

- 신경망 정책: 16→6→5 MLP, 입력 16(자기 위치/체력/타입 one-hot/최근접 적 거리/방향, 적/아군 중심, 탄 회피 벡터, 벽 압력)→ 은닉 6 tanh → 출력 5(회피/공격/공전/벽 회피 가중치 + 사격 리드각).
- 진화 설정: (μ+λ) POP=20, ELITE=5, GENS=24, 초기 시그마 0.25→0.08.
- 적합도: baseline 상대로 12전 승수 + 무승부 0.3 가중, 동률시 평균 종료 tick 낮을수록 선호.
- 산출물: result/ai.txt (Import 가능 포맷, 6 로봇 블록과 구분 주석 포함).
- 검증: scripts/sim/run.js 로 100전 자가 검증(red=우리, blue=baseline).
- 향후 계획: 상대 풀 다양화(미러전/랜랜/크로스플레이), 다목표(생존률/팀 에너지) 적합도, H 확장(6→8/10) 실험.
