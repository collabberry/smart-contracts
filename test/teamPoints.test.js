const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TeamPointsFactory and TeamPoints Tests", function () {
  let TeamPointsFactory, teamPointsFactory;
  let TeamPoints, teamPoints;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // 1. Deploy the TeamPointsFactory
    TeamPointsFactory = await ethers.getContractFactory("TeamPointsFactory");
    teamPointsFactory = await TeamPointsFactory.deploy();
    await teamPointsFactory.deployed();
  });

  describe("TeamPointsFactory", function () {
    it("Should deploy a new TeamPoints contract and set msg.sender as the initial owner", async function () {
      // 2. Create a new TeamPoints through the factory
      const tx = await teamPointsFactory.deployTeamPoints(
        "My Token",    // name
        "MTK"          // symbol
      );
      const receipt = await tx.wait();

      // 3. Parse the TeamPointsCreated event to get the new contract address
      const event = receipt.events.find((e) => e.event === "TeamPointsCreated");
      const contractAddress = event.args.contractAddress;
      const initialOwner = event.args.initialOwner;

      // 4. Attach to the newly created TeamPoints contract
      TeamPoints = await ethers.getContractFactory("TeamPoints");
      teamPoints = await TeamPoints.attach(contractAddress);

      // 5. Assertions
      expect(initialOwner).to.equal(owner.address);

      const name = await teamPoints.name();
      const symbol = await teamPoints.symbol();
      const isTransferable = await teamPoints.isTransferable();
      const isOutsideTransferAllowed =
        await teamPoints.isOutsideTransferAllowed();
      const materialWeight = await teamPoints.materialContributionWeight();

      expect(name).to.equal("My Token");
      expect(symbol).to.equal("MTK");
      expect(isTransferable).to.equal(false);
      expect(isOutsideTransferAllowed).to.equal(false);
      expect(materialWeight).to.equal(4000);
    });

    it("Should track all deployed TeamPoints addresses", async function () {
      // Deploy two separate TeamPoints instances
      await teamPointsFactory.deployTeamPoints(
        "TokenA",
        "TKA"
      );
      await teamPointsFactory.deployTeamPoints(
        "TokenB",
        "TKB"
      );

      // Check the factory's stored addresses
      const count = await teamPointsFactory.getTeamPointsCount();
      expect(count).to.equal(2);

      const allContracts = await teamPointsFactory.getAllTeamPoints();
      expect(allContracts.length).to.equal(2);

      // Optional: further attach and verify each one if desired
    });
  });

  describe("TeamPoints (from a newly deployed instance)", function () {
    beforeEach(async function () {
      // Deploy a single TeamPoints instance via factory
      const tx = await teamPointsFactory.deployTeamPoints(
        "Test Token",
        "TTK"
      );
      const receipt = await tx.wait();
      const event = receipt.events.find((e) => e.event === "TeamPointsCreated");
      const contractAddress = event.args.contractAddress;

      TeamPoints = await ethers.getContractFactory("TeamPoints");
      teamPoints = await TeamPoints.attach(contractAddress);
    });

    it("Should only allow the admin (owner) to mint tokens", async function () {

      await expect(await teamPoints.isAdmin(owner.address)).to.be.true;
      // 1. Mint from the owner (admin) account
      await teamPoints.mint(addr1.address, 200, 100);

      const balanceAddr1 = await teamPoints.balanceOf(addr1.address);
      // Balance to be: 200 * 4 + 100 * 2 = 800 + 200 = 1000
      expect(balanceAddr1).to.eq(1000);

      // 3. Non-admin tries to mint
      await expect(
        teamPoints.connect(addr1).mint(addr1.address, 200, 100)
      ).to.be.revertedWith('AccessControlUnauthorizedAccount');
    });

    it("Should record the first mint time and compute timeWeight correctly", async function () {
      // Initially, the user has no tokens
      let weightBeforeMint = await teamPoints.getTimeWeight(addr1.address);
      expect(weightBeforeMint).to.equal(2000); // default if firstMintTime[user] == 0

      // After mint
      await teamPoints.mint(addr1.address, 100, 50);

      // The firstMintTime should be set, so subsequent calls reflect that
      let weightAfterMint = await teamPoints.getTimeWeight(addr1.address);
      expect(weightAfterMint).to.equal(2000); // minted immediately, no 6-month period has passed
    });

    it("Should block transfers if isTransferable is false", async function () {
      // Mint some tokens to addr1
      // We'll use 0 material, 100 time just as an example
      // minted amount = (0 * 100) + ((100 * 2000) / 1000) = 200
      await teamPoints.mint(addr1.address, 0, 100);

      // minted amount for addr2 = 50 * 2000 / 1000 = 100
      await teamPoints.mint(addr2.address, 0, 50);

      // Attempt to transfer from addr1 to addr2
      await expect(
        teamPoints.connect(addr1).transfer(addr2.address, 50)
      ).to.be.revertedWith("Transfers are disabled");

      // Now let's enable transfers
      await teamPoints.updateSettings(
        true, // _isTransferable
        false, // _isOutsideTransferAllowed
        4 // _materialWeight
      );

      // Transfer should succeed now that isTransferable = true
      await teamPoints.connect(addr1).transfer(addr2.address, 50);

      // addr2 had 100, plus 50 = 150
      expect(await teamPoints.balanceOf(addr2.address)).to.equal(150);
    });

    it("Should prevent transfers to new addresses if isOutsideTransferAllowed is false", async function () {
      // isTransferable = false by default, so let's allow transfers
      await teamPoints.updateSettings(true, false, 4000);

      // Mint some tokens to addr1
      // minted = 0 + (100 * 2000 / 1000) = 200
      await teamPoints.mint(addr1.address, 0, 100);

      // Since addr2 hasn't received tokens yet, transferring to addr2 should revert
      await expect(
        teamPoints.connect(addr1).transfer(addr2.address, 50)
      ).to.be.revertedWith("Recipient must be an existing token holder");

      // Let's mint some tokens to addr2
      // minted = (50*4) + (0 * timeWeight/1000) = 200
      await teamPoints.mint(addr2.address, 50, 0);

      expect(await teamPoints.balanceOf(addr2.address)).to.equal(200);

      // Now addr2 hasReceivedTokens == true, so the transfer should succeed
      await teamPoints.connect(addr1).transfer(addr2.address, 50);
      // addr2 => 200 + 50 = 250
      expect(await teamPoints.balanceOf(addr2.address)).to.equal(250);
    });

    it("Should allow admin to change settings", async function () {
      // Default settings from constructor
      expect(await teamPoints.isTransferable()).to.equal(false);
      expect(await teamPoints.isOutsideTransferAllowed()).to.equal(false);
      expect(await teamPoints.materialContributionWeight()).to.equal(4000);

      // Update
      await teamPoints.updateSettings(true, true, 500);
      expect(await teamPoints.isTransferable()).to.equal(true);
      expect(await teamPoints.isOutsideTransferAllowed()).to.equal(true);
      expect(await teamPoints.materialContributionWeight()).to.equal(500);
    });

    it("Should allow adding and removing admins", async function () {

      await expect(await teamPoints.isAdmin(owner.address)).to.be.true;
      // Initially, only the contract deployer (owner) is admin
      // Attempting to add an admin who has never received tokens should revert
      await expect(teamPoints.addAdmin(addr1.address)).to.be.revertedWith(
        "New admin must be a token holder"
      );

      // Mint tokens to addr1
      // minted = (100*100) + (0 * timeWeight/1000) = 10,000
      await teamPoints.mint(addr1.address, 100, 0);

      // Now we can add addr1 as an admin
      await teamPoints.addAdmin(addr1.address);
      // No revert => success

      // Let addr1 remove themself as admin
      await teamPoints.connect(addr1).removeAdmin(addr1.address);

      // Attempt to mint again as addr1 => should revert now, because they are no longer admin
      await expect(
        teamPoints.connect(addr1).mint(addr1.address, 100, 0)
      ).to.be.revertedWith('AccessControlUnauthorizedAccount');
    });

    describe("Material & Time Contribution Calculations", function () {
      it("Should mint the correct amount with zero time contribution (timeWeight = 2000 by default)", async function () {

        // set materialContributionWeight = 10
        await teamPoints.updateSettings(true, true, 100000);

        // For a new user, timeWeight = 2000
        // minted = (materialContribution * 100) + (timeContribution * 2000 / 1000)

        // Example: mint(addr1, 10, 0)
        // minted = (10 * 10000/1000) + (0 * 2000/1000) = 1000
        await teamPoints.mint(addr1.address, 10, 0);
        expect(await teamPoints.balanceOf(addr1.address)).to.equal(1000);
      });

      it("Should mint the correct amount with both material and time contributions for a new user", async function () {
        // Example: mint(addr1, 10, 50) => new user => timeWeight=2000
        // minted = (10 * 100) + ((50 * 2000) / 1000) = 1000 + 100 = 1100
        await teamPoints.updateSettings(true, true, 100000);

        await teamPoints.mint(addr1.address, 10, 50);
        expect(await teamPoints.balanceOf(addr1.address)).to.equal(1100);
      });

      it("Should increase timeWeight after 6 months and mint accordingly", async function () {
        await teamPoints.updateSettings(true, true, 100000);

        // 1) Mint initially to set firstMintTime
        // minted = (0 * 100) + ((50 * 2000) / 1000) = 100
        await teamPoints.mint(addr1.address, 0, 50);
        expect(await teamPoints.balanceOf(addr1.address)).to.equal(100);

        // 2) Fast forward 6 months
        const sixMonths = 180 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [sixMonths]);
        await ethers.provider.send("evm_mine");

        // Now timeWeight should be = 2000 + 125 = 2125
        // Let's mint again => minted = (5 * 100) + ((10 * 2125) / 1000) = 500 + 21.25 => ~521
        // Note: division is integer-based, so carefully check how it truncates. 
        // In pure integer math: (10 * 2125) / 1000 = 21 (since 2125*10=21250, /1000=21.25 => truncated to 21)
        // So minted = 500 + 21 = 521
        // Final expected balance = 100 + 521 = 621
        await teamPoints.mint(addr1.address, 5, 10);
        expect(await teamPoints.balanceOf(addr1.address)).to.equal(621);
      });

      it("Should cap timeWeight at 4000 after enough time passes", async function () {
        await teamPoints.updateSettings(true, true, 100000);

        // For the first mint
        await teamPoints.mint(addr1.address, 1, 0);
        // minted = (1*100) + 0 = 100
        expect(await teamPoints.balanceOf(addr1.address)).to.equal(100);

        // Increase time by 5 years (~10 six-month periods).
        // Each 6 months => +125, so 10 periods => +1250
        // 2000 + 1250 = 3250, still not at cap, let's go further to exceed the cap:
        const fiveYears = 5 * 365 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [fiveYears]);
        await ethers.provider.send("evm_mine");

        // Increase again by another big chunk to push well beyond 4000
        const tenMoreYears = 10 * 365 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [tenMoreYears]);
        await ethers.provider.send("evm_mine");

        // timeWeight should now be capped at 4000
        const timeWeight = await teamPoints.getTimeWeight(addr1.address);
        expect(timeWeight).to.equal(4000);

        // minted = (10*100) + (50 * 4000 / 1000) = 1000 + 200 = 1200
        // final balance => 100 + 1200 = 1300
        await teamPoints.mint(addr1.address, 10, 50);
        expect(await teamPoints.balanceOf(addr1.address)).to.equal(1300);
      });
    });

    describe("TeamPoints - batchMint Tests", function () {
      let owner, addr1, addr2, addr3;
      let teamPoints;

      beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Deploy the factory
        const TeamPointsFactory = await ethers.getContractFactory("TeamPointsFactory");
        const teamPointsFactory = await TeamPointsFactory.deploy();
        await teamPointsFactory.deployed();

        // Create a new TeamPoints instance via the factory
        const tx = await teamPointsFactory.deployTeamPoints(
          "Batch Test Token",
          "BTT"
        );

        const receipt = await tx.wait();
        const event = receipt.events.find((e) => e.event === "TeamPointsCreated");
        const contractAddress = event.args.contractAddress;

        // Attach to the newly created contract
        const TeamPoints = await ethers.getContractFactory("TeamPoints");
        teamPoints = await TeamPoints.attach(contractAddress);
        await teamPoints.updateSettings(true, true, 100000);

      });

      describe("batchMint()", function () {
        it("Should revert if input arrays have different lengths", async function () {
          const recipients = [addr1.address, addr2.address];
          const matContribs = [100]; // shorter
          const timeContribs = [50, 50];

          await expect(
            teamPoints.batchMint(recipients, matContribs, timeContribs)
          ).to.be.revertedWith("Input array lengths mismatch");
        });

        it("Should revert if called by a non-admin", async function () {
          // Non-admin tries to call batchMint
          await expect(
            teamPoints.connect(addr1).batchMint(
              [addr2.address],
              [100],
              [50]
            )
          ).to.be.revertedWith("AccessControlUnauthorizedAccount");
        });

        it("Should batch mint correctly for multiple recipients in one transaction", async function () {
          // Recipients: addr1, addr2
          const recipients = [addr1.address, addr2.address];
          // Suppose we have these material/time contributions:
          // material: [10, 20], time: [5, 10]
          //   => mintedAmount for each user = (material * 100) + ((time * timeWeight) / 1000).
          //   => timeWeight for new recipients is 2000 by default.

          const matContribs = [10, 20];
          const timeContribs = [5, 10];

          // Admin calls batchMint
          await teamPoints.batchMint(recipients, matContribs, timeContribs);

          // Calculate expected amounts
          // For addr1: 
          //   timeWeight = 2000
          //   minted = (10 * 100) + ((5 * 2000) / 1000) = 1000 + 10 = 1010
          // For addr2:
          //   minted = (20 * 100) + ((10 * 2000) / 1000) = 2000 + 20 = 2020

          expect(await teamPoints.balanceOf(addr1.address)).to.equal(1010);
          expect(await teamPoints.balanceOf(addr2.address)).to.equal(2020);
        });

        it("Should set firstMintTime for each new address in the batch", async function () {
          const recipients = [addr1.address, addr2.address];
          const matContribs = [10, 20];
          const timeContribs = [5, 10];

          await teamPoints.batchMint(recipients, matContribs, timeContribs);

          // After batchMint, check that firstMintTime was recorded
          const firstMint1 = await teamPoints.callStatic.getTimeWeight(addr1.address);
          const firstMint2 = await teamPoints.callStatic.getTimeWeight(addr2.address);

          // Both should use the default 2000 (since they're new recipients)
          expect(firstMint1).to.equal(2000);
          expect(firstMint2).to.equal(2000);
        });

        it("Should accumulate additional tokens for recipients if called multiple times", async function () {
          // First batch mint
          await teamPoints.batchMint([addr1.address], [10], [0]);
          // minted = 10*100 + 0 = 1000

          // Second batch mint, same address but different material/time
          // Let's do: material=5, time=10 => minted = (5*100) + (10*2000/1000)= 500 + 20=520
          // So total final = 1000 + 520 = 1520
          await teamPoints.batchMint([addr1.address], [5], [10]);

          expect(await teamPoints.balanceOf(addr1.address)).to.equal(1520);
        });
      });
    });
  });
});
