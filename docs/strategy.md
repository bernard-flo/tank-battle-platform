# SUPER6 전략 개요 (v1)

- 목적: tank_battle_platform.html에서 바로 붙여넣어 사용할 6개 휴리스틱 탱크 세트.
- 공통 원칙: 위협 탄 회피(탄 궤적 수직), 리드샷 사격, 벽/충돌 회피 재시도, 작은 난수화.
- PARAMS 주입 대비: 시뮬레이터가 제공하는 `PARAMS`가 없을 경우 기본값으로 동작.

## 01 Tanker Guardian (TANKER)
- 역할: 선두 방패. 아군 중심 정렬 + 근접 적 압박. 짧은 리드샷.
- 주요 파라미터: `ideal_range`, `fire_every_frames`, `orbit_bias`, `bulletSpeed`.
- 흐름: (1) 위협 탄 있으면 수직 회피 → (2) 아군 중심/적 혼합 방향 이동 → (3) 짧은 리드샷.
- 개선: 동적 체력/충돌 반응, 더 정교한 중심 유지.

## 02 Dealer Sniper (DEALER)
- 역할: 장거리 정밀. 체력 낮은 적 우선, 카이팅, 평균속도 리드샷.
- 주요 파라미터: `ideal_range`, `orbit_deg`, `fire_every_frames`, `kite_push`, `bulletSpeed`.
- 흐름: (1) 탄 회피 우선 → (2) 이상거리 유지+오비트 → (3) 리드샷.
- 개선: 사격 타이밍 최적화, 목표 전환 히스테리시스.

## 03 Dealer Flanker (DEALER)
- 역할: 측후방 침투, 원운동. 반경 파형으로 충돌/벽 회피.
- 주요 파라미터: `orbit_range`, `orbit_jitter`, `orbit_deg`, `fire_every_frames`.
- 흐름: (1) 탄 회피 → (2) 목표-법선 ±90° 오비트 + 반경 조절 → (3) 연속 사격.
- 개선: 지형 대응 반경 어댑티브, 오비트 방향 전환 조건 최적화.

## 04 Normal Interceptor (NORMAL)
- 역할: 위협 탄을 점수(접근속도·역거리)로 선별해 회피, 여유 시 반격.
- 주요 파라미터: `evade_weight`, `fire_every_frames`, `bulletSpeed`.
- 흐름: (1) 탄 스코어 최대치 회피 → (2) 타겟 접근 → (3) 리드샷.
- 개선: 다탄 동시 회피, 가중치 동적 조정.

## 05 Normal Support (NORMAL)
- 역할: 아군 중심 정렬, 공통 타겟에 포커스 파이어, 중거리 유지.
- 주요 파라미터: `mid_range`, `align_weight`, `fire_every_frames`.
- 흐름: (1) 아군 중심과 목표 각도 혼합 이동 → (2) 중거리 유지 → (3) 동조 사격.
- 개선: 보호 우선순위(아군 체력/위험도 기반), 라인 유지.

## 06 Tanker Bruiser (TANKER)
- 역할: 전면 압박, 벽-슬라이딩으로 충돌 최소화, 지그재그로 예측 회피.
- 주요 파라미터: `ideal_range`, `strafe_deg`, `fire_every_frames`, `bulletSpeed`.
- 흐름: (1) 목표 방향 압박 + 지그재그 → (2) 간헐적 탄 수직 회피 → (3) 지속 사격.
- 개선: 상황별 지그재그 주기/폭 조정, 각도 최적화.

## 공통 유틸/정책
- 회피: `perpendicularEscapeAngle` 등으로 탄 궤적 법선 방향 이동. 실패 시 ±15° 단계 보정(최대 5회 내).
- 타겟팅: 가까움 → 체력낮음 → 중앙가까움 우선. 리드샷은 최대 각 제한으로 과보정 방지.
- 경계/충돌: 벽 근접 시 평행 이동(슬라이딩) 유도. 이동 실패 시 대안 각도 재시도.
- 난수화: 오비트 방향/발사 각도에 작은 오프셋 적용.

## 시뮬레이터 계획(요약)
- `tools/sim/`에 독립 엔진/로더/CLI/라운드로빈/탐색기 구성.
- `PARAMS` 주입(JSON) → 스니펫 내부에서 fallback 유지.
- 결과물은 `tools/sim/results/` 하위 CSV/JSON으로 일원화.

