pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template Output() {

  signal input amount;
  signal input blinding;
  signal input asset;
  signal input publicKey;
  signal output commitment;

  component commitmentHasher = Poseidon(4);
  commitmentHasher.inputs[0] <== amount;
  commitmentHasher.inputs[1] <== publicKey;
  commitmentHasher.inputs[2] <== blinding;
  commitmentHasher.inputs[3] <== asset;
  commitment <== commitmentHasher.out;
}
