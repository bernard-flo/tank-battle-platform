# Worker TODO (SUPER6) — 루프 다음 액션

단기(다음 세션 우선)
- tools/sim 골격 생성: package.json, engine/loader/cli/round_robin/search 스텁
- results 경로 일원화(`tools/sim/results/*`), CSV/JSON 출력 규격 정의
- PARAMS 주입 경로 설계 및 `params/*.json` 프리셋 작성(6종)
- rr 요약 지표: `winA, winB, avgAliveDiff, avgTime` 구현 및 결정성 체크 옵션 추가

중기(탐색/튜닝)
- search.js 빔 탐색 + GA 모드 추가, 다상대 평가/스코어(승점+시간 가중)
- params/history 스냅샷 저장 및 best 반영 워크플로우
- 시드 고정(seedrandom), perf 로그(1회/10회) 한 줄 요약

장기(정밀화/플랫폼 호환)
- 엔진 단위 정합(탄속 per-tick), 아군/자기탄 충돌 무시, 쿨다운 강제
- 밸런스: TIME_LIMIT/탄 수명/데미지/반경 등 타이율 감소 방향으로 소폭 조정
- README: 파라미터 범위 표, 스코어 정의, 실행 예시 보강

메모
- 스니펫은 PARAMS 미주입 환경에서도 정상 동작하도록 기본값 유지
- 팀 Export는 `teams/SUPER6.export.txt`에서 `function name()` 토큰으로 플랫폼 Import 호환

