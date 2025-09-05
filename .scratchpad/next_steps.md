# Next Steps
- train2.js 경로 정리: outPath를 프로젝트 `result/ai.txt`로 확정 (`process.cwd()` 기반) 수정
- 더 다양한 상대(RL curriculum): baseline 이외 mirror/self-play, 랜덤 가중치 패키지, 과거 최적 상대로 평가
- MLP 확장: 출력에 fire decision 확률/threshold 추가, 팀 전술 신호(feature) 도입
- GPU 사용 시 배치 시뮬 확장 (현재는 CPU로도 충분)
- HTML 플랫폼에 import 시 문서화된 구분자와 포맷 유지하도록 체크
