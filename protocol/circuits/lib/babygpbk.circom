pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/escalarmulany.circom";

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
