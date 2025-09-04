# glowing-octo-fishstick
250916 테크본부 타운홀 코딩 게임

## Tank Battle AI 사용법

- 전장 실행: `tank_battle_platform.html` 파일을 브라우저로 열기
- 좌측/우측 팀 각 6개 텍스트박스의 Import 버튼으로 코드 일괄 입력 가능
- 우리팀 AI 일괄 코드: `ai/EXPORT_ALL.txt` 파일 전체 복사 → Import에 붙여넣기 → 가져오기
- 시작: Start 버튼으로 전투 시작, Pause/Reset 사용 가능

## 자동 테스트 (로컬)

- Node 18+ 권장
- 실행: `node simulator/test.js`
- 출력: `.result/sim_result_*.json`에 성능 요약 저장 (샘플 코드 상대로 N=50 전 평가)

## 디렉토리

- `ai/`       6개 탱크 AI 코드 및 Import용 합본
- `simulator/` 간이 시뮬레이터와 테스트 스크립트
- `.result/`  세션별 결과 기록(요약/통계)
- `.agent/`   작업 계획/메모 스크래치패드
