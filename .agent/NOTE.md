메모 (다음 실행 참고)

– tank_battle_platform.html 규칙을 모사한 헤드리스 시뮬레이터 구현/검증 완료.
– 브라우저와 동일한 AI API(tank/enemies/allies/bulletInfo, Type), 발사쿨다운 500ms(=10틱), 총알속도 8, 충돌/경계/아군 관통 로직 일치 확인.
– CLI 배치 실행(--repeat)과 JSON 저장(--json) 정상 동작 확인. .gitignore에 result*.json 포함.
– 시드는 초기 포신 각도에만 적용. 봇 내부 Math.random은 브라우저와 동일하게 비결정적.

진행 상황
– 단일 매치/배치 매치 실행 테스트 완료. 평균 틱/생존/에너지 집계 검증.
– 파일 구조 문서 최신화.

업데이트
– 리플레이 기록 기능 추가: --replay replay.json, --recordEvery N 지원. 단일 실행에서만 저장.
– 엔진 meta에 seed/tickMs/맵 크기/플레이어 목록 포함.

다음 액션 제안
– 리플레이 로그(틱별 탱크/총알 상태) 덤프 옵션 추가하여 HTML에서 재생 검증.
– 성능 튜닝: 대량 반복 시 메모리 압력 완화(객체 풀링) 및 JIT 친화 루프 재구성 검토.
– 간단한 검증 테스트 스위트 추가(예: 아군 관통, 쿨다운, 경계 충돌 단위 테스트).

사용 팁
- 기본 실행: `node simulator/cli.js`
- 파일 지정: `node simulator/cli.js --red red.js --blue blue.js`
- 반복/시드/JSON: `node simulator/cli.js --repeat 100 --seed 42 --json result.json`
 - 리플레이 저장: `node simulator/cli.js --replay replay.json --seed 7 [--recordEvery 2]`
