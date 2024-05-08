pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/babyjub.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";
include "./valcommit.circom";

template Output() {

  signal input amount;
  signal input blinding;
  signal input assetGenerator;
  signal input assetIdentifier;
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

  // Ensure asset valuebase is valid hash to curve
  // First hash the assetIdentifier
  component assetHasher = Poseidon(1);
  assetHasher.inputs[0] <== assetIdentifier;
  assetGenerator === assetHasher.out;

  // Then ensure that the value base is correct 
  component aB = BabyPbk();
  aB.in <== assetGenerator;
  Vx === aB.Ax;
  Vy === aB.Ay;

  // Ensure the note commitment is valid
  component commitmentHasher = Poseidon(4);
  commitmentHasher.inputs[0] <== amount;
  commitmentHasher.inputs[1] <== publicKey;
  commitmentHasher.inputs[2] <== blinding;
  commitmentHasher.inputs[3] <== assetGenerator;
  commitment <== commitmentHasher.out;

  // Ensure the value commitment is correct
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
