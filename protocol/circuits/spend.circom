pragma circom 2.0.0;

include "./lib/spend.circom";

component main { public [nullifier] } = Spend(5);
