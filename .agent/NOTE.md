메모 (다음 실행 참고)

- 현 상태 요약(이번 실행):
  - dnn-ai.txt 성능 재검증(배치): 200전 200승(무패), 평균 Tick ≈ 758, BlueAlive=0, BlueEnergy=0. 시드 1000부터 200판 병렬 검증.
  - NES 튜닝(이전 실험): 일부 설정에서 성능 저하 사례 확인 → 스크립트에 베이스라인 보호 장치 추가 완료.
  - 결과물은 HTML에서 즉시 Import 가능하며, 타입 시퀀스(Dealer, Normal, Dealer, Tanker, Dealer, Tanker) 고정.

- 다음 실행 권장 루프:
  1) NES/ARS 미세 조정(선택):
     - `DNN_ITERS=12 DNN_POP=24 DNN_SEEDS=6 DNN_SIGMA=0.22 DNN_LR=0.10 DNN_MAXTICKS=3300 node scripts/train_dnn.js`
     - baselineScore 대비 개선 시에만 저장하도록 스크립트 로직 유지.
  2) 광범위 검증:
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 500 --concurrency 8 --fast`
  3) 리플레이 샘플(시각 확인):
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --seed 777 --replay result/replay-dnn-vs-ref-777.json`

- HTML 사용 팁:
  - tank_battle_platform.html → 팀 헤더의 "가져오기"에서 result/dnn-ai.txt 전체를 붙여넣기.
  - 타입 조합(순서 고정): Dealer, Normal, Dealer, Tanker, Dealer, Tanker.
  - update 함수는 DNN 순전파만 사용(입력 파라미터 전부 특징으로 활용, 휴리스틱 없음).

- 추가 아이디어:
  - self-play 비율 20~30% 혼합해 일반화 강화.
  - 특징 확장(수치화만): 탄의 TTC 근사, 근접도 히스토그램, 벽 거리 다항 확장.

- 규칙 재확인:
  - tank_battle_platform.html 수정 금지.
  - 결과물: result/dnn-ai.txt(Import 포맷), 타입 시퀀스 고정(Dealer, Normal, Dealer, Tanker, Dealer, Tanker).
  - update는 DNN 순전파만 사용(휴리스틱 금지). 입력 파라미터 전부 활용.
