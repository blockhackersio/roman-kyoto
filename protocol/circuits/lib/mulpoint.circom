pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/babyjub.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/escalarmulany.circom";

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
