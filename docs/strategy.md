# SUPER6 전략 개요 (v1)

- 목적: tank_battle_platform.html에서 사용할 6개 탱크 휴리스틱 MVP 세트
- 공통 규칙: name/type/update 3함수, 외부 전역 접근 금지, 탄 회피는 속도 벡터 수직 이동 우선

## 공통 유틸/정책
- 유틸: clamp, angleTo, dist, leadAngle(간단 섭동 포함)
- 회피: bulletInfo에서 위협 점수(접근속도·역거리) 최대 탄 선택 → 궤적 법선(+90°)으로 이동, 실패 시 ±10~15° 보정 10회
- 타겟팅: 가까움 → 체력 낮음 → 중앙 가까움 우선(파일별 약간 다름), 리드샷 사격, 소량 난수화로 예측 회피
- 경계/충돌: `tank.move(ang)` 연속 호출로 대체각 시도(플랫폼 10회 제한 고려)

## 01 Tanker Guardian (TANKER)
- 역할: 선두 방패, 팀 중심 유지, 최근접 적 추적
- 회피: 위협 탄 법선 이동(보스턴 회피)
- 사격: 짧은 리드샷, 이동은 ideal_range 수렴

## 02 Dealer Sniper (DEALER)
- 역할: 장거리 정밀 사격, 카이팅, 큰 오비트
- 타겟: 가장 체력 낮은 적
- 회피: 탄 우선 회피, 사격 쿨(간단 프레임 타이머)

## 03 Dealer Flanker (DEALER)
- 역할: 측후방 진입 후 ±90° 원운동, 반경 주기 조절
- 사격: 연속 사격, 소량 지터

## 04 Normal Interceptor (NORMAL)
- 역할: 위협 탄 차단 회피 + 반격
- 점수: 접근속도·역거리, 여유 시 최근접 적 리드샷

## 05 Normal Support (NORMAL)
- 역할: 아군 중심 보호, 포커스 파이어 동조, 중거리 유지
- 공동 타겟: 아군 중심에서 가장 가까운 적

## 06 Tanker Bruiser (TANKER)
- 역할: 전면 압박, 벽-슬라이딩(가벼운 평행 각), 지그재그 회피, 지속 사격

## 주요 파라미터(초기값)
- ideal_range: 180~350 (역할별 다름)
- orbit_deg: 25~90, radius/radius_jitter: 160~220 / 20~60
- fire_every: 4~7 프레임(엔진 가정치)
- strafe_deg: 12~22
- bulletSpeed: 400(px/s) — 엔진에서는 프레임 단위로 주입(호환용 기본값 유지)

## 개선 여지
- 각 파라미터를 외부 JSON(params)에서 주입해 탐색(beam/GA)으로 자동 튜닝
- 탄/벽/탱크 충돌 정밀 모델 기반 회피 보정
- 아군 간 역할 분담(타겟 share/avoid), 포메이션 유지

