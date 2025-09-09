#!/usr/bin/env bash
set -euo pipefail

# 간편 자동 학습 루프
# - 타임아웃 회피를 위해 10회 반복씩 끊어서 여러 번 실행
# - 각 스텝 후 결과물은 result/에 저장되며, 별도 커밋은 호출자가 수행

ITERS=${ITERS:-10}
ROUNDS=${ROUNDS:-5}
POP=${POP:-12}
SEEDS=${SEEDS:-1}
SIGMA=${SIGMA:-0.35}
LR=${LR:-0.2}
MAXTICKS=${MAXTICKS:-2000}

echo "[auto-train] rounds=${ROUNDS} iters=${ITERS} pop=${POP} seeds=${SEEDS} sigma=${SIGMA} lr=${LR} maxTicks=${MAXTICKS}"

for ((r=1; r<=ROUNDS; r++)); do
  echo "[auto-train] round ${r}/${ROUNDS}"
  DNN_ITERS=${ITERS} DNN_POP=${POP} DNN_SEEDS=${SEEDS} DNN_SIGMA=${SIGMA} DNN_LR=${LR} DNN_MAXTICKS=${MAXTICKS} \
    node "$(dirname "$0")/train_dnn.js"
done

echo "[auto-train] done. artifacts in ./result"

