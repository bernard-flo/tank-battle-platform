프로젝트 파일 구조 (자동 기록)

- .agent/FILE_STRUCTURE.md: 생성/변경 파일 목록과 간단 설명 관리(본 문서).
- .agent/NOTE.md: 다음 실행 시 참고할 메모.

시뮬레이터 구성
- simulator/engine.js: 헤드리스 물리/룰 엔진. 맵 900x600, 틱 50ms, 총알속도 8, 발사쿨다운 500ms, 이동 1회/틱 + 최대 10회 시도, 경계/충돌/아군 관통 규칙을 HTML과 동일하게 구현.
- simulator/bot_loader.js: 팀 코드 분할(function name()), 이름/타입 추출, 안전한 실행기(Function 샌드박스) 생성.
- simulator/cli.js: 커맨드라인 인터페이스. --red/--blue 코드 입력, --maxTicks/--seed/--repeat/--json 옵션 지원. 단일/배치 실행 요약 출력.
- simulator/ai/default_team.js: 예시 6개 로봇 코드. HTML 기본 플레이스홀더와 동작 일치.
- simulator/README.md: 사용법, 규칙 매핑, 배치 실행 예시.

비고
- tank_battle_platform.html은 수정하지 않음. 브라우저 렌더링 이펙트만 제외하고 로직은 동일.
- 시뮬레이터 출력 JSON(result*.json)은 .gitignore에 포함됨.
