
pragma circom 2.0.0;

include "./lib/tx.circom";

component main { public [spendNullifier] } = Tx(2,2,5);
