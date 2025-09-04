# SUPER6 전략 요약 (v1)

본 문서는 tank_battle_platform.html에서 사용 가능한 6개 탱크 스니펫의 목적, 주요 파라미터, 의사결정 흐름, 개선 여지를 요약합니다. 각 스니펫은 외부 전역 접근 없이 유틸을 내장하며, PARAMS 주입이 없을 때도 합리적 기본값으로 동작합니다.

## 공통 유틸/규칙
- 유틸: `clamp`, `dist`, `angleTo`, `leadAngle`, `normAng` 내장.
- 회피: `bulletInfo`에서 가장 위협적인 탄(접근속도·역거리 가중) 선택 → 탄 궤도 수직 방향으로 이동. 실패 대비 ±15° 보정 최대 10회.
- 타겟팅: 가까움 → 체력 낮음 → 중앙 근접 순으로 우선. 리드샷(`leadAngle`) 사용, `leadMaxDeg`로 과리드 제한.
- 경계/충돌: 벽 안전 마진(`safeMargin`) 반영, 가장자리에서 안쪽/접선 방향 보정.
- 난수화: 소폭 `aimJitterDeg`, 오비트 방향 주기적 플립.
- PARAMS: 엔진이 `PARAMS`를 주입하면 값을 우선 사용하고, 없으면 기본값 사용.

기본(가정) 상수: `WIDTH=800, HEIGHT=600, bulletSpeed=400, safeMargin=24, evadeReactDist≈200~220` 등.

## 01 Tanker Guardian (Type.TANKER)
- 목적: 선두 방패. 아군 중심 근처에서 전열 유지, 위협 탄 우선 회피.
- 이동: 위협 탄 수직 회피 > 아군 중심을 향해 정렬.
- 사격: 최근접 적 우선, 체력/중앙 보정, 짧은 리드샷(과리드 제한).
- 파라미터: `leadMaxDeg`, `evadeReactDist`, `aimJitterDeg`.

## 02 Dealer Sniper (Type.DEALER)
- 목적: 장거리 정밀 사격 및 카이팅. 생존 우선.
- 이동: 위협 탄 회피 > 대상과의 이상 반경(`ideal_range`) 유지 + 넓은 오비트, 가끔 방향 플립.
- 사격: 가장 체력 낮은 적 우선, 리드샷. 간단 틱 기반 쿨다운.
- 파라미터: `ideal_range`, `leadMaxDeg`, `aimJitterDeg`, `orbitFlipRate`, `fire_every_frames`.

## 03 Dealer Flanker (Type.DEALER)
- 목적: 측후방 침투, 타겟의 법선 ±90° 원운동, 반경 펌핑으로 회피/충돌 최소화.
- 이동: 위협 탄 회피 > `orbit_deg`만큼 법선 진행, `radius_pulse`로 반경 조절.
- 사격: 짧은 간격 연속 사격, 리드샷.
- 파라미터: `orbit_deg`, `orbit_radius`, `radius_pulse`, `leadMaxDeg`, `fire_every_frames`.

## 04 Normal Interceptor (Type.NORMAL)
- 목적: 탄 차단 회피와 반격의 균형. 위협 탄 우선 회피.
- 이동: 위협 탄 수직 회피 > 최근접 대상과의 160px 전후 유지.
- 사격: 리드샷, 간단 틱 쿨다운.
- 파라미터: `evadeReactDist`, `leadMaxDeg`, `aimJitterDeg`, `fire_every_frames`.

## 05 Normal Support (Type.NORMAL)
- 목적: 아군 중심 중거리 유지, 각도 정렬로 포커스 파이어 동조.
- 이동: 위협 탄 회피 > 아군 중심 정렬 + 대상 거리 보정.
- 사격: 아군 중심에 가까운 적 + 체력 낮은 적에 리드샷.
- 파라미터: `support_mid_range`, `align_weight`, `leadMaxDeg`, `aimJitterDeg`.

## 06 Tanker Bruiser (Type.TANKER)
- 목적: 전면 압박, 벽-슬라이딩으로 충돌 최소화, 지그재그 예측 회피.
- 이동: 위협 탄 회피 > 중근거리 유지 + `strafe_deg`로 지그재그.
- 사격: 지속 사격(틱 간격), 리드샷.
- 파라미터: `bruiser_mid_range`, `strafe_deg`, `leadMaxDeg`, `aimJitterDeg`.

## 개선 여지(다음 루프)
- 엔진 PARAMS 주입과 프리셋 폴더 연동, 빔/GA 탐색 스크립트로 파라미터 자동 튜닝.
- 회피 강도/반경/오비트 각도 등 JSON화 및 시뮬 결과 기반 업데이트.
- 충돌 판정/쿨다운/데미지 모델에 맞춘 리드샷 시간 스케일 조정.

