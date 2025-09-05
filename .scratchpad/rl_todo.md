RL/튜닝 파이프라인 TODO

1) 시뮬레이터 분리
- tank_battle_platform.html의 핵심 로직(타입별 스펙, Tank.move/fire, 총알 충돌)을 Node 환경으로 이식
- DOM 의존 제거, 랜더링 제거, 시간은 고정 timestep으로 진행

2) AI 인터페이스 어댑터
- ai.txt 포맷 그대로 eval하여 name/type/update 함수를 가져오기
- 안전을 위해 샌드박스: 제공되는 API와 관측치만 전달

3) 보상 설계
- 승패 + 생존 수 + 누적 데미지 + 아군 피해 0 유지 보너스
- timestep penalty로 소극적 플레이 방지

4) 탐색 전략
- 진화전략(ES): 가중치에 가우시안 노이즈, 상위 elite 보존
- 랜덤 탐색(초기), CMA-ES(가능하면)

5) 저장/재개
- .scratchpad/weights/에 세대별 상위 모델 저장(JSON)
- result/ai.txt는 항상 현재 최고 조합으로 갱신

6) 검증
- 내전(Self-play) + 랜덤 봇 + 기본 제공 디폴트 봇과 교차전
- 각 타입별 시드 다양화로 과적합 방지

7) GPU 사용(옵션)
- 현재는 단층 NN이므로 CPU로 충분, 추후 PyTorch/ONNX 연결 고려

메모
- 입력 48 → 은닉층 추가 고려(예: 32 ReLU) → 출력 5, 다만 플랫폼에선 JS로 실행되므로 계산량 최소화 필요
