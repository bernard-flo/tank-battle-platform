프로젝트 파일 구조 (자동 기록)

- .agent/FILE_STRUCTURE.md: 생성/변경 파일 목록과 간단 설명 관리(본 문서).
- .agent/NOTE.md: 다음 실행 시 참고할 메모.

시뮬레이터 구성
- simulator/engine.js: 헤드리스 물리/룰 엔진.
  - 맵 900x600, 총알속도 8 px/tick, 틱 50ms 가정.
  - 발사 쿨다운 500ms(첫 발은 즉시 가능, 이후 500ms), 이동은 한 틱에 1회 성공만 허용, 실패 시 최대 10회 시도 허용.
  - 경계/탱크 충돌(안전 여백 +5) 처리, 아군 탄환 관통 유지, 적 피격 시 탄환 제거 및 피해 반영.
  - Type.NORMAL/TANKER/DEALER의 에너지/크기/속도/공격력 HTML과 동기화.
  - 리플레이 기록 옵션(record, recordEvery) 추가: meta(맵/틱/시드/플레이어 목록)와 frames(틱별 탱크/총알 상태) 생성.
  - 초기 배치: HTML과 동일(레드 140/90 기준, 열 역전 배치; 블루 640/90 기준 표준 배치).
  - 승리 판정: 한쪽 생존 0, 상대 >0일 때 즉시 종료(동시 전멸/시간만료 시 무승부 처리).
  - fast 모드: Object.freeze 생략 등으로 AI 데이터 래핑 비용 절감(--fast).
- simulator/bot_loader.js: 팀 코드 로더/컴파일러.
  - 입력 텍스트에서 각 로봇을 'function name()' 기준으로 분할(HTML과 동일 정규식 사용).
  - name()/type() 추출 및 샌드박스 실행기 생성.
    · 수정: type() 평가 시 Type 상수 주입(new Function('Type', ...))으로 HTML과 동일하게 Type.NORMAL/TANKER/DEALER 인식.
  - update(tank,enemies,allies,bulletInfo) 시그니처/제한 전역(window/document 등 차단) 준수.
  - 런너 모드 지원: secure(vm 샌드박스, 기본) | fast(new Function 기반).
    · secure: process/require/global 비공개, 호스트 탈출 위험 억제.
    · fast: 성능 위주, 내부 테스트에 한정 권장.
- simulator/cli.js: 커맨드라인 인터페이스.
  - 인자: --red, --blue, --maxTicks, --seed, --repeat, --json, --replay, --recordEvery, --runner secure|fast, --fast, --concurrency N.
  - 단일/배치 결과 요약 출력 및 JSON 저장 지원. --replay는 단일 경기에서만 지원.
  - --concurrency N: 반복 실행 시 병렬 처리(worker_threads) 사용.
- simulator/worker.js: 배치 시뮬 병렬 실행용 워커(worker_threads). 시드 청크를 입력받아 일괄 처리 후 요약 반환.
- simulator/ai/default_team.js: 예시 6로봇 코드(HTML 기본 예제와 동일 로직).
- simulator/README.md: 사용법/규칙 매핑/배치 실행 예시.
 - scripts/simulate.sh: 시뮬레이터 실행용 래퍼 스크립트(옵션 그대로 전달).
   - 예: `scripts/simulate.sh --red red.js --blue blue.js --repeat 100 --fast`.
- simulator/replay_viewer.html: 리플레이(JSON) 재생용 독립 HTML 뷰어(시각적 확인 전용).

AI/DNN 학습/생성 파일
- src/generate_dnn_team.js: MLP 정책 코드 생성기. update()에서 tank/enemies/allies/bulletInfo 전부를 피처로 사용하여 추론하는 코드 문자열을 만들어 팀(6로봇) 텍스트를 출력.
- src/train_cem.js: Cross-Entropy Method 기반 학습 스크립트. reference-ai.txt를 상대 블루팀으로 두고 평균 보상(에너지 차 + 승패 보너스)을 최대화하도록 공유 가중치를 최적화. 최적 가중치로 result/ai_dnn_team.txt를 저장. 히든층 크기 32-32로 경량화.
 - src/cem_worker.js: 학습 중 개별 후보(가중치)의 성능을 병렬로 평가하는 워커. train_cem.js에서 --concurrency로 활용.
- src/imitation_train.js: 레퍼런스 AI의 행동을 수집(actionHook)하여 지도학습(Adam)으로 32-32 MLP 초기화. 이후 CEM 미세튜닝 권장.
 - src/imitation_train.js: 레퍼런스 AI의 행동을 수집(actionHook)하여 지도학습(Adam)으로 64-64 MLP 초기화. 이후 CEM/ES 미세튜닝 권장.
   · CLI 옵션: --matches N --ticks N --epochs N --batch N --lr F --seed S [--fast|--no-fast]
 - src/generate_from_weights.js: result/ai_dnn_weights.json을 읽어 팀 코드를 재생성.
- src/train_es.js: Evolution Strategies(OpenAI-ES) 기반 블랙박스 최적화. Mirrored sampling과 병렬 워커로 빠르게 gradient 추정 후 가중치 업데이트.
  - src/es_worker.js: ES 평가 워커. 주어진 가중치 벡터로 코드 생성→시뮬레이션→스코어 반환.
- src/teacher_ai.txt: 모방학습용 Teacher 팀(휴리스틱). 각 로봇 블록 내에 helper 포함(분할 실행 호환). 총알 회피/아군 분리/타겟 추적/스트레이프 조합.
- src/imitation_train.js: --teacher 옵션 추가(기본은 result/reference-ai.txt). Teacher 코드를 레드팀으로 하여 행동을 수집하고 DNN을 지도학습으로 초기화.

결과물(result)
- result/reference-ai.txt: 비교용 레퍼런스 AI 코드(여섯 로봇, 휴리스틱 기반).
- result/ai_dnn_team.txt: 본 스크립트가 생성하는 DNN 팀 코드. tank_battle_platform.html Import로 붙여넣어 사용 가능. 타입 조합은 [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER] 고정.
- result/ai_dnn_weights.json: 현재 최적 가중치(평탄화 배열) 저장. 다음 실행 시 학습 재개/재생성에 사용.

비고
- tank_battle_platform.html은 수정하지 않음. 브라우저 렌더링 이펙트만 제외하고 로직은 동일.
- 시뮬레이터 출력 JSON(result*.json)과 리플레이(replay*.json)는 .gitignore에 포함됨.
정확화: HTML과 동일하게 경기 시작 직후 첫 발사 즉시 가능. 그 이후 500ms(=10틱) 쿨다운 적용. 판정은 엔진 시간 누적 기반(틱 50ms)으로 수행.

업데이트(현재 실행)
- 모방학습 1: reference-ai.txt 기준(8매치×2500틱, 4epoch)으로 초기화 → 커밋.
- ES 튜닝: 2 iters(pop=40, seeds=3, ticks=2800) 실행 → 개선 미미.
- CEM 튜닝: 4 iters(pop=40, elite=8, seeds=3, ticks=3200) 실행 → 에너지 열세 지속.
- 모방학습 2: Teacher AI(src/teacher_ai.txt) 기준(12매치×2600틱, 6epoch) 재초기화 → 빠른 전멸 경향으로 부적합 판단.
- 설계형 가중치 초기화(src/design_weights_9.js): 타겟 조준/접근/스트레이프/후퇴 + 거리 기반 발사를 DNN 가중치로 임베드 → 여전히 reference 대비 열세.
- 현재 결과물(result/ai_dnn_team.txt)은 update 파라미터 전체를 사용하는 순수 DNN 정책이며, tank_battle_platform.html Import 호환을 만족.

사용 팁
- 기본 실행: `node simulator/cli.js`
- 스크립트 실행: `scripts/simulate.sh` (경로/옵션 전달이 간편)
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
 - 빠른 비교 평가: `node src/eval_vs_reference.js --count 60 --start 3000 --maxTicks 3500 --fast`

추천 실행(장시간 컴퓨트 가능 시)
- CEM 장기 튜닝: `node src/train_cem.js --iters 20 --pop 120 --elite 24 --seeds 8 --ticks 3600 --fast --concurrency 8`
- ES 누적 러닝(120초 제한 회피): `node src/train_es.js --iters 2 --pop 60 --sigma 0.25 --alpha 0.06 --seeds 6 --ticks 3600 --concurrency 8 --fast`를 여러 차례 반복
