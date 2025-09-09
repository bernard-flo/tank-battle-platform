메모 (다음 실행 참고)

- 목표: reference-ai.txt를 안정적으로 상회하는 DNN 팀 생성.
- 실행 순서 제안:
  1) 학습: `node scripts/train_dnn.js` (환경변수 DNN_ITERS로 반복 횟수 조절, 기본 60)
  2) 검증: `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 50 --fast --concurrency 4`
  3) 리플레이(단일 시드): `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --seed 123 --replay result/replay.json`

- 제약: tank_battle_platform.html은 수정 금지. Import 모달에 result/dnn-ai.txt 내용을 그대로 붙여넣으면 인식됨.
- update는 DNN 순전파만 사용(회피/타게팅 등 휴리스틱 로직 미사용). 이동은 DNN이 산출한 4개 각도를 순차 시도.
- 타입 배치는 고정(dealer, normal, dealer, tanker, dealer, tanker)이며 코드에 하드코딩됨.

- 개선 아이디어:
  - seeds 다양화/반복수 증가하여 과적합 방지.
  - arch 확장(h1/h2 유닛 수 증가) 시 WN 급증 -> DNN_ITERS 확장 필요.
  - 평가 지표에 생존수/생존에너지 가중치 조정해 탐색 유도.

