
#/usr/bin/env sh 

if [ -z "$NO_CIRCOM" ]; then
  for file in ./circuits/*; do
    circuit_file=$(basename "$file")
    circuit_name=${circuit_file%.*}
    ./scripts/compile_circuit.sh "$circuit_name"
  done
fi
pnpm hardhat test ./test/circom_tests.ts
