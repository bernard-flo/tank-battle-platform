메모 (다음 실행 참고)

– tank_battle_platform.html 규칙을 모사한 헤드리스 시뮬레이터 구현/검증 완료.
– 브라우저와 동일한 AI API(tank/enemies/allies/bulletInfo, Type), 발사쿨다운 500ms(=10틱, 첫 발 즉시 가능), 총알속도 8, 충돌/경계/아군 관통 로직 일치 확인.
– CLI 배치 실행(--repeat)과 JSON 저장(--json) 정상 동작 확인. .gitignore에 result*.json 포함.
– 시드는 초기 포신 각도에만 적용. 봇 내부 Math.random은 브라우저와 동일하게 비결정적.

보안/실행 모드 업데이트
– secure 런너(vm 샌드박스) 도입: 기본값으로 사용. process/require/global 비공개, Function은 샌드박스 영역으로 한정되어 호스트 탈출 위험 억제.
– fast 런너(new Function 기반): 성능 우선 테스트용, 보안 강도 낮음. 필요 시 `--runner fast`로 선택.

버그 수정(이번 실행)
– bot_loader: type() 추출 시 Type 상수가 없어 항상 실패하던 문제 수정.
  · 해결: new Function 호출에 'Type' 인자를 주입하여 HTML과 동일하게 Type.NORMAL/TANKER/DEALER 평가.

검증 메모(HTML 대비)
– 초기 배치 좌표/열 역전, 탱크 크기·속도·공격력·체력 값, 탄환 속도/피격 반경(+2), 이동 실패 처리(안전 여백+5, 틱 내 1회 성공·최대 10회 시도), 승리 조건 모두 동기화 확인.
– 발사 쿨다운은 HTML과 동일하게 첫 발 즉시 허용 후 500ms 잠금. 판정은 엔진 시간 누적(tickMs 50) 기준.

진행 상황
– 단일 매치/배치 매치 실행 테스트 완료. 평균 틱/생존/에너지 집계 검증.
– 파일 구조 문서 최신화.

업데이트
– 리플레이 기록 기능 추가: --replay replay.json, --recordEvery N 지원. 단일 실행에서만 저장.
– 엔진 meta에 seed/tickMs/맵 크기/플레이어 목록 포함.
– .gitignore에 replay*.json 추가(대용량 리플레이 커밋 방지).
– fast 모드 추가(--fast): Object.freeze 생략으로 대량 배치 시뮬레이션 성능 향상.

다음 액션 제안
– 리플레이 로그(틱별 탱크/총알 상태) 덤프 옵션 추가하여 HTML에서 재생 검증.
– 성능 튜닝: 대량 반복 시 메모리 압력 완화(객체 풀링) 및 JIT 친화 루프 재구성 검토.
– 간단한 검증 테스트 스위트 추가(예: 아군 관통, 쿨다운, 경계 충돌 단위 테스트).
– 필요 시 fast 모드 추가(Freeze 생략, 최소 객체 할당)로 초대량 배치 시뮬레이션 가속.
  ↳ fast 모드 구현 완료, 추후 객체 풀링/메모리 재사용 최적화 여지 있음.

사용 팁
- 기본 실행: `node simulator/cli.js`
- 간편 실행: `scripts/simulate.sh` (옵션 동일 지원)
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
- 반복/시드/JSON: `node simulator/cli.js --repeat 100 --seed 42 --json result.json`
 - 리플레이 저장: `node simulator/cli.js --replay replay.json --seed 7 [--recordEvery 2]`
 - 런너 선택: `node simulator/cli.js --runner secure` 또는 `--runner fast`
 - 리플레이 시각 확인: `simulator/replay_viewer.html`을 브라우저로 열어 `replay.json` 선택 후 재생.

이번 실행
- Nemesis-4h: 레퍼런스 이동 정합 + 리드샷 강화 + DNN 보정 최소화로 성능 도약.
- 배치 평가: `node scripts/evaluate_and_update.js` (REPEAT=120, CONCURRENCY=8, FAST)
  · 결과: 승률 87.5% (Red 105 / Blue 15 / Draw 0), 평균 생존 0.875 vs 0.25, 평균 에너지 47.25 vs 8.13.
  · 기준 충족하여 reference-ai.txt 자동 갱신 완료.
  · 단일 리플레이 확인: `node simulator/cli.js --red result-ai.txt --blue reference-ai.txt --seed 7 --replay replay.json --recordEvery 3`

이번 실행(추가 확인)
- 기본 실행 재검증: `node simulator/cli.js --repeat 1 --seed 123 --fast` → BLUE 승, 틱 713, 통계 정상 출력.
- 코드 변경 없음. 시뮬레이터/CLI/샌드박스 동작 이상 없음.

이번 실행(요약)
- 요구된 시뮬레이터 구현 상태 확인: 엔진 규칙/샌드박스/CLI/리플레이/배치 실행 모두 정상.
- 코드 변경 없음(문서만 갱신). tank_battle_platform.html 미변경.

다음 실행 제안(TODO)
- 리드샷 안정화: 표적 변경 시 초기 프레임에 속도 0 가정으로 과도 보정 방지.
- DNN 보정 학습 방향: 오프라인 룰 기반 데이터로 distillation(출력 오차 최소화) 후 mix 비중 확대.
- 위협탄 판정 민감도 역할별 차등화(탱커 낮춤, 딜러 높임)로 생존/딜 밸런스 추가 개선.

참고 명령어
- 단일 경기 + 리플레이: `node simulator/cli.js --red simulator/ai/default_team.js --blue simulator/ai/default_team.js --seed 7 --replay replay.json --recordEvery 5 --fast`
- 배치 실행: `node simulator/cli.js --repeat 50 --seed 42 --fast --json result.json`

이번 실행(자동 기록)
- 재검증 실행: `node simulator/cli.js --repeat 1 --seed 123 --fast --json result.json --replay replay.json --recordEvery 5`
  → 결과: BLUE 승, Ticks 661, Red Energy 0, Blue Energy 65, JSON/리플레이 저장 확인.
  변경 코드 없음(문서만 갱신). HTML 미변경.

이번 실행(자동 기록 - 추가)
- 재검증 실행: `node simulator/cli.js --repeat 1 --seed 123 --fast --json result.json --replay replay.json --recordEvery 5`
  → 결과: BLUE 승, Ticks 934, Red Energy 0, Blue Energy 60, JSON/리플레이 저장 확인.
  코드 변경 없음(문서만 갱신). HTML 미변경.

이번 실행(추가 기록)
- 재검증 실행: `node simulator/cli.js --repeat 1 --seed 7 --json result.json --replay replay.json --recordEvery 5`
  → 결과: BLUE 승, Ticks 638, JSON/리플레이 저장 확인.
  코드 변경 없음(문서 갱신만 수행). tank_battle_platform.html 미변경.

이번 실행(현재 세션)
- 시뮬레이터 정합성/효율화 재확인. 문서 최신화.
- 편의 스크립트 추가: `scripts/quick_sim.sh` (기본 `--json result.json` 적용). 다음 실행에서 활용 권장.

이번 실행(시뮬레이터 확인)
- 시뮬레이터 규칙 일치 재확인. 성능 옵션(--fast, --runner secure|fast) 가이드 추가 제공.
- 코드 변경 없음. 다음 단계: AI 설계/튜닝 착수 가능.

이번 실행(변경 요약)
- bot_loader 분할 정규식 HTML과 완전 동기화: /(?=function\s+name\s*\(\s*\))/ 로 수정하여 줄 시작(anchor) 제약 제거.
- README에 해당 사항 반영.

이번 실행(요약 추가)
- 방금 단일 경기/리플레이 저장 재검증: `node simulator/cli.js --repeat 1 --seed 7 --json result.json --replay replay.json --recordEvery 5`
  → BLUE 승, 약 636틱. 시뮬레이터/JSON/리플레이 정상.
- 코드 변경 없음(문서만 갱신). tank_battle_platform.html 미변경.

이번 실행(추가 메모)
- 사용자 요청 재확인: 시뮬레이터 구현 상태가 요구사항(정확한 규칙 매핑 + 효율화) 충족. 추가 코드 변경 없음.
- 다음 단계 제안: 간단 단위 테스트(쿨다운/충돌/관통/배치 좌표) 작성 후 AI 코드 개발/튜닝으로 진행.

추가 메모(병렬화)
- 반복 시뮬레이션 성능 향상을 위해 --concurrency N 도입. 내부적으로 worker_threads 사용, 시드를 균등 분할.
- --replay는 단일 경기에서만 지원하므로 병렬 경로와 동시 사용 불가. 배치 통계 산출에 집중.

이번 실행(자동 갱신)
- 사용자 요청 재확인: HTML 규칙과 동일하게 동작하는 시뮬레이터 구현 및 효율화. 현재 simulator/* 로 충족됨.
- 금회 코드 변경 없음(문서만 갱신). 다음 단계: 봇 설계/튜닝 시작 가능.

추가 메모(이번 실행)
- 시뮬레이터는 이미 구현되어 있으며, 정확도/효율화 요건 충족을 재확인함.
- 다음 단계: 실제 대회용 AI 코드 설계. 우선 간단한 회피/예측 사격/협동 로직 프로토타입부터.
- 필요 시, 단위 테스트(쿨다운/충돌/관통/배치 좌표)를 추가하여 회귀 방지 예정.

이번 실행(Prometheus-10x)
- result-ai.txt를 Prometheus-10x(EchelonNet-XL)로 교체: DNN(96→64→24→10, tanh) + 60방향 전술 스코어링. update(tank,enemies,allies,bulletInfo) 전체를 입력 특징으로 사용.
- 성능 평가/자동 갱신: `node scripts/evaluate_and_update.js`
  · REPEAT/SEED/CONCURRENCY 환경변수로 반복/시드/병렬 제어(기본 REPEAT=120, CONC=8). FAST 모드 사용.
  · 우세 기준: 승률 ≥ 0.7 또는 (승률 ≥ 0.6 && 평균 생존/에너지 우세) → reference-ai.txt 자동 갱신.
- 스크립트가 reference-ai.txt를 갱신하면 반드시 커밋 필요:
  · `git add reference-ai.txt result.json && git commit -m "chore(ai): reference-ai.txt 갱신 (Prometheus-10x 우세)"`

이번 실행(추가 기록)
- 현재 리포지토리에 headless 시뮬레이터가 완비되어 있으며, HTML 규칙과의 정합성 재검증 완료.
- 변경사항 없음(문서만 갱신). 다음 단계로 AI 코드 개발에 집중 가능.

다음 실행 제안(구체)
- 유닛 테스트 초안 추가: engine.fire 쿨다운, move 충돌, 아군 관통, 초기 배치 좌표 검증.
- 리플레이 뷰어(선택): replay.json을 별도 HTML에서 재생하는 간이 페이지 추가 검토(플랫폼 HTML은 수정 금지 원칙 유지).
- 초고속 모드 실험: bullets/tanks에 객체 풀링 도입하여 대량 배치 시 GC 감소.

Helios-Edge 운영 메모
- DNN 입력/출력: 64차 입력(자기/적top3/아군top2/탄top4/집계) → 8차 출력([mvx,mvy, fvx,fvy, wTow,wAway,wCW,wCCW]).
- 이동 합성: 탄 회피(TTC·측면), 벽 반발, 아군 분리, 목표 벡터(접근/이탈/시계/반시계) + 네트 보정.
- 사격: 리드샷(직전 위치 기반 속도 추정) + DNN 각 보정 + 소량 지터.
- 역할: TANKER×2(앵커), DEALER×2(카이팅), NORMAL×2(측면). 타겟은 팀 공통으로 최소 체력 우선.

평가/갱신 절차(빠른 근사→정밀)
- 빠른 근사: `node scripts/quick_evaluate_and_update.js` (MAX_TICKS=400, REPEAT=12, CONCURRENCY=4)
  · 대부분 무승부가 나오면 maxTicks를 600~1000으로 늘려 수렴 추세 확인(스크립트 수정 필요 시 직접 CLI 사용).
- 정밀 비교: `node simulator/cli.js --red result-ai.txt --blue reference-ai.txt --repeat 12 --concurrency 6 --fast --maxTicks 2000 --json result.json`
- 우세 기준: 스크립트 기본값 유지(승률 ≥0.72 혹은 ≥0.62 + 생존/에너지 우세). 충족 시 reference-ai.txt 갱신 후 커밋.

추가 튜닝 아이디어
- 딜러 이탈 가중 동적화(근접시 away↑, 원거리시 toward↑), 탱커 회피 반경 +10%, 벽 반발 곡선 완만화.
- DNN 시드 고정은 유지하되, 역할별 seed를 더 차등 부여하여 행동 다양성 확보.

이번 실행(현재 세션 요약)
- 변경 없음. 시뮬레이터 규칙/효율화 재확인.
- 다음 실행에서 AI 기본 전략(회피+집중사격) 설계 시작 권장.

이번 실행(추가 기록)
- 방금 단일 경기 확인: `node simulator/cli.js --repeat 1 --seed 7 --json result.json --replay replay.json --recordEvery 5 --fast`
  → RED 승, Ticks 642, Red Alive 1 / Blue Alive 0 (Energy 5/0). JSON/리플레이 저장 정상.
  다음 단계: 기본 방어/회피/집중사격 로직 초안 작성 후 시뮬레이터로 반복 검증.

이번 실행(현재 세션 메모)
- Nemesis 팀(result-ai.txt) 초안 추가: DNN(48→32→16→4 tanh) + 휴리스틱 혼합.
- 각 로봇은 역할(front/flank/support) 구분, 모든 입력(tank/enemies/allies/bulletInfo) 활용.
- 다음 단계: 성능 비교/튜닝 및 기준(reference-ai.txt) 갱신 조건 검토.

이번 실행( Nemesis AI 결과 )
- result-ai.txt를 per-block DNN+휴리스틱으로 전면 재작성(분할 파서 호환/문법 검증 통과).
- 배치 비교: `node scripts/evaluate_and_update.js` (REPEAT=120, SEED=7777, CONCURRENCY=8)
  · Nemesis-3c 결과: 승률 0%, Blue 평균 생존 ≈4.0, Blue 평균 에너지 ≈275. 기준 갱신 조건 미충족 → reference-ai.txt 유지.
- 다음 액션: 집중사격(최소 체력 타겟 통일), 간이 리드샷(내부 메모리로 속도 추정), 타입 재배치(Dealer 3 + Normal 1) 실험.

다음 실행 계획(비교/튜닝)
- 비교 실행(배치): `node simulator/cli.js --red result-ai.txt --blue reference-ai.txt --repeat 100 --seed 1000 --concurrency 8 --fast --json result.json`
  · 승률 >= 0.7 또는 평균 에너지/생존 지표가 유의미하게 우세하면 reference-ai.txt 갱신.
- 리플레이 확인(단일): `node simulator/cli.js --red result-ai.txt --blue reference-ai.txt --seed 7 --replay replay.json --recordEvery 3`
- 튜닝 아이디어: 역할별 bias/혼합계수 조정, 위협탄 판정 반경 미세화, 측면 각도 범위 학습.

메모
- tank_battle_platform.html은 절대 수정하지 않음.
- 모든 파일 변경 시 즉시 git commit 수행.

이번 실행 요약(Helios-Edge 평가)
- result-ai.txt: Helios-Edge(AegisNet-L, DNN 64→32→16→8 + 전술 합성) 유지.
- 빠른 평가: `node scripts/quick_evaluate_and_update.js`
  · 결과: 12전 0승 0패 12무, 평균 RedAlive 3 / BlueAlive 4, RedEnergy 294 / BlueEnergy 310 → 갱신 조건 미충족.
- 정밀 평가: `REPEAT=60 CONCURRENCY=8 node scripts/evaluate_and_update.js`
  · 결과: 60전 8승 44패 8무, RedWinRate≈0.133, Avg BlueAlive≈3.33, BlueEnergy≈186.9 → reference 유지.
- 결론: 현 시점에서 reference-ai.txt 대비 성능 열위. 다음 단계에서 전술/게이팅/파라미터 튜닝 또는 자동 탐색 도입 필요.

다음 실행 제안(개선 계획)
- 전술 가중 튜닝: 탄 회피(TTC) 가중 +15%, 벽 반발 -10%, 궤도(CW/CCW) 가중 상황별 동적화(근접시 이탈↑, 원거리시 접근↑).
- 타겟팅: 최소 체력 + 최근 피격 가중(집중사격 유지), 리드샷 융합비 0.82→0.88 조정 검토.
- 역할별 파라미터 분기: TANKER(벽반발↑/이탈↑), DEALER(최소 교전거리 200↑), NORMAL(측면 각도 우선, 사이드 스텝 지터).
- 자동 탐색(옵션): 스크립트형 진화적 탐색(게이팅 계수/상수/시드) 100~300 시도 후 상위안 채택 → result-ai.txt 생성.
- 검증: quick → 정밀 배치 재검증 후 우세 시 reference-ai.txt 자동 갱신.

이번 실행 메모(Ares-Edge)
- result-ai.txt를 Ares-Edge(DNN 64-32-16-8 + 경량 전술 합성)로 교체. 실행 속도 향상 및 안정적 교전 목표.
- 빠른 근사 평가: `MAX_TICKS=1000 REPEAT=16 CONCURRENCY=8 node scripts/quick_evaluate_and_update.js`
- 정밀 배치 평가: `REPEAT=120 CONCURRENCY=8 node scripts/evaluate_and_update.js` (시간 길면 quick로 선별 후 실행)
- 갱신 기준(권장): 승률 ≥ 0.7 또는 (승률 ≥ 0.6 && 평균 생존/에너지 우세) → reference-ai.txt 갱신.

이번 실행 메모(Nemesis-3)
- 새 팀(Nemesis-3/AegisNet): 리드샷(요격 각) + 탄 회피(TTC 기반) + 벽 반발 + 아군 간격 유지 + 카이팅/측면 이동.
- DNN은 64→48→24→6로, 이동/사격 각도 제안과 혼합 계수 산출. 제안은 전술 각과 혼합해 안정성 확보.
- 타깃 선택은 최저 체력 우선(동률 시 y→x 사전식)으로 팀 전체가 동일 타깃을 집중.
- 배치 평가: `node scripts/evaluate_and_update.js` (REPEAT=120, CONCURRENCY=8). 우세 시 reference-ai.txt 자동 갱신.

이번 실행(Hyperion-7u 결과)
- result-ai.txt를 Hyperion-7u(AegisNet-Z)로 교체(DNN 72→40→16→8 + 전술 스코어 탐색/게이팅).
- 배치 비교: `node scripts/evaluate_and_update.js` (REPEAT=120, CONC=8, FAST)
  · 결과: RED 0 / BLUE 120 / DRAW 0, Avg BlueAlive≈4.0, BlueEnergy≈340 → reference 유지.
- 다음 튜닝 제안:
  1) 후보 각 탐색을 48방향으로 확장, 탄 위협 비용 가중 +15% 상향, 벽/아군 가중 -10% 하향.
  2) 게이팅 보정 계수 0.12→0.06으로 축소(전술 안정성 우선), 근접시 이탈 후보에 지터 ±10 추가.
  3) 딜러 최소 교전 거리 170→200 상향(과도한 근접 교전 방지).
  4) 리드샷에서 속도 추정 임계 거리 100→140으로 상향하여 추정 안정화.
