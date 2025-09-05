메모 — 다음 실행 아이디어

- train_roles 세대 확장: `GENS=24` 이상 반복 수행, 최상위 개체 유지
- 평가 다양화: baseline 외 미러전/랜덤 정책 풀 추가 (engine 확장 필요 시 `scripts/sim/engine.js`에 opponent pool 주입)
- 모델 확장 실험: 은닉 8~12, 출력에 `shootProb` 추가해 발사 빈도 조절
- 리더샷 고도화: 상대 속도 추정(근접 프레임간 diff) 특징 추가
- 임포트 번들 버전 태깅: `// PACK vX` 주석 헤더 자동 삽입
