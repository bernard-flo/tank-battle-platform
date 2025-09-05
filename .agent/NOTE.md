# 개발 메모 (AI 탱크 팩)

- 목적: tank_battle_platform.html의 Import 기능으로 붙여넣을 수 있는 6개 탱크 코드 세트(`/result/ai.txt`) 유지/개선.
- 제약: HTML은 수정 금지. 사용자 코드 샌드박스에서는 `window/document` 미노출, `Type` 상수만 제공. 표준 `Math`는 사용 가능.
- 인터페이스:
  - `function name()`: 표시명.
  - `function type()`: `Type.NORMAL | Type.TANKER | Type.DEALER` 반환.
  - `function update(tank, enemies, allies, bulletInfo)`:
    - `tank`: 제한 API `{move(angle), fire(angle), x,y,health,energy,type,size}`.
    - `enemies/allies`: 불변 스냅샷. 각 원소에 `x,y,distance,angle?,health` 등.
    - `bulletInfo`: 적 총알 `{x,y,vx,vy,distance}`.
- 현재 구조: 각 탱크는 동일한 MLP 전방향 패스를 사용(입력 16, 은닉 6, 출력 5). 출력 의미:
  - [0..3] = 이동 벡터 가중치(회피/추적/공전/벽회피)를 softmax-정규화 비율로 사용.
  - [4] = 사격 리드 각도(도 단위, [-14, 18] 클램프).
- 특징량: 자기 위치정규화, 체력, 타입 one-hot, 최근접 적 정보, 적/아군 중심, 총알 위협, 벽 회피 벡터 등.
- 역할별 편향: `DEALER`는 추적/공전, `TANKER`는 벽/안정, `NORMAL`은 균형. 이는 `W2/b2` 스케일링으로 주입.
- 개선 아이디어:
  - 리드각을 적 속도 추정으로 보정(현재는 MLP 출력 기반).
  - 타깃 선택: 체력/거리/집중포화 점수로 스코어링.
  - GA/ES로 가중치 탐색(셀프플레이), 최적 세트 자동 갱신 파이프라인.
  - 타입 조합 최적화: 2 Tanker + 3 Dealer + 1 Normal 등 변이 탐색.

파일: `result/ai.txt`를 계속 최신 최적 세트로 유지.
