메모 (다음 실행 참고)

- 목표: reference-ai.txt를 안정적으로 상회하는 DNN 팀 생성 (최종 update는 DNN 순전파만 사용).
- 실행 순서 제안:
  1) 모방학습 워밍업: `IM_SAMPLES=20000 IM_EPOCHS=15 node scripts/imitate_reference.js`
     - reference-ai의 행동을 지도학습으로 근사하여 초기 가중치 확보(빠르고 안정적).
  2) 강화/진화 미세조정: `DNN_ITERS=200 DNN_POP=24 DNN_SEEDS=4 node scripts/train_dnn.js`
     - reference 상대로 승률을 직접 최적화. 시간이 오래 걸리나 성능 향상 여지 큼.
  2) 검증: `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 50 --fast --concurrency 4`
  3) 리플레이(단일 시드): `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --seed 123 --replay result/replay.json`

- 제약: tank_battle_platform.html은 수정 금지. Import 모달에 result/dnn-ai.txt 내용을 그대로 붙여넣으면 인식됨.
- update는 DNN 순전파만 사용(회피/타게팅 등 휴리스틱 로직 미사용). 이동은 DNN이 산출한 4개 각도를 순차 시도.
- 타입 배치는 고정(dealer, normal, dealer, tanker, dealer, tanker)이며 코드에 하드코딩됨.

- 개선 아이디어:
  - seeds 다양화/반복수 증가하여 과적합 방지.
  - arch 확장(h1/h2 유닛 수 증가) 시 파라미터 급증 -> DNN_ITERS 확장, 또는 IM_SAMPLES 증가.
  - 평가 지표(승리, 에너지 격차, 생존 수, 종료 틱)에 대한 가중치 튜닝.
  - imitate_reference로 초기화 후 train_dnn으로 파인튜닝(성능/안정성 균형).

현재 상태
- dnn-ai.txt는 DNN-only 정책으로 생성/유지되며, 타입 순서(dealer, normal, dealer, tanker, dealer, tanker)는 고정됨.
- 짧은 학습으로는 reference-ai 대비 성능이 낮음 -> 위 절차로 반복 학습 권장.
