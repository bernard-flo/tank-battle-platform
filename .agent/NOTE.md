메모 (다음 실행 참고)

– tank_battle_platform.html 규칙을 모사한 헤드리스 시뮬레이터 구현/검증 완료.
– 브라우저와 동일한 AI API(tank/enemies/allies/bulletInfo, Type), 발사쿨다운 500ms(=10틱, 첫 발 즉시 가능), 총알속도 8, 충돌/경계/아군 관통 로직 일치 확인.
– CLI 배치 실행(--repeat)과 JSON 저장(--json) 정상 동작 확인. .gitignore에 result*.json 포함.
– 시드는 초기 포신 각도에만 적용. 봇 내부 Math.random은 브라우저와 동일하게 비결정적.

보안
– 샌드박스 강화: window/document뿐 아니라 globalThis/global/process/require/module/Function/eval/setTimeout 등 주요 전역 접근을 차단하여 Node 환경 영향 최소화.

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
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
- 반복/시드/JSON: `node simulator/cli.js --repeat 100 --seed 42 --json result.json`
 - 리플레이 저장: `node simulator/cli.js --replay replay.json --seed 7 [--recordEvery 2]`

이번 실행
- 단일 경기 검증: `node simulator/cli.js --seed 123 --fast --json result.json` 실행, BLUE 승(틱 792) 확인, `result.json` 저장.
- 배치 검증: `node simulator/cli.js --repeat 5 --seed 777 --fast` 실행, Red 2/Blue 3/무 0 요약 출력 확인.
- 코드 변경 없음(문서만 갱신). 다음 단계로 AI 코드 설계/튜닝 착수 가능.
