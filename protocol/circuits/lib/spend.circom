
pragma circom 2.0.0;

include "./keypair.circom";

template Spend() {

  signal input privateKey;
  signal input amount;
  signal input blinding;
  signal input asset;
  signal input pathIndex;
  signal input nullifier;
  signal output commitment;

  component keypair = Keypair();
  keypair.privateKey <== privateKey;
  //publicKey <== keypair.publicKey;

  component commitmentHasher = Poseidon(4);
  commitmentHasher.inputs[0] <== amount;
  commitmentHasher.inputs[1] <== keypair.publicKey;
  commitmentHasher.inputs[2] <== blinding;
  commitmentHasher.inputs[3] <== asset;
  commitment <== commitmentHasher.out;

  component sig = Signature();
  sig.privateKey <== privateKey;
  sig.commitment <== commitment;
  sig.merklePath <== pathIndex;

  component nullifierHash = Poseidon(3);
  nullifierHash.inputs[0] <== commitment;
  nullifierHash.inputs[1] <== pathIndex;
  nullifierHash.inputs[2] <== sig.out;
  nullifierHash.out === nullifier;


}
