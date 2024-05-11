
pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "./valcommit.circom";
include "./babygpbk.circom";

template BridgeOut() {

  signal input amount;
  signal input assetId;

  // Value commit
  signal input Vx;
  signal input Vy;
  signal input Rx;
  signal input Ry;
  signal input r;
  signal output Cx;
  signal output Cy;

  component assetHasher = Poseidon(1);
  assetHasher.inputs[0] <== assetId;

  component assetVb = BabyGPbk();
  assetVb.in <== assetHasher.out;
  Vx === assetVb.Ax;
  Vy === assetVb.Ay;
  
  component valcommit = ValueCommitment();
  valcommit.Vx <== Vx;
  valcommit.Vy <== Vy;
  valcommit.Rx <== Rx;
  valcommit.Ry <== Ry;
  valcommit.v <== amount;
  valcommit.r <== r;
  
  Cx <== valcommit.out[0];
  Cy <== valcommit.out[1];
}


