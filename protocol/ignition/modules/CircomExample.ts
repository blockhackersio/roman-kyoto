import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import SpendVerifier from "./generated/SpendVerifier";

export default buildModule("CircomExample", (m) => {
  const { verifier: spendVerifier } = m.useModule(SpendVerifier);
  const verifier = m.contract("CircomExample", [spendVerifier]);

  return { verifier };
});
