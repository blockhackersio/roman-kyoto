generate_template() {
  local ins=$1
  local outs=$2
  echo "pragma circom 2.0.0;
include \"./lib/tx.circom\";

component main{public [spendNullifier]} = Tx(${ins},${outs},8);"
}

pushd circuits
echo "Creating ./tx_1x1.circom"
generate_template 1 1 > ./tx_1x1.circom

echo "Creating ./tx_1x10.circom"
generate_template 1 1 > ./tx_1x10.circom

for i in {1..10}; do
  for j in {2..5}; do
    echo "Creating ./tx_${i}x${j}.circom"
    generate_template $i $j > ./tx_${i}x${j}.circom
  done
done
popd
