async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
  const simple = await SimpleStorage.deploy();
  await simple.deployed();

  console.log("SimpleStorage deployed to:", simple.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// commit-5
