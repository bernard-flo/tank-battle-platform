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

이번 실행
- 단일 경기 검증(방금 실행): `node simulator/cli.js --repeat 1 --seed 123 --fast --json result.json --replay replay.json --recordEvery 2`
  실행 결과 BLUE 승, 틱 646, Red 에너지 0, Blue 에너지 75 확인. `result.json`, `replay.json` 저장.
- 배치 검증(이전): `node simulator/cli.js --repeat 5 --seed 777 --fast` 실행 결과, Red 2 / Blue 3 / 무 0.
- 코드 변경 없음(문서만 갱신). 다음 단계로 AI 코드 설계/튜닝 착수 가능.

이번 실행(추가 확인)
- 기본 실행 재검증: `node simulator/cli.js --repeat 1 --seed 123 --fast` → BLUE 승, 틱 713, 통계 정상 출력.
- 코드 변경 없음. 시뮬레이터/CLI/샌드박스 동작 이상 없음.

이번 실행(요약)
- 요구된 시뮬레이터 구현 상태 확인: 엔진 규칙/샌드박스/CLI/리플레이/배치 실행 모두 정상.
- 코드 변경 없음(문서만 갱신). tank_battle_platform.html 미변경.

다음 실행 제안(TODO)
- 초고속 모드(객체 풀링/TypedArray) 프로토타입 추가 검토: bullets/tanks를 구조적 공유버퍼로 관리해 GC 압력 저감.
- 간단 단위테스트 추가: 이동 충돌, 아군 관통, 쿨다운 타이밍, 초기 배치 좌표.
 - HTML 리플레이 뷰어(간이 페이지) 추가 검토: `replay.json` 시각화로 디버깅 편의성 향상.

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
