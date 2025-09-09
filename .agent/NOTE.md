다음 실행 참고 메모

- 목표: reference-ai.txt를 안정적으로 이기거나 최소 에너지/생존 우위를 확보.
- 정책: MLP(입력 64, 히든 64-64, 출력 9). update()는 tank/enemies/allies/bulletInfo 전체를 피처화하여 순수 DNN으로만 발사/이동 결정. 휴리스틱 미사용.
- 타입 조합: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER] 고정.

학습 계획(CEM)
- 커맨드 예시(짧은 러닝): `node src/train_cem.js --iters 6 --pop 36 --elite 0.25 --seeds 0,1,2,3 --maxTicks 3200`
- 장시간 러닝: iters 20~, pop 80~120, seeds 8~12로 증가. sigma는 0.5→0.2로 점감 권장.
- 점수: 승리 +1000, 생존차*100, 에너지 차 합산.

실행 기록(이번 실행)
- 팀 코드 재생성(무작위) → reference와 대결 테스트(무승부 다수, 지표 열세)
- 범용 genMLPCode 추가(입력76/출력9), 설계형 가중치 생성 → 성능 열세 확인
- 모방학습 8경기×1600틱×3epoch 수행 → 대결 성능 여전히 열세
- ES 빠른 학습(4×24×seeds3@2500틱) 1회 수행 → 팀/가중치 갱신, 추가 장기 학습 필요

참고
- 결과물은 result/ai_dnn_team.txt, 가중치는 result/ai_dnn_weights.json에 저장. tank_battle_platform.html에서 Import 가능.
- 현재 성능은 reference-ai 대비 열세. 장시간 ES 학습 반복 권장.
- 빠른 비교: `node simulator/cli.js --red result/ai_dnn_team.txt --blue result/reference-ai.txt --repeat 60 --fast --concurrency 8 --maxTicks 3500`

다음 실행 제안
- ES 장기 러닝 2~3회 반복하여 승률 개선 목표(각 15~30분 권장):
  `node src/train_es.js --iters 20 --pop 80 --sigma 0.2 --alpha 0.05 --seeds 8 --ticks 3600 --concurrency 8 --fast`
- 필요 시 모방학습 데이터 추가 수집(매치/틱 증가) 후 재학습 → ES 미세 조정
