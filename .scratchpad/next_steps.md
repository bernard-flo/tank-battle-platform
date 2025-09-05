# 다음 실행 아이디어

- 더 길게 학습: `GENS=32 node scripts/train_roles.js`
- 평가 다양화: `MATCHES=200 node scripts/sim/run.js`
- 상호전: 현재 번들 vs 과거 번들 저장 후 리그전 스크립트 추가
- 은닉 차원 실험: H=8/12로 확장 후 성능 비교
- 리드샷 범위/쿨다운 민감도 실험

진행 현황(2025-09-05T07:11Z)
- train_roles GENS=24 완료, result/ai.txt 갱신
- baseline 100전 평가 완료(100승, avgEndTick≈262.9)

다음 액션
- GENS=32~48로 확대 학습 반복, 시드 풀 확대
- 미러전/랜덤 상대/과거 체크포인트 혼합 리그 평가
- 역할 2-2-2 vs 2-3-1 성능 비교 리포트 작성
