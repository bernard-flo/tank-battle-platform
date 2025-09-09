다음 실행 참고 메모

- 목표: reference-ai.txt를 상대로 안정적 우세 달성(최소 승률/에너지 우위 확보).
- 현재 정책: 공유 MLP(입력 76, 히든 64-64, 출력 9: [mv1x,mv1y,mv2x,mv2y, fx,fy, fire_logit, mv3x,mv3y])
  · 피처: tank(자기 상태), enemies/allies 최근접 K, bulletInfo 최근접 K, 전역 통계.
  · 액션: DNN 출력만으로 fireAngle/moveAngles 산출. move는 최대 3회 시도(mv1→mv2→mv3). 휴리스틱 없음.
- 학습: (1) 모방학습으로 초기화(레퍼런스 행동 수집→Adam 4 epoch) → (2) CEM/ES로 미세튜닝 반복
  · 보상: (redEnergy - blueEnergy) + 승패 보너스(승 +100, 패 -100)
  · 시간 제한(120s/호출) 때문에 iters를 2~3 단위로 쪼개어 여러 번 호출 권장.

- 아이디어/향후 개선
  · 입력에 시계열 스택(직전 3틱)을 추가해 관성/예측력 강화(입력 차원 확장).
  · fireP 게이팅을 부활시키고 BCE 비중을 높여 불필요한 사격 억제(현재는 항상 발사).
  · CEM에 반대표본(antithetic) + sigma schedule 조정, CMA-ES 도입 검토.
  · seeds 수를 점진 증가: 이터 후반에 안정적 일반화.

-- 실행 메모(이번 실행)
  · 파이프라인 고정: DNN 코드 생성기 + ES/CEM + 모방학습 스크립트 사용.
  · 모방학습(8매치×4epoch)으로 초기화 → ES(여러 번 쪼개서 총 5 iters) → CEM(2 iters) 실행. 모든 산출물 저장/커밋.
  · 빠른 실험 예(짧은 러닝 타임 버전):
    - 모방학습(빠름): `node src/imitation_train.js --matches 8 --ticks 1800 --epochs 4 --batch 256 --lr 0.003 --fast`
    - CEM 튜닝(소규모): `node src/train_cem.js --iters 4 --pop 24 --elite 6 --seeds 3 --ticks 2400 --fast --concurrency 8`
    - ES 튜닝(단계적): `node src/train_es.js --iters 2 --pop 30 --sigma 0.25 --alpha 0.07 --seeds 3 --ticks 2600 --concurrency 8 --fast`
  · 평가(예시 커맨드): `node src/eval_vs_reference.js --count 60 --start 3000 --maxTicks 3500 --fast`
  · 현재 수치(이번 실행 직후):
    - 모방학습(Ref 기반) 초기화 후 10 seeds: 0W/0L/10D, 평균 에너지 Red 330, Blue 575.
    - ES 2 iters(pop 40, ticks 2800) → CEM 4 iters(pop 40, ticks 3200) 후 20 seeds: 0W/0L/20D, 평균 에너지 Red 330, Blue 598.
    - 모방학습(Teacher 기반) 12매치×6epoch 후 20 seeds: 0W/20L/0D, 평균 틱 623.
    - 설계형 가중치(design_weights_9) 후 20 seeds: 0W/20L/0D, 평균 틱 357.

  · 추가 개선 제안(다음 번):
    - seeds를 8~12로 증가, pop 60~80, iters 20+로 장기 러닝.
    - 입력에 시간 스택(직전 2~3틱) 추가. update는 여전히 순수 DNN 추론.
    - fireP 게이팅 재활성화를 고려(sigmoid out[6] 기준)해 무의미 사격 감소.
    - 보상에 생존/가까운 적 피해 등 완만한 shaping 추가(정책은 DNN만 사용).
    - Teacher 모방 초기화: src/teacher_ai.txt를 --teacher로 지정해 행동 수집 후 초기화, 이후 CEM로 미세튜닝.

실행 메모(이번 실행)
- generate_dnn_team.js: DNN-only 정책 생성(입력 전 파라미터 사용). 발사 게이팅(out.fireP>0.5).
- imitation_train: Ref 기반(8×2500틱, 4epoch), Teacher 기반(12×2600틱, 6epoch) 각각 시도.
- train_es: 2 iters(pop 40, seeds 3~4, ticks 2800~3200) 여러 번 → 점수 정체.
- train_cem: 4 iters(pop 40, elite 8, seeds 3, ticks 3200) → 점수 정체.
- design_weights_9: 목표지향 가중치 임베드 → 단기 성능 저조.

다음 실행 제안
- compute 확대 시: CEM 20+ iters(pop 120, elite 24, seeds 8, ticks 3600) 또는 ES 누적 러닝을 여러 번 반복.
- 입력 개선: 시간 스택(직전 2~3틱) 추가하여 동적 회피/추격 성능 향상(정책은 여전히 DNN-only).
- 보상 shaping(학습용): 생존/근접 피해/총알 회피 등의 완만한 항 추가(실행 정책은 DNN-only 유지).
- 최종 검증: `node src/eval_vs_reference.js --count 200 --start 9000 --maxTicks 3500 --fast`로 통계적 우세 확인.
