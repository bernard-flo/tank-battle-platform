프로젝트 파일 구조 (자동 기록)

- .agent/FILE_STRUCTURE.md: 생성/변경 파일 목록과 간단 설명을 관리합니다.
- .agent/NOTE.md: 다음 실행 시 참고할 메모를 남깁니다.
- simulator/engine.js: tank_battle_platform.html 규칙을 그대로 재현한 헤드리스 물리/룰 엔진.
- simulator/bot_loader.js: 브라우저 버전과 동일한 포맷의 AI 코드(name/type/update)를 로드/샌드박스 실행.
- simulator/cli.js: CLI 실행 진입점. 양 팀 코드 로드, 시뮬레이션 수행, 결과 출력(JSON/배치 반복 --repeat 지원).
- simulator/ai/default_team.js: 기본 예시 팀(6개 로봇) 코드. HTML 기본 전략과 동일한 동작 제공.
- simulator/README.md: 사용법 및 규칙 대응 표기.
