pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "./valcommit.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/escalarmulany.circom";

template Output() {

  signal input amount;
  signal input blinding;
  signal input assetId;
  signal input assetIdHash;
  signal input publicKey;

  // Value commit
  signal input Vx;
  signal input Vy;
  signal input Rx;
  signal input Ry;
  signal input r;
  signal input Cx;
  signal input Cy;

  // Note commitment
  signal output commitment;

  component commitmentHasher = Poseidon(4);
  commitmentHasher.inputs[0] <== amount;
  commitmentHasher.inputs[1] <== publicKey;
  commitmentHasher.inputs[2] <== blinding;
  commitmentHasher.inputs[3] <== assetIdHash;
  commitment <== commitmentHasher.out;

  component assetHasher = Poseidon(1);
  assetHasher.inputs[0] <== assetId;
  assetHasher.out === assetIdHash;

  component assetVb = BabyGPbk();
  assetVb.in <== assetIdHash;
  Vx === assetVb.Ax;
  Vy === assetVb.Ay;
  
  component valcommit = ValueCommitment();
  valcommit.Vx <== Vx;
  valcommit.Vy <== Vy;
  valcommit.Rx <== Rx;
  valcommit.Ry <== Ry;
  valcommit.v <== amount;
  valcommit.r <== r;
  
  valcommit.out[0] === Cx;
  valcommit.out[1] === Cy;
}

template BabyGPbk() {
    signal input  in;
    signal output Ax;
    signal output Ay;

    var BASE[2] = [
        995203441582195749578291179787384436505546430278305826713579947235728471134,
        5472060717959818805561601436314318772137091100104008585924551046643952123905
    ];

    component pvkBits = Num2Bits(254);
    pvkBits.in <== in;

    component mulFix = EscalarMulFix(254, BASE);

    var i;
    for (i=0; i<254; i++) {
        mulFix.e[i] <== pvkBits.out[i];
    }
    Ax  <== mulFix.out[0];
    Ay  <== mulFix.out[1];
}
