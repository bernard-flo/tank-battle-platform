다음 실행 참고 메모

- 목표: reference-ai.txt를 상대로 안정적 우세 달성.
- 현재 정책: 공유 MLP(입력 76, 히든 64-64, 출력 9: [mv1x,mv1y,mv2x,mv2y, fx,fy, fire_logit, mv3x,mv3y])
  · 피처: tank(자기 상태), enemies/allies 최근접 K, bulletInfo 최근접 K, 전역 통계.
  · 액션: fireP>0.5일 때 fire(fireAngle), move는 최대 3회 시도(mv1→mv2→mv3). 휴리스틱 없음.
- 학습: (1) 모방학습으로 초기화(레퍼런스 행동 수집→Adam 8 epoch) → (2) CEM/ES로 미세튜닝
  · 보상: (redEnergy - blueEnergy) + 승패 보너스(승 +100, 패 -100)
  · 시간 제한(120s/호출) 때문에 iters를 4~8로 잘게 나눠 반복 실행 권장.

- 아이디어/향후 개선
  · 입력에 시계열 스택(직전 3틱)을 추가해 관성/예측력 강화(입력 차원 확장).
  · fireP 게이팅을 부활시키고 BCE 비중을 높여 불필요한 사격 억제(현재는 항상 발사).
  · CEM에 반대표본(antithetic) + sigma schedule 조정, CMA-ES 도입 검토.
  · seeds 수를 점진 증가: 이터 후반에 안정적 일반화.

- 실행 메모(이번 실행)
  · 모방학습 스크립트 출력 차원 버그(5→9) 수정. 이후 모방학습으로 초기화하고 CEM/ES로 미세튜닝 예정.
  · 빠른 실험 예:
    - 모방학습(대규모): `node src/imitation_train.js --matches 40 --ticks 2800 --epochs 10 --batch 256 --lr 0.003 --fast`
    - CEM 튜닝(빠른 러너): `node src/train_cem.js --iters 12 --pop 30 --elite 6 --seeds 4 --ticks 2800 --fast --runner fast --concurrency 8`
    - ES 튜닝(빠른 러너): `node src/train_es.js --iters 20 --pop 60 --sigma 0.2 --alpha 0.06 --seeds 4 --ticks 2800 --concurrency 8 --fast`
  · 추가 개선 제안(다음 번):
    - 네트워크 확장(64-64) 및 seeds 8~12로 안정화.
    - 입력에 시간 스택(직전 2~3틱) 추가. update는 순수 DNN 추론만 수행하도록 유지.
    - 보상 shaping: 생존/가까운 적 피해 가중치 추가(여전히 시뮬레이터 스칼라 보상 기반, 휴리스틱 제어 아님).
