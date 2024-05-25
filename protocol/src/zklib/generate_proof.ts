import { CircuitSignals, groth16 } from "snarkjs";
import { getWasmFileLocation, getZkeyFileLocation } from "./key_locator";
import { serializeG16Proof } from "./serialize_proof";

export async function generateGroth16Proof(
  inputs: CircuitSignals,
  circuitName: string = "hello"
) {
  console.log(JSON.stringify(inputs, null,2))
  const wasmLocation = getWasmFileLocation(circuitName);
  const zkeyLocation = getZkeyFileLocation(circuitName);
  const start = Date.now();
  const { proof } = await groth16.fullProve(inputs, wasmLocation, zkeyLocation);
  const time = Date.now() - start;

  console.log(`Proving "${circuitName}" took ` + time + "ms");

  return serializeG16Proof(proof);
}

export type GenerateProofFn = (
  inputs: object,
  circuitName?: string
) => Promise<string>;
