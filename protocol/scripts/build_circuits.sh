#/usr/bin/env sh 
DIR="./circuits"
HASH_FILE="./.hash"

calculate_hash() {
    find "$DIR" -type f -exec md5sum {} + | sort -k 2 | md5sum | cut -d" " -f1
}

build_circuits() {
  for file in ./circuits/*; do
    if [ -f "$file" ]; then
      circuit_file=$(basename "$file")
      circuit_name=${circuit_file%.*}
      ./scripts/compile_circuit.sh "$circuit_name"
    fi
  done
}

current_hash=$(calculate_hash)

if [ -f "$HASH_FILE" ]; then
  read -r previous_hash < "$HASH_FILE"
else
  previous_hash=""
fi

if [ "$FORCE" ] || [ "$current_hash" != "$previous_hash" ]; then
  build_circuits
  echo "$current_hash" > "$HASH_FILE"
fi



