# NN 기반 탱크 컨트롤러 설계 초안

- 입력(48): self 7, enemy 6×3=18, ally 4×2=8, bullet 5×3=15
- 출력(5): move(cos,sin), fire(cos,sin), fire_prob
- 활성함수: move/fire 벡터는 tanh, fire_prob는 sigmoid
- 전술 차별화:
  - Tanker: 적 추격 가중치↑, 탄 회피 가중치↓
  - Dealer: 탄 회피 가중치↑, 적에 수직 이동(횡이동) 성분 추가
  - Normal: 균형 + 약간의 원운동 성분
- 학습 방안: GA(진화전략)로 가중치 탐색 → 시뮬레이터에서 대전 반복 평가 → 상위 해 선정

TODO
- JS 기반 시뮬레이터(HTML 규칙 준수) 초안 작성
- GA 파이프라인 초안 및 ckpt → result/ai.txt 내보내기 스크립트
