다음 실행 참고 메모

- 목표: reference-ai.txt를 안정적으로 이기거나 최소 에너지/생존 우위를 확보.
- 정책: MLP(입력 64, 히든 64-64, 출력 9). update()는 tank/enemies/allies/bulletInfo 전체를 피처화하여 순수 DNN으로만 발사/이동 결정. 휴리스틱 미사용.
- 타입 조합: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER] 고정.

학습 계획(CEM)
- 커맨드 예시(짧은 러닝): `node src/train_cem.js --iters 6 --pop 36 --elite 0.25 --seeds 0,1,2,3 --maxTicks 3200`
- 장시간 러닝: iters 20~, pop 80~120, seeds 8~12로 증가. sigma는 0.5→0.2로 점감 권장.
- 점수: 승리 +1000, 생존차*100, 에너지 차 합산.

실행 기록(이번 실행)
- 설계형 초기화(design_weights_plus) → 50전 0승(평균 틱 감소, 블루 에너지 우위).
- 모방학습 30매치·10에폭 → 50전 0승.
- ES 1회 이터레이션(pop=40, seeds=4, ticks=2600) → 20전 전부 무승부(에너지는 블루 우위).
- 결론: 장시간 ES 튜닝/모방 데이터 확대가 필요. 현재 팀 코드는 HTML에서 정상 동작하며 DNN만으로 update 수행.

참고
- 결과물은 result/ai_dnn_team.txt, 가중치는 result/ai_dnn_weights.json에 저장. tank_battle_platform.html에서 Import 가능.
- 빠른 비교: `node simulator/cli.js --red result/ai_dnn_team.txt --blue result/reference-ai.txt --repeat 200 --fast --concurrency 8 --maxTicks 4000`

다음 실행 제안(성능 개선 루프)
- ES 장기 러닝을 2~3세트 반복(각 30~60분 예상):
  `node src/train_es.js --iters 30 --pop 120 --sigma 0.18 --alpha 0.06 --seeds 8 --ticks 3600 --concurrency 8 --fast`
  · 빠른 탐색(짧게): `--iters 10 --pop 60 --seeds 6 --ticks 3000`
- CEM 보조 탐색(중간 저장 재개 권장):
  `node src/train_cem.js --iters 20 --pop 80 --elite 0.25 --seeds 0,1,2,3,4 --maxTicks 3200`
- 모방학습 데이터 확대(레퍼런스/teacher 혼합) 후 ES 미세 조정:
  `node src/imitation_train.js --matches 120 --ticks 2600 --epochs 20 --fast --teacher result/reference-ai.txt`

검증 체크리스트
- tank_battle_platform.html에서 result/ai_dnn_team.txt 불러오기 → 6로봇 표시 확인.
- 타입 순서: NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER.
- update는 tank/enemies/allies/bulletInfo 모두 사용(DNN 피처 구성 내부 확인).

메모
- update(tank, enemies, allies, bulletInfo) 전 파라미터를 모두 사용한 DNN 추론만 적용(휴리스틱 없음).
- 타입 순서 고정: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER].
- 성능 개선을 위해 ES 장기 학습 또는 더 많은 모방 샘플 필요.
