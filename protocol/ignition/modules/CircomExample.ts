import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import SpendVerifier from "./generated/SpendVerifier";
import OutputVerifier from "./generated/OutputVerifier";

export default buildModule("CircomExample", (m) => {
  const { verifier: spendVerifier } = m.useModule(SpendVerifier);
  const { verifier: outputVerifier } = m.useModule(OutputVerifier);
  const verifier = m.contract("CircomExample", [spendVerifier, outputVerifier]);

  return { verifier };
});
