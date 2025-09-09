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
- src/generate_dnn_team.js: DNN 정책 코드 생성기.
  - getNetSpec/initWeights: 64입력(탑K 정렬 기반) MLP(64-64-9)용 유틸.
  - genMLPCode: 범용 MLP 생성기(입력 76, 히든 [64,64], 출력 9 권장). update()는 순수 DNN.
  - generateTeamCode/saveTeamTo: 64입력 버전 팀 코드 생성기(레거시 호환).
- src/train_cem.js: CEM(64입력 버전) 최적화 스크립트. 참고용.
- src/train_es.js: ES(76입력 버전, 64-64-9) 최적화 스크립트. 병렬 워커 사용.
- src/es_worker.js: ES 평가 워커. genMLPCode로 팀 코드 생성 후 시뮬레이션.
- src/imitation_train.js: 레퍼런스 AI 모방 지도학습(76입력, 64-64-9). 결과를 ai_dnn_team.txt/ai_dnn_weights.json에 저장.
- src/design_weights_9.js: 76입력용 분석적 초기 가중치(조준/스트레이프/거리 게이팅) 생성기. update는 DNN만 사용.
- src/design_weights_plus.js: 개선된 설계 가중치(탄 회피·스트레이프·후퇴 결합) 생성기. update는 DNN만 사용.

결과물(result)
- result/reference-ai.txt: 비교용 레퍼런스 AI 코드(여섯 로봇, 휴리스틱 기반).
- result/ai_dnn_team.txt: 생성된 DNN 팀 코드. tank_battle_platform.html Import 가능. 타입 고정 [N, D, T, D, T, D].
- result/ai_dnn_weights.json: 최신 가중치(입력 76, 히든 [64,64], 출력 9). genMLPCode로 재생성 가능.

비고
- tank_battle_platform.html은 수정하지 않음. 브라우저 렌더링 이펙트만 제외하고 로직은 동일.
- 시뮬레이터 출력 JSON(result*.json)과 리플레이(replay*.json)는 .gitignore에 포함됨.
정확화: HTML과 동일하게 경기 시작 직후 첫 발사 즉시 가능. 그 이후 500ms(=10틱) 쿨다운 적용. 판정은 엔진 시간 누적 기반(틱 50ms)으로 수행.

업데이트(이번 실행)
- 설계형 가중치(design_weights_plus)로 DNN 초기화 후 평가 → 레퍼런스에 열세(0승, 평균 틱 단축) 확인.
- 모방학습(imitation_train.js, 30매치·10에폭) 적용 후 재평가 → 여전히 열세.
- ES 튜닝(train_es.js) 1회 이터레이션(pop=40, seeds=4) 적용 → 20시드 평가에서 전부 무승부(레드/블루 에너지 차는 블루 우위). 장시간 ES 필요.
- 결과물(result/ai_dnn_team.txt, ai_dnn_weights.json) 최신화 완료. tank_battle_platform.html에서 Import 가능한 형식 유지.

사용 팁
- 기본 실행: `node simulator/cli.js`
- 스크립트 실행: `scripts/simulate.sh` (경로/옵션 전달이 간편)
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
- 빠른 비교 평가: `node src/eval_vs_reference.js --count 200 --start 1 --maxTicks 4000 --fast`

추천 실행(장시간 컴퓨트 가능 시)
- ES 장기 튜닝(권장): `node src/train_es.js --iters 30 --pop 120 --sigma 0.18 --alpha 0.06 --seeds 8 --ticks 3600 --concurrency 8 --fast`
- 모방→ES 파이프라인: `node src/imitation_train.js --matches 80 --ticks 2600 --epochs 20 --fast` 후 `train_es.js` 반복
- CEM 보조 탐색: `node src/train_cem.js --iters 20 --pop 80 --elite 0.25 --seeds 0,1,2,3,4 --maxTicks 3200`
