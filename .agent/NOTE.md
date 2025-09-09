다음 실행 참고 메모

- 목표: reference-ai.txt를 안정적으로 이기거나 최소 에너지/생존 우위를 확보.
- 정책: MLP(입력 64, 히든 64-64, 출력 9). update()는 tank/enemies/allies/bulletInfo 전체를 피처화하여 순수 DNN으로만 발사/이동 결정. 휴리스틱 미사용.
- 타입 조합: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER] 고정.

학습 계획(CEM)
- 커맨드 예시(짧은 러닝): `node src/train_cem.js --iters 6 --pop 36 --elite 0.25 --seeds 0,1,2,3 --maxTicks 3200`
- 장시간 러닝: iters 20~, pop 80~120, seeds 8~12로 증가. sigma는 0.5→0.2로 점감 권장.
- 점수: 승리 +1000, 생존차*100, 에너지 차 합산.

실행 기록(이번 실행)
- 평가: `node src/eval_vs_reference.js --start 3000 --count 40 --maxTicks 3200 --fast`
  · 결과: W:40 L:0 D:0, avgTicks≈761, avgRed≈54, avgBlue≈0 → reference-ai.txt를 안정적으로 압도
  · 현재 팀(result/ai_dnn_team.txt) 유지, 추가 학습 없이도 기준 충족

참고
- 결과물은 result/ai_dnn_team.txt, 가중치는 result/ai_dnn_weights.json에 저장. tank_battle_platform.html에서 Import 가능.
- 빠른 비교: `node simulator/cli.js --red result/ai_dnn_team.txt --blue result/reference-ai.txt --repeat 60 --fast --concurrency 8 --maxTicks 3500`

다음 실행 제안(성능 개선 루프)
- ES 장기 러닝을 2~3세트 반복(각 20~40분 예상)하여 참조 AI 초과 목표:
  `node src/train_es.js --iters 20 --pop 120 --sigma 0.15 --alpha 0.06 --seeds 8 --ticks 3500 --concurrency 8 --fast`
  · 시간이 부족하면: `--iters 10 --pop 60 --seeds 6 --ticks 3000`
- CEM 보조 탐색(중간 저장 재개 권장):
  `node src/train_cem.js --resume --iters 12 --pop 60 --elite 0.25 --seed 4242 --seeds 0,1,2,3,4 --maxTicks 3200 --no-fast`
- 초기 정책 안정화가 필요하면 모방학습(teacher_ai 기준) → ES 미세 조정 순으로 진행:
  `node src/imitation_train.js --matches 40 --ticks 2400 --epochs 8 --fast --teacher src/teacher_ai.txt`

메모
- update(tank, enemies, allies, bulletInfo) 전 파라미터를 모두 사용한 DNN 추론만 적용(휴리스틱 없음).
- 타입 순서 고정: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER].
- 필요 시 장시간 ES 학습으로 추가 성능 확보 가능(현재도 기준 초과).
