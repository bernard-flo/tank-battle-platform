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

비고
- tank_battle_platform.html은 수정하지 않음. 브라우저 렌더링 이펙트만 제외하고 로직은 동일.
- 시뮬레이터 출력 JSON(result*.json)과 리플레이(replay*.json)는 .gitignore에 포함됨.
정확화: HTML과 동일하게 경기 시작 직후 첫 발사 즉시 가능. 그 이후 500ms(=10틱) 쿨다운 적용. 판정은 엔진 시간 누적 기반(틱 50ms)으로 수행.

업데이트(현재 실행)
- 코드 생성기: ai/dnn_codegen.js
  - 입력 특징 66차원(고정). 네트워크 66→48→32→OUT, tanh.
  - 출력 모드 지원:
    · OUT=5  : [m1,m2,m3,m4,fire] 라디안 직접 예측(하위호환)
    · OUT=10 : [sin,cos]×5 쌍으로 각도 예측의 랩어라운드 안정화(신규)
  - 타입 시퀀스 고정: dealer, normal, dealer, tanker, dealer, tanker.
- 지도학습(모방): scripts/imitate_reference.js
  - 출력 차원을 10(각도당 sin/cos)으로 변경하여 랩어라운드 손실 문제 해소.
  - 12k 샘플, 10 epochs로 학습해 dnn-ai.* 생성.
- NES 튜닝: scripts/train_dnn.js
  - ARCH.outDim=10으로 동기화. 필요 시 추가 튜닝 가능.
- 결과물(Import용):
  - result/dnn-ai.txt: HTML에서 Import 가능한 팀 코드(타입 고정 유지).
  - result/dnn-ai-weights.json: ARCH/가중치/메타(이번 실행에서 meta.iter=5로 갱신, 가중치 값은 베이스라인 유지).

검증(이번 실행)
- 재검증 배치: `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 50 --concurrency 8 --fast --runner fast`
  - 결과: 50전 50승(무패), AvgTicks ≈ 758, BlueAlive=0, BlueEnergy=0.
- NES 튜닝(짧게): `DNN_ITERS=5 DNN_POP=12 DNN_SEEDS=4 DNN_SIGMA=0.28 DNN_LR=0.12 DNN_MAXTICKS=3300 node scripts/train_dnn.js`
  - 결과: 평균 점수 하락 추세로 베이스라인 유지(가중치 불변), weights.json의 meta만 iter=5로 갱신됨.

사용 팁
- 기본 실행: `node simulator/cli.js`
- 스크립트 실행: `scripts/simulate.sh` (경로/옵션 전달이 간편)
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
