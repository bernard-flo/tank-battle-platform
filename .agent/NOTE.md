메모 (다음 실행 참고)

- 현 상태 요약(이번 실행):
  - dnn-ai.txt 성능 재검증: 100전 100승(BlueAlive=0, 평균 Tick ≈ 758) 유지.
  - NES 튜닝(ITERS=4, POP=16, SEEDS=4, MAXTICKS=3200) 시도 → 성능 저하. 해당 결과를 커밋으로 보존 후 이전 강한 모델로 롤백 완료.
  - train_dnn.js 보강: 초기 m(베이스라인)을 best로 등록해 단기 튜닝에서의 역행 방지. 실행 시 baselineScore 로그 확인 가능.
  - 결과물은 HTML에서 즉시 Import 가능하며, 타입 시퀀스(Dealer, Normal, Dealer, Tanker, Dealer, Tanker) 고정.

- 다음 실행 권장 루프:
  1) NES/ARS 튜닝(미세 조정):
     - `DNN_ITERS=12 DNN_POP=24 DNN_SEEDS=6 DNN_SIGMA=0.22 DNN_LR=0.10 DNN_MAXTICKS=3300 node scripts/train_dnn.js`
     - 초기 baselineScore가 양호할 경우, 중간 저장은 best 기준으로만 진행(스크립트 보강 완료).
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
