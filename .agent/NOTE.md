메모 (다음 실행 참고)

- 현 상태 요약:
  - DNN-only 팀 코드(result/dnn-ai.txt) 최신화. 입력 특징 66차원으로 확장, 네트워크 48-32 은닉층.
  - 초기화(ELM) → 모방학습(8k/10ep) → NES 탐색(12 iters, pop=18, seeds=3) 적용하였으나, reference-ai 상대로는 아직 승률 0%.

- 다음 실행 즉시 할 일(권장 루프):
  1) NES 반복 수행(짧은 스윕 여러 번):
     - `DNN_ITERS=12 DNN_POP=18 DNN_SEEDS=3 DNN_SIGMA=0.3 DNN_LR=0.15 DNN_MAXTICKS=2800 node scripts/train_dnn.js`
     - 저장되면 즉시 커밋. 2~4회 반복 권장.
  2) 장기 학습(시간 허용 시):
     - `DNN_ITERS=40 DNN_POP=24 DNN_SEEDS=5 DNN_SIGMA=0.25 DNN_LR=0.12 DNN_MAXTICKS=3500 node scripts/train_dnn.js`
  3) 주기적 검증:
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 200 --concurrency 8 --fast`.

- 추가 개선 아이디어(추후 변경 동반):
  - outDim 확장(예: move 8 + fire 1)으로 이동 후보를 늘려 충돌 회피성 향상.
  - 특징 강화: 적/아군/탄의 상대각 sin/cos 외에, 상대속도 투영/최근접시간 근사치(수치만 특징화) 추가.
  - 보상: 에너지/생존 가중 상향은 유지, 최대 틱 감소로 속전속결 유도.

- 고정 규칙 재확인:
  - tank_battle_platform.html 수정 금지.
  - 결과물은 항상 result/dnn-ai.txt (Import 가능 형식, 6 로봇, 타입 시퀀스: dealer, normal, dealer, tanker, dealer, tanker).
  - update는 DNN 순전파만 사용(휴리스틱 없음). 입력은 tank/enemies/allies/bulletInfo 전부 반영.
