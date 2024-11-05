#/usr/bin/env sh 
DIR="./circuits"
HASH_FILE="./.hash"

calculate_hash() {
    # On macOS, md5 is the equivalent of md5sum
    if command -v md5sum >/dev/null 2>&1; then
        # Use md5sum if available (Linux)
        find "$DIR" -type f -exec md5sum {} + | sort -k 2 | md5sum | cut -d" " -f1
    else
        # Use md5 on macOS
        find "$DIR" -type f -exec md5 -r {} + | sort -k 2 | md5 -r | cut -d" " -f1
    fi
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



