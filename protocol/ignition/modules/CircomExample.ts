import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import SpendVerifier from "./generated/SpendVerifier";
import OutputVerifier from "./generated/OutputVerifier";

export default buildModule("CircomExample", (m) => {
  const { verifier: spendVerifier } = m.useModule(SpendVerifier);
  const { verifier: outputVerifier } = m.useModule(OutputVerifier);

  const EdOnBN254 = m.library("EdOnBN254");

  const verifier = m.contract(
    "CircomExample",
    [spendVerifier, outputVerifier],
    {
      libraries: {
        EdOnBN254,
      },
    }
  );

  return { verifier };
});
