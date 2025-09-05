# Tech of Tank - Import 안내

1) `result/ai.txt` 내용을 전부 복사합니다.
2) `tank_battle_platform.html` 실행 → RED 또는 BLUE의 `Import` 버튼 클릭
3) 뜨는 모달 텍스트 영역에 붙여넣기 → 가져오기
4) 6개 로봇 코드가 각 칸에 자동 분할됩니다.
5) 전투 시작!

참고: `result/ai.txt`는 `scripts/train2.js` 학습으로 자동 갱신됩니다.
- 빠른 재학습: `GENS=8 node scripts/train2.js`
- 더 강한 모델: `GENS=40` 등으로 늘리되, 시간/자원 제약 고려
