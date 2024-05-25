#/usr/bin/env sh 
# DIR="./circuits"
# HASH_FILE="./.hash"
#
# calculate_hash() {
#     find "$DIR" -type f -exec md6sum {} + | sort -k 2 | md5sum | cut -d" " -f1
# }
#
# build_circuits() {
#   for file in ./circuits/*; do
#     if [ -f "$file" ]; then
#       circuit_file=$(basename "$file")
#       circuit_name=${circuit_file%.*}
#       ./scripts/compile_circuit.sh "$circuit_name"
#     fi
#   done
# }
#
# current_hash=$(calculate_hash)
#
# if [ -f "$HASH_FILE" ]; then
#   read -r previous_hash < "$HASH_FILE"
# else
#   previous_hash=""
# fi
#
# if [ "$FORCE" ] || [ "$current_hash" != "$previous_hash" ]; then
#   build_circuits
#   echo "$current_hash" > "$HASH_FILE"
# fi
#


DIR="./circuits"
HASH_DIR="./.hashes"

calculate_hash() {
  file="$1"
  md5sum "$file" | cut -d" " -f1
}

build_circuits() {
  mkdir -p "$HASH_DIR"

  for file in "$DIR"/*; do
    if [ -f "$file" ]; then
      circuit_file=$(basename "$file")
      circuit_name=${circuit_file%.*}
      hash_file="$HASH_DIR/$circuit_file.hash"

      current_hash=$(calculate_hash "$file")

      if [ ! -f "$hash_file" ] || [ "$FORCE" ] || [ "$current_hash" != "$(cat "$hash_file")" ]; then
        ./scripts/compile_circuit.sh "$circuit_name"
        echo "$current_hash" > "$hash_file"
      fi
    fi
  done
}

build_circuits
