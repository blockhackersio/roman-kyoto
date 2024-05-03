
pragma circom 2.0.0;

include "./keypair.circom";

template Spend() {

  signal input privateKey;
  signal output publicKey;

  component inKeypair = Keypair();
  inKeypair.privateKey <== privateKey;

  publicKey <== inKeypair.publicKey;
}
