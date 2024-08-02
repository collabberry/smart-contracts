// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  

  // We get the contract to deploy
  const owner = '0x8EB8E8A05A1E2945d0b1cb5418bFD9adC1c1D27E';
  const metadata = 'ipfs://bafybeiemu644jivrqf57hkfrfumarxiie6xknhoupk56xof2nvj2on7l3u/testOrg.metadata.json'
  const Organization = await ethers.getContractFactory("Organization");
  const organization = await Organization.deploy(owner, metadata);
  await organization.deployed();
  console.log("Organization deployed to:", organization.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
