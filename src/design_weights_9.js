#!/usr/bin/env node
/*
  9-출력 DNN(64-64-9)용 수작업 가중치 초기화 스크립트.
  - 입력 76 구성은 src/generate_dnn_team.js의 buildFeatures와 동일.
  - 최근접 적(e0)의 상대 위치(dx,dy)로 조준 벡터(fx,fy)를 만들고,
    이동 제안은 (1) 타겟을 향한 접근, (2) 타겟에 수직 스트레이프, (3) 반대 방향으로 탈출을 생성.
  - 발사 게이팅은 거리 기반 logit: 2 - 4*dist_norm (가까울수록 사격)
  - update()는 순수 DNN 추론만 사용하며, 휴리스틱 분기 없음.
*/
const fs = require('fs');
const path = require('path');
const { genMLPCode } = require('./generate_dnn_team');

const inputSize = 76;
const H1 = 64;
const H2 = 64;
const outputSize = 9; // [mv1x,mv1y,mv2x,mv2y, fx,fy, fire_logit, mv3x,mv3y]

const L1 = inputSize * H1;
const B1 = H1;
const L2 = H1 * H2;
const B2 = H2;
const L3 = H2 * outputSize;
const B3 = outputSize;
const N = L1 + B1 + L2 + B2 + L3 + B3;
const W = new Float64Array(N); // 기본 0

function w1(i, j, v) { W[i * inputSize + j] = v; }
function b1(i, v) { W[L1 + i] = v; }
function w2(i, j, v) { W[L1 + B1 + i * H1 + j] = v; }
function b2(i, v) { W[L1 + B1 + L2 + i] = v; }
function w3(o, j, v) { W[L1 + B1 + L2 + B2 + o * H2 + j] = v; }
function b3(o, v) { W[L1 + B1 + L2 + B2 + L3 + o] = v; }

// 입력 인덱스(KE=4): self(8) 다음 e0:[dist, dx, dy, ang, hp]
const IDX_E0_DIST = 8;
const IDX_E0_DX = 9;
const IDX_E0_DY = 10;

// 1층: e0의 dx_norm, dy_norm을 -1..+1 범위로 복원하기 위한 양/음 분리 ReLU
// p_dx = relu(dx-0.5), n_dx = relu(0.5-dx)
w1(0, IDX_E0_DX, +1); b1(0, -0.5); // p_dx
w1(1, IDX_E0_DX, -1); b1(1, +0.5); // n_dx
// p_dy, n_dy
w1(2, IDX_E0_DY, +1); b1(2, -0.5); // p_dy
w1(3, IDX_E0_DY, -1); b1(3, +0.5); // n_dy
// dist 그대로 통과
w1(4, IDX_E0_DIST, +1); b1(4, 0);

// 2층: 위 5개를 손실 없이 전달(아이덴티티 매핑)
w2(0, 0, 1); // p_dx -> h2_0
w2(1, 1, 1); // n_dx -> h2_1
w2(2, 2, 1); // p_dy -> h2_2
w2(3, 3, 1); // n_dy -> h2_3
w2(4, 4, 1); // dist  -> h2_4

// 출력 결합
// 복원된 방향 성분: dx_dir = (p_dx - n_dx)*K, dy_dir = (p_dy - n_dy)*K (K는 스케일)
const K_dir = 2.0; // tanh 전 포화 방지용 적당한 스케일
// 조준 벡터(fx, fy): 타겟을 향함
w3(4, 0, +K_dir); w3(4, 1, -K_dir); // fx (index 4)
w3(5, 2, +K_dir); w3(5, 3, -K_dir); // fy (index 5)

// 이동 제안 1(mv1): 타겟을 향해 접근
w3(0, 0, +K_dir*0.8); w3(0, 1, -K_dir*0.8); // mv1x
w3(1, 2, +K_dir*0.8); w3(1, 3, -K_dir*0.8); // mv1y

// 이동 제안 2(mv2): 타겟에 수직(스트레이프) (dx,dy) -> (-dy, +dx)
w3(2, 2, -K_dir*0.8); w3(2, 3, +K_dir*0.8); // mv2x
w3(3, 0, +K_dir*0.8); w3(3, 1, -K_dir*0.8); // mv2y

// 이동 제안 3(mv3): 타겟 반대(후퇴)
w3(7, 0, -K_dir*0.8); w3(7, 1, +K_dir*0.8); // mv3x
w3(8, 2, -K_dir*0.8); w3(8, 3, +K_dir*0.8); // mv3y

// 발사 게이팅: fire_logit = 2 - 4*dist  (가까울수록 발사 확률↑)
w3(6, 4, -4.0); b3(6, 2.0);

// 코드/가중치 저장
const outPathW = path.resolve('result/ai_dnn_weights.json');
const payload = { inputSize, hiddenSizes: [H1, H2], outputSize, weights: Array.from(W) };
fs.writeFileSync(outPathW, JSON.stringify(payload), 'utf8');

const code = genMLPCode({ inputSize, hiddenSizes: [H1, H2], outputSize, weights: W });
const outPathCode = path.resolve('result/ai_dnn_team.txt');
fs.writeFileSync(outPathCode, code, 'utf8');

console.log('[design] wrote initial heuristic-free DNN weights and team code.');

