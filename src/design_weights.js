#!/usr/bin/env node
/*
  DNN 가중치(64-64-5)를 수작업으로 설계하여, 최근접 적을 조준하고(출력 fx,fy),
  이동은 목표에 수직 방향(스트레이프)으로 하도록 설정합니다. 발사는 거리 기반 게이팅(sigmoid(2-4*dist)).
  - update 함수는 순수 MLP 추론만 사용하며, 본 스크립트는 가중치 초기화/설계 용도입니다.
*/
const fs = require('fs');
const path = require('path');

const inputSize = 76;
const H1 = 64;
const H2 = 64;
const outputSize = 5; // [mvx, mvy, fx, fy, fire_logit]

const L1 = inputSize * H1;
const B1 = H1;
const L2 = H1 * H2;
const B2 = H2;
const L3 = H2 * outputSize;
const B3 = outputSize;
const N = L1 + B1 + L2 + B2 + L3 + B3;

const W = new Float64Array(N); // 0으로 초기화

function w1(i, j, v) { W[i * inputSize + j] = v; }
function b1(i, v) { W[L1 + i] = v; }
function w2(i, j, v) { W[L1 + B1 + i * H1 + j] = v; }
function b2(i, v) { W[L1 + B1 + L2 + i] = v; }
function w3(o, j, v) { W[L1 + B1 + L2 + B2 + o * H2 + j] = v; }
function b3(o, v) { W[L1 + B1 + L2 + B2 + L3 + o] = v; }

// 입력 인덱스: self(8), e0: dist(8), dx(9), dy(10), ang(11), hp(12)
const IDX_E0_DIST = 8;
const IDX_E0_DX = 9;
const IDX_E0_DY = 10;

// 1층: dx, dy의 양/음 분리(p/n), 거리(dist) 통과
// p_dx = relu(dx-0.5), n_dx = relu(0.5-dx)
w1(0, IDX_E0_DX, 1); b1(0, -0.5);
w1(1, IDX_E0_DX, -1); b1(1, 0.5);
// p_dy, n_dy
w1(2, IDX_E0_DY, 1); b1(2, -0.5);
w1(3, IDX_E0_DY, -1); b1(3, 0.5);
// dist 통과
w1(4, IDX_E0_DIST, 1); b1(4, 0);

// 2층: 위 값들을 손실 없이 전달(아이덴티티)
w2(0, 0, 1); // p_dx -> h2_0
w2(1, 1, 1); // n_dx -> h2_1
w2(2, 2, 1); // p_dy -> h2_2
w2(3, 3, 1); // n_dy -> h2_3
w2(4, 4, 1); // dist  -> h2_4

// 출력: mvx, mvy, fx, fy, fire_logit
// fx = 2*(p_dx - n_dx), fy = 2*(p_dy - n_dy)
w3(2, 0, +2); w3(2, 1, -2);
w3(3, 2, +2); w3(3, 3, -2);

// mvx = -2*(p_dy - n_dy), mvy = +2*(p_dx - n_dx)  (목표에 수직 스트레이프)
w3(0, 2, -2); w3(0, 3, +2);
w3(1, 0, +2); w3(1, 1, -2);

// fire_logit = 2 - 4*dist  (가까울수록 발사 확률 증가)
w3(4, 4, -4); b3(4, 2);

const outPathW = path.resolve('result/ai_dnn_weights.json');
const payload = { inputSize, hiddenSizes: [H1, H2], outputSize, weights: Array.from(W) };
fs.writeFileSync(outPathW, JSON.stringify(payload), 'utf8');

// 팀 코드 생성 및 저장
const { genMLPCode } = require('./generate_dnn_team');
const code = genMLPCode({ inputSize, hiddenSizes: [H1, H2], outputSize, weights: W });
const outPathCode = path.resolve('result/ai_dnn_team.txt');
fs.writeFileSync(outPathCode, code, 'utf8');

console.log('Wrote designed weights and team code.');

