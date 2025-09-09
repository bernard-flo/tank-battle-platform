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
  - 입력 특징 확장(66차원):
    · self(8) + enemies 3명(각 dx,dy,health,dist,sin,cos) + allies 2명(동일 6특징) + bullets 3개(각 dx,dy,vx,vy,dist,speed,approach) + counts(3) + walls(4)
  - 네트워크 확장: 66 -> 48 -> 32 -> 5, tanh 활성화.
  - 출력: move 4개 + fire 1개(각도), DNN 순전파 외 휴리스틱 없음.
- 학습 스크립트: scripts/train_dnn.js
  - ARCH 동기화(inDim=66,h1=48,h2=32,out=5) 및 보상 튜닝(생존/에너지/속전속결 가중 상향).
  - NES 빠른 스윕 12회(pop=18, seeds=3, maxTicks=2800) 수행하여 결과 갱신.
- 초기화 스크립트 실행:
  - scripts/fit_elm.js 실행 → 출력층 릿지로 초기화 후 저장/커밋.
  - scripts/imitate_reference.js 실행(8k/10ep) → 모방 학습 가중치 반영 후 저장/커밋.
- 결과물(Import용):
  - result/dnn-ai.txt: tank_battle_platform.html에서 Import 가능한 팀 코드(6 로봇, 타입 고정 시퀀스).
  - result/dnn-ai-weights.json: 현재 ARCH 및 가중치, 메타 정보.

사용 팁
- 기본 실행: `node simulator/cli.js`
- 스크립트 실행: `scripts/simulate.sh` (경로/옵션 전달이 간편)
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
