pragma circom 2.0.0;

include "./output.circom";
include "./spend.circom";

template Tx(ins, outs, merkleDepth) {
  signal input root;
  signal input privateKey;

  // inputs
  signal input spendAmount[ins];
  signal input spendBlinding[ins];
  signal input spendAsset[ins];
  signal input spendPathIndex[ins];
  signal input spendNullifier[ins];
  signal input spendPathElements[ins][merkleDepth];
  signal input spendCommitment[ins];
  signal input spendV[ins][2];
  signal input spendR[ins][2];
  signal input spendr[ins];
  signal input spendC[ins][2];

  // outputs
  signal input outAmount[outs];
  signal input outBlinding[outs];
  signal input outAssetId[outs];
  signal input outAssetIdHash[outs];
  signal input outPublicKey[outs];
  signal input outV[outs][2];
  signal input outR[outs][2];
  signal input outr[outs];
  signal input outC[outs][2];

  // New Commitments
  // TODO: make nullifiers be outputs
  signal output outCommitment[outs];

  component spend[ins];
  component out[outs];
  
  for(var i=0; i < ins; i++) {
    spend[i] = Spend(merkleDepth);
    spend[i].root <== root;
    spend[i].privateKey <== privateKey;
    spend[i].amount <== spendAmount[i];
    spend[i].blinding <== spendBlinding[i];
    spend[i].asset <== spendAsset[i];
    spend[i].pathIndex <== spendPathIndex[i];
    spend[i].nullifier <== spendNullifier[i];
    spend[i].pathElements <== spendPathElements[i];
    spend[i].commitment <== spendCommitment[i];
    spend[i].Vx <== spendV[i][0];
    spend[i].Vy <== spendV[i][1];
    spend[i].Rx <== spendR[i][0];
    spend[i].Ry <== spendR[i][0];
    spend[i].r <== spendr[i];
    spend[i].Cx <== spendC[i][0];
    spend[i].Cy <== spendC[i][1];
  }

  for(var i=0; i < outs; i++) {
    out[i] = Output();
    out[i].amount <== outAmount[i];
    out[i].blinding <== outBlinding[i];
    out[i].assetId <== outAssetId[i];
    out[i].assetIdHash <== outAssetIdHash[i];
    out[i].publicKey <== outPublicKey[i];

    out[i].Vx <== outV[i][0];
    out[i].Vy <== outV[i][1];
    out[i].Rx <== outR[i][0];
    out[i].Ry <== outR[i][1];
    out[i].r <== outr[i];
    out[i].Cx <== outC[i][0];
    out[i].Cy <== outC[i][1];

    outCommitment[i] <== out[i].commitment;
  }
}
