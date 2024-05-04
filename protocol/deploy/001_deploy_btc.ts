import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {
    ethers,
    deployments: { deploy },
  } = hre;

  const [Deployer] = await ethers.getSigners();

  console.log(Deployer.address);

  await deploy("WBTC", {
    contract: "WBTC",
    from: Deployer.address,
    args: [Deployer.address],
    log: true,
    autoMine: true,
  });
};

export default func;
func.tags = ["btc"];
