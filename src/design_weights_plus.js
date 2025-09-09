#!/usr/bin/env node
/*
  향상된 설계형 DNN 가중치 생성기 (입력 76, 히든 64-64, 출력 9)
  - genMLPCode(features76)와 호환
  - 사용 특징: e0(가장 가까운 적)의 dx/dy/거리, b0(가장 가까운 탄)의 dx/dy/거리/속도, 탄 수
  - 행동 설계(순수 DNN):
    · mv1: 타겟 접근 + 탄 회피(가까운 탄 반대 방향 + 탄속 반대)
    · mv2: 타겟 수직 스트레이프 + 약한 탄 회피
    · mv3: 타겟 반대(후퇴) + 탄 회피
    · fire: 타겟 방향, fire_logit = 3 - 5*dist_e0 - 1.5*bulletCount
  - update()는 MLP 추론만 사용(휴리스틱 분기 없음)
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
const W = new Float64Array(N); // 기본 0으로 초기화

function w1(i, j, v) { W[i * inputSize + j] = v; }
function b1(i, v) { W[L1 + i] = v; }
function w2(i, j, v) { W[L1 + B1 + i * H1 + j] = v; }
function b2(i, v) { W[L1 + B1 + L2 + i] = v; }
function w3(o, j, v) { W[L1 + B1 + L2 + B2 + o * H2 + j] = v; }
function b3(o, v) { W[L1 + B1 + L2 + B2 + L3 + o] = v; }

// 입력 인덱스 매핑(features76):
// self 0..7 (미사용)
// enemies e0: baseE = 8, [d, dx01, dy01, ang(-1..1), hp]
const E0_D = 8;
const E0_DX01 = 9;
const E0_DY01 = 10;
// allies: 28..42 (미사용)
// bullets b0: baseB = 43, [d, dx01, dy01, ang, vx01, vy01]
const B0_D = 43;
const B0_DX01 = 44;
const B0_DY01 = 45;
const B0_VX01 = 47;
const B0_VY01 = 48;
// stats: enemiesCount(73), alliesCount(74), bulletsCount(75)
const BUL_CNT = 75;

// 1층: 양/음 분리 ReLU로 방향 벡터 복원(0.5 중심)
// e0 dx/dy
w1(0, E0_DX01, +1); b1(0, -0.5); // e0_pdx
w1(1, E0_DX01, -1); b1(1, +0.5); // e0_ndx
w1(2, E0_DY01, +1); b1(2, -0.5); // e0_pdy
w1(3, E0_DY01, -1); b1(3, +0.5); // e0_ndy
// e0 dist 통과
w1(4, E0_D, +1); b1(4, 0);

// b0 dx/dy 분리 (탄 반대 방향 = (n - p))
w1(5, B0_DX01, +1); b1(5, -0.5); // b0_pdx
w1(6, B0_DX01, -1); b1(6, +0.5); // b0_ndx
w1(7, B0_DY01, +1); b1(7, -0.5); // b0_pdy
w1(8, B0_DY01, -1); b1(8, +0.5); // b0_ndy
// b0 dist
w1(9, B0_D, +1);
// b0 vx/vy 분리(0.5 중심)
w1(10, B0_VX01, +1); b1(10, -0.5); // b0_pvx
w1(11, B0_VX01, -1); b1(11, +0.5); // b0_nvx
w1(12, B0_VY01, +1); b1(12, -0.5); // b0_pvy
w1(13, B0_VY01, -1); b1(13, +0.5); // b0_nvy
// bullet count
w1(14, BUL_CNT, +1);

// 2층: 위 특징을 그대로 전달(아이덴티티)
for (let i = 0; i <= 14; i++) w2(i, i, 1);

// 출력 결합 상수
const KE = 2.0;         // e0 방향 스케일
const KB = 2.5;         // 탄 회피 스케일(강)
const KBv = 0.8;        // 탄속 반대 스케일(보조)
const KS = 1.6;         // 스트레이프 스케일

// 유틸: (p-n) = 방향, (n-p) = 반대방향
function addVec(oIndex, srcP, srcN, scale){ w3(oIndex, srcP, +scale); w3(oIndex, srcN, -scale); }
function addOpp(oIndex, srcP, srcN, scale){ w3(oIndex, srcP, -scale); w3(oIndex, srcN, +scale); }

// fire 방향: 타겟 향함 (fx, fy)
addVec(4, 0, 1, KE);   // fx = (e0_pdx - e0_ndx)*KE
addVec(5, 2, 3, KE);   // fy = (e0_pdy - e0_ndy)*KE

// fire 확률: 3 - 5*dist_e0 - 1.5*bulletCount
w3(6, 4, -5.0);
w3(6, 14, -1.5);
b3(6, 3.0);

// mv1: e0 접근 + 탄 회피 + 탄속 반대
addVec(0, 0, 1, KE*0.9);    // mv1x toward enemy
addVec(1, 2, 3, KE*0.9);    // mv1y
addOpp(0, 5, 6, KB*1.0);    // away from bullet x
addOpp(1, 7, 8, KB*1.0);    // away from bullet y
addOpp(0, 10, 11, KBv);     // against bullet vx
addOpp(1, 12, 13, KBv);     // against bullet vy

// mv2: 수직 스트레이프 + 약한 탄 회피
addVec(2, 2, 3, -KS);       // mv2x = -dy
addVec(3, 0, 1, +KS);       // mv2y = +dx
addOpp(2, 5, 6, KB*0.6);
addOpp(3, 7, 8, KB*0.6);

// mv3: e0 반대(후퇴) + 탄 회피(강)
addVec(7, 0, 1, -KE*0.9);   // -dx
addVec(8, 2, 3, -KE*0.9);   // -dy
addOpp(7, 5, 6, KB*1.2);
addOpp(8, 7, 8, KB*1.2);
addOpp(7, 10, 11, KBv);
addOpp(8, 12, 13, KBv);

// 코드/가중치 저장
const payload = { inputSize, hiddenSizes: [H1, H2], outputSize, weights: Array.from(W) };
fs.writeFileSync(path.resolve('result/ai_dnn_weights.json'), JSON.stringify(payload), 'utf8');
const code = genMLPCode({ inputSize, hiddenSizes: [H1, H2], outputSize, weights: W });
fs.writeFileSync(path.resolve('result/ai_dnn_team.txt'), code, 'utf8');
console.log('[design+]: wrote improved DNN weights and team code.');

