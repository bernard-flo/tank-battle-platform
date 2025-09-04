# glowing-octo-fishstick
250916 테크본부 타운홀 코딩 게임

## Tank Battle AI 사용법

- 전장 실행: `tank_battle_platform.html` 파일을 브라우저로 열기
- 좌측/우측 팀 각 6개 텍스트박스의 Import 버튼으로 코드 일괄 입력 가능
- 우리팀 AI 일괄 코드: `ai/EXPORT_ALL.txt` 파일 전체 복사 → Import에 붙여넣기 → 가져오기
- 시작: Start 버튼으로 전투 시작, Pause/Reset 사용 가능

## 자동 테스트 (로컬)

- Node 18+ 권장
- 샘플 상대로 평가: `node simulator/test.js [N=50] [seedBase]`
- 강적 상대로 평가: `node simulator/test_vs_adversaries.js [N=100] [seedBase]`
- 임의 라인업 실험: `node simulator/try_team.js <파일1,..,파일6> [N=100] [seedBase] [sample|adversary]`
- 출력: `.result/` 폴더에 성능 요약 저장

## 디렉토리

- `ai/`       6개 탱크 AI 코드 및 Import용 합본
- `simulator/` 간이 시뮬레이터와 테스트 스크립트(강적/라인업 실험 포함)
- `.result/`  세션별 결과 기록(요약/통계)
- `.agent/`   작업 계획/메모 스크래치패드

## 내보내기 파일 갱신

- 합본 생성: `node ai/build_export.js`
- 결과: `ai/EXPORT_ALL.txt` 갱신됨
