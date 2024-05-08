
pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/babyjub.circom";
include "./mulpoint.circom";

template ValueCommitment() {
  signal input v;
  signal input Vx;
  signal input Vy;
  signal input r;
  signal input Rx;
  signal input Ry;
  signal output out[2];  

  component vV = MulPoint();
  vV.s <== v;
  vV.px <== Vx;
  vV.py <== Vy;
  
  component rR = MulPoint();
  rR.s <== r;
  rR.px <== Rx;
  rR.py <== Ry;

  component adder = BabyAdd();
  adder.x1 <== vV.out[0];
  adder.y1 <== vV.out[1];
  adder.x2 <== rR.out[0];
  adder.y2 <== rR.out[1];

  out[0] <== adder.xout;
  out[1] <== adder.yout;
}

