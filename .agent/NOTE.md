메모 (다음 실행 참고)

- 현 상태 요약(이번 실행):
  - scripts/imitate_reference.js를 66차원 입력/48-32 은닉으로 동기화하고, 12k 샘플 8에폭 지도학습으로 초기 가중치 생성.
  - 이어서 NES 8 iters(pop=16,seeds=4) 튜닝 후 result/dnn-ai.* 갱신 및 커밋.
  - 현재 reference-ai와의 200판 배치 결과는 여전히 열세(승률 0%). 추가 학습 반복 필요.

- 다음 실행 권장 루프:
  1) NES 반복 스윕(짧고 자주):
     - `DNN_ITERS=10 DNN_POP=20 DNN_SEEDS=5 DNN_SIGMA=0.25 DNN_LR=0.12 DNN_MAXTICKS=3200 node scripts/train_dnn.js`
     - 2~5회 반복하며 중간 산출물을 계속 커밋.
  2) 배치 평가:
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 300 --concurrency 8 --fast`
  3) 시간 허용 시 장기 러닝:
     - `DNN_ITERS=40 DNN_POP=24 DNN_SEEDS=6 DNN_SIGMA=0.22 DNN_LR=0.10 DNN_MAXTICKS=3500 node scripts/train_dnn.js`

- 추가 개선 아이디어:
  - 출력 차원 확대(예: move 8개 + fire 1개)와 손실에 이동 성공률 보조항 도입(스코어에 반영) → 학습 스크립트 확장 필요.
  - 특징 추가(수치화만): 탄의 접근시간 근사(ttc), 아군/적 군집도(밀도) 등.
  - 평가 다양화: self-play(자기 대 자기) 비중을 일부 추가하여 일반화 개선.

- 규칙 재확인:
  - tank_battle_platform.html 수정 금지.
  - 결과물: result/dnn-ai.txt(Import 포맷), 타입 시퀀스 고정: dealer, normal, dealer, tanker, dealer, tanker.
  - update는 DNN 순전파만 사용. 입력은 tank/enemies/allies/bulletInfo 모두 사용.
