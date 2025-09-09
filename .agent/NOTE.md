다음 실행 참고 메모

- 목표: reference-ai.txt를 상대로 안정적 우세 달성.
- 현재 정책: 공유 MLP(입력 76, 히든 64-64, 출력 5: [move x,y, fire x,y, fire logit])
  · 피처: tank(자기 상태), enemies/allies 최근접 K, bulletInfo 최근접 K, 전역 통계.
  · 액션: fireP>0.5일 때 fire(fireAngle), move(mvAngle) 1회 호출. 휴리스틱 없음.
- 학습: CEM(pop 60, elite 12, seeds 3, iters 10, sigma 0.6→감쇠)
  · 보상: (redEnergy - blueEnergy) + 승패 보너스(승 +100, 패 -100)
  · 반복 중간에도 result/ai_dnn_team.txt 갱신.

아이디어/향후 개선
- 입력에 탄환 상대 각·속도 외에 최근 이동각 추정(모델 안에서 처리하도록 시계열 스택 or EMA 추가) 고려.
- 출력에 move/fire 강도(logit→soft gate) 따로 두어 탐색성 증가 가능.
- CEM 병렬화 구현 완료(src/cem_worker.js). 향후 후보 샘플링 전략(antithetic, CMA-ES) 검토.
- seeds 수를 점진 증가: 이터 후반에 안정적 일반화.

실행 메모(이번 실행)
- reference-ai.txt 대비 학습 시작점 승률 낮음. 병렬화 추가 후 짧은 러닝으로 반복 예정.
- 빠른 실험 파라미터 예: `node src/train_cem.js --iters 8 --pop 40 --elite 8 --seeds 2 --ticks 1200 --fast --runner secure --concurrency 8`
