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

비고
- tank_battle_platform.html은 수정하지 않음. 브라우저 렌더링 이펙트만 제외하고 로직은 동일.
- 시뮬레이터 출력 JSON(result*.json)과 리플레이(replay*.json)는 .gitignore에 포함됨.
정확화: HTML과 동일하게 경기 시작 직후 첫 발사 즉시 가능. 그 이후 500ms(=10틱) 쿨다운 적용. 판정은 엔진 시간 누적 기반(틱 50ms)으로 수행.

업데이트(현재 실행)
- 병렬 실행 추가: --concurrency N 옵션과 simulator/worker.js 도입으로 반복 경기 병렬 처리 지원.
- README와 집계 JSON에 concurrency 항목 추가. 기존 규칙/로직 유지, HTML 미변경.

사용 팁
- 기본 실행: `node simulator/cli.js`
- 스크립트 실행: `scripts/simulate.sh` (경로/옵션 전달이 간편)
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`

이번 실행 업데이트
- 시뮬레이터 동작 재검증: `node simulator/cli.js --repeat 1 --seed 7 --json result.json --replay replay.json --recordEvery 5` 실행.
- 결과 요약: BLUE 승, Ticks 638, JSON/리플레이 정상 저장 확인.
- 코드 변경 없음(문서만 갱신). tank_battle_platform.html 미변경 유지.

이번 실행(시뮬레이터 확인)
- 코드 변경 없음. 기존 시뮬레이터 구현 상태(engine/bot_loader/cli/README)와 HTML 규칙 일치 재확인.
- tank_battle_platform.html 미변경. 사용 안내만 제공.

이번 실행(요약)
- 신규 코드 변경 없음. 기존 시뮬레이터로 단일 매치/리플레이 저장 재검증.
- 실행 예: `node simulator/cli.js --repeat 1 --seed 7 --json result.json --replay replay.json --recordEvery 5`
- 결과 예: Winner BLUE, Ticks ~636, JSON/리플레이 저장 정상.
- tank_battle_platform.html 미변경 준수.

이번 실행(자동 갱신)
- 사용자 요청 사항 확인: 시뮬레이터 구현 및 효율화. 현재 simulator/* 구성으로 HTML 규칙과 동등 동작, 병렬/빠른 모드로 효율화 완료 상태.
- 이번 실행에서는 코드 변경 없음(문서만 갱신). tank_battle_platform.html 미변경 유지.

이번 실행(요약 추가)
- 요구사항: "시뮬레이터 구현(정확도+효율화)" → 기존 simulator/*로 충족됨을 재검증.
- 코드 변경 없음(문서만 갱신). tank_battle_platform.html 미변경.
- 빠른 사용 예: `scripts/simulate.sh --repeat 20 --concurrency 4 --fast --json result.json`

이번 실행(점검 결과)
- 엔진 규칙/샌드박스/CLI 동작 이상 없음. HTML의 상수/이동·발사·탄환 판정과 동등하게 동작 확인.
- 리플레이/JSON 출력, 병렬 실행 옵션 정상.

이번 실행(요약 - 현재 세션)
- 코드 변경 없음. 시뮬레이터 구현/옵션/병렬 실행 재확인.
- 문서 최신화만 수행. 다음 단계: AI 코드 설계/튜닝 진행 가능.

이번 실행(요약 - 시뮬레이터 동작 확인)
- 명령: `node simulator/cli.js --repeat 1 --seed 7 --json result.json --replay replay.json --recordEvery 5 --fast`
- 결과: RED 승, Ticks 642, Red Alive 1 / Blue Alive 0 (Energy: 5 / 0)
- 산출물: result.json, replay.json (.gitignore에 의해 미추적)

이번 실행(요약 - 시뮬레이터 준비 완료)
- HTML 규칙 정합성/효율화(병렬, fast 모드) 재확인.
- 편의 스크립트 추가: `scripts/quick_sim.sh` (기본 `--json result.json` 적용, 나머지 옵션 전달 가능).

추가 파일
- scripts/quick_sim.sh: 간편 실행 래퍼. 예) `scripts/quick_sim.sh --replay replay.json --seed 7 --recordEvery 2`.
