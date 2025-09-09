메모 (다음 실행 참고)

- 현 상태 요약(이번 실행):
  - 모방 학습 강화: 12k/12ep → 20k/20ep로 재학습하여 dnn-ai.* 갱신 및 커밋.
  - NES 튜닝(단기): 4 iters(pop=16,seeds=3) + 4 iters(pop=12,seeds=2) 추가 수행 및 커밋.
  - 200판 배치 평가에서 승률은 아직 0%로, 추가 반복 학습 필요(평균 블루 생존/에너지는 하락 추세 확인).

- 다음 실행 권장 루프:
  1) NES 반복 스윕(짧고 자주):
     - `DNN_ITERS=8 DNN_POP=16 DNN_SEEDS=4 DNN_SIGMA=0.26 DNN_LR=0.12 DNN_MAXTICKS=3300 node scripts/train_dnn.js`
     - 3~6회 반복 실행(시간 허용 시), 각 실행 후 결과 커밋.
  2) 배치 평가:
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 300 --concurrency 8 --fast`
  3) 장기 러닝(야간):
     - `DNN_ITERS=60 DNN_POP=24 DNN_SEEDS=6 DNN_SIGMA=0.22 DNN_LR=0.10 DNN_MAXTICKS=3500 node scripts/train_dnn.js`

- 추가 개선 아이디어:
  - 출력 차원 확대(예: move 8개 + fire 1개)로 분류 기반 정책 시도(소프트맥스 + top-k 선택). 코드/학습 스크립트 동반 개편.
  - 특징 추가(수치화만): 탄의 접근시간 근사(TTC), 아군/적 밀도/군집도, 사각거리(벽 거리) 고차항.
  - self-play 혼합 평가: reference 70%, self-play 30% → 탐색성/일반화 향상.
  - 평가 러너 'fast' 고정 + seeds 증가로 분산 축소.

- 규칙 재확인:
  - tank_battle_platform.html 수정 금지.
  - 결과물: result/dnn-ai.txt(Import 포맷), 타입 시퀀스 고정: dealer, normal, dealer, tanker, dealer, tanker.
  - update는 DNN 순전파만 사용. 입력은 tank/enemies/allies/bulletInfo 모두 사용.
