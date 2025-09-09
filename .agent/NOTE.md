메모 (다음 실행 참고)

- 현 상태 요약(이번 실행):
  - 기존 dnn-ai.txt 성능 재검증: 50전 50승(BlueAlive=0, 평균 Tick ≈ 758) 확인.
  - 빠른 NES 튜닝(ITERS=3, POP=16, SEEDS=4) 시도에서 성능 저하 → 즉시 롤백(이전 커밋 상태로 파일 복원).
  - 현재 결과물은 tank_battle_platform.html에서 바로 Import 가능하며, 타입 시퀀스(Dealer, Normal, Dealer, Tanker, Dealer, Tanker) 고정 유지.

- 다음 실행 권장 루프:
  1) NES/ARS 튜닝(미세 조정):
     - `DNN_ITERS=12 DNN_POP=24 DNN_SEEDS=6 DNN_SIGMA=0.22 DNN_LR=0.10 DNN_MAXTICKS=3300 node scripts/train_dnn.js`
     - 스크립트 보강 아이디어: 루프 시작 전 초기 m 성능을 best로 등록하여, 단기 튜닝에서의 역행(revert) 방지.
  2) 광범위 검증:
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 500 --concurrency 8 --fast`
  3) 리플레이 샘플 생성(시각 확인):
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --seed 7 --replay result/replay-dnn-vs-ref.json`

- 추가 아이디어:
  - self-play 비율 20~30% 혼합해 일반화 강화.
  - 특징 확장(수치화만): 탄의 TTC 근사, 근접도 히스토그램, 벽 거리 다항 확장.

- 규칙 재확인:
  - tank_battle_platform.html 수정 금지.
  - 결과물: result/dnn-ai.txt(Import 포맷), 타입 시퀀스 고정(Dealer, Normal, Dealer, Tanker, Dealer, Tanker).
  - update는 DNN 순전파만 사용(휴리스틱 금지). 입력 파라미터 전부 활용.
