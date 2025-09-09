메모 (다음 실행 참고)

- 현 상태 요약:
  - DNN-only 팀 코드는 result/dnn-ai.txt로 최신화됨(모방학습 20k 샘플 + ELM 출력층 초기화 + NES 반복).
  - 빠른 스윕 1회(10 iters, pop=12, seeds=1, 2000ticks) 결과 여전히 승률 0% (100전 기준). 추가 탐색 필요.

- 다음 실행 즉시 할 일(빠른 루프 추천):
  1) 빠른 NES 스윕 반복(타임아웃 회피용 파라미터):
     - `DNN_ITERS=10 DNN_POP=12 DNN_SEEDS=1 DNN_SIGMA=0.35 DNN_LR=0.2 DNN_MAXTICKS=2000 node scripts/train_dnn.js`
     - 위 명령을 수회 반복 실행(각 ~45초). 실행마다 result/* 갱신 → 즉시 커밋.
  2) 주기적 검증:
     - `node simulator/cli.js --red result/dnn-ai.txt --blue result/reference-ai.txt --repeat 100 --fast --concurrency 8`
  3) 시간이 허용되면 안정 설정으로 장기 학습:
     - `DNN_ITERS=50 DNN_POP=16 DNN_SEEDS=3 DNN_SIGMA=0.3 DNN_LR=0.15 DNN_MAXTICKS=3500 node scripts/train_dnn.js`

- 향후 개선(필요시 코드 변경 포함):
  - 아키텍처 확장(예: 43→64→32→5) 및 Xavier 초기화 강화. 스크립트 ARCH 동기화 필요.
  - feature 확장(K값 증대: EN_K/AL_K/BL_K) 및 정규화 범위 재조정.
  - 평가 보상 가중치 튜닝(에너지/생존/속전속결 가중치).
  - 데이터 혼합 모방학습: reference + 강화된 teacher를 혼합해 대규모(supervised pretrain) 후 NES 파인튜닝.

- 고정 규칙 재확인:
  - tank_battle_platform.html 파일은 절대 수정하지 않음.
  - 결과물은 result/dnn-ai.txt에 항상 저장(Import 가능 형식).
  - 타입 조합 고정: dealer, normal, dealer, tanker, dealer, tanker.
  - update는 DNN 순전파만 사용(휴리스틱 없음). 입력은 tank/enemies/allies/bulletInfo 모두 반영.
