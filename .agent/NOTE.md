메모 (다음 실행 참고)

- 현 상태 요약(이번 실행):
  - DNN 업데이트 함수를 sin/cos 출력(10차원) 디코딩 방식으로 개선.
  - reference AI 모방 학습(12k 샘플, 10 epochs) 수행 → dnn-ai.* 갱신.
  - 배치 평가 200판: DNN(red) vs reference(blue) = 200승 0패 0무, 평균 BlueAlive=0. → reference-ai.txt를 압도.

- 다음 실행 권장 루프:
  1) NES/ARS 튜닝(미세 조정):
     - `DNN_ITERS=12 DNN_POP=24 DNN_SEEDS=6 DNN_SIGMA=0.22 DNN_LR=0.10 DNN_MAXTICKS=3300 node scripts/train_dnn.js`
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
