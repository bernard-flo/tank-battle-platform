다음 실행 참고 메모

- 목표: reference-ai.txt를 안정적으로 이기거나 최소 에너지/생존 우위를 확보.
- 정책: MLP(입력 64, 히든 64-64, 출력 9). update()는 tank/enemies/allies/bulletInfo 전체를 피처화하여 순수 DNN으로만 발사/이동 결정. 휴리스틱 미사용.
- 타입 조합: [NORMAL, DEALER, TANKER, DEALER, TANKER, DEALER] 고정.

학습 계획(CEM)
- 커맨드 예시(짧은 러닝): `node src/train_cem.js --iters 6 --pop 36 --elite 0.25 --seeds 0,1,2,3 --maxTicks 3200`
- 장시간 러닝: iters 20~, pop 80~120, seeds 8~12로 증가. sigma는 0.5→0.2로 점감 권장.
- 점수: 승리 +1000, 생존차*100, 에너지 차 합산.

실행 기록(이번 실행)
- 생성기/학습기 추가 완료. 초기 무작위 가중치로 팀 코드 생성 가능.
- 다음 실행에서 CEM으로 최적화 후 결과 반영 예정.

참고
- 결과물은 result/ai_dnn_team.txt, 가중치는 result/ai_dnn_weights.json에 저장. tank_battle_platform.html에서 Import 가능.
- 시뮬레이터 빠른 비교: `node simulator/cli.js --red result/ai_dnn_team.txt --blue result/reference-ai.txt --repeat 30 --fast --concurrency 6`
