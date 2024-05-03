
pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/babyjub.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/escalarmulany.circom";

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

template MulPoint() {
  signal input s;
  signal input px;
  signal input py;
  signal output out[2];

  component pvkBits = Num2Bits(253);
  pvkBits.in <== s;

  component mulFix = EscalarMulAny(253);

  var i;
  for (i=0; i<253; i++) {
      mulFix.e[i] <== pvkBits.out[i];
  }

  mulFix.p[0] <== px;
  mulFix.p[1] <== py;

  out <== mulFix.out;
}
