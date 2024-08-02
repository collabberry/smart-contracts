const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Collabberry Contracts", function () {
    let Organization, TeamPoints, organization, teamPoints;
    let owner, addr1, addr2, addr3;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Deploy Organization contract
        Organization = await ethers.getContractFactory("Organization");
        organization = await Organization.deploy(owner.address, "Collabberry Metadata");
        await organization.deployed();

        // Get the deployed TeamPoints contract address
        const teamPointsAddress = await organization.teamPoints();

        // Get the TeamPoints contract instance
        TeamPoints = await ethers.getContractFactory("TeamPoints");
        teamPoints = await TeamPoints.attach(teamPointsAddress);
    });

    describe("Organization", function () {
        it("Should add a new member", async function () {
            await organization.addMember(addr1.address);
            expect(await organization.isMember(addr1.address)).to.be.true;
        });

        it("Should remove an existing member", async function () {
            await organization.addMember(addr1.address);
            await organization.removeMember(addr1.address);
            expect(await organization.isMember(addr1.address)).to.be.false;
        });

        it("Should not add a member twice", async function () {
            await organization.addMember(addr1.address);
            await expect(organization.addMember(addr1.address)).to.be.revertedWith("Member already exists");
        });

        it("Should not remove a non-existent member", async function () {
            await expect(organization.removeMember(addr1.address)).to.be.revertedWith("Member does not exist");
        });
    });

    describe("TeamPoints", function () {
        it("Should mint Team Points to a member", async function () {
            await organization.addMember(addr1.address);
            await teamPoints.mint(addr1.address, 100);
            expect(await teamPoints.balanceOf(addr1.address)).to.equal(100);
        });

        it("Should not mint Team Points to a non-member", async function () {
            await expect(teamPoints.mint(addr1.address, 100)).to.be.revertedWith("Recipient is not a member of the organization");
        });

        it("Should not transfer Team Points within the first year", async function () {
            await organization.addMember(addr1.address);
            await teamPoints.mint(addr1.address, 100);
            await expect(teamPoints.transfer(addr2.address, 50)).to.be.revertedWith("Token transfers are locked for the first year");
        });

        it("Should transfer Team Points after the lock-up period", async function () {
            await organization.addMember(addr1.address);
            await organization.addMember(addr2.address);
            await teamPoints.mint(addr1.address, 100);
        
            // Increase the blockchain time by 365 days
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);
        
            await teamPoints.connect(addr1).transfer(addr2.address, 50);
            expect(await teamPoints.balanceOf(addr2.address)).to.equal(50);
        });
        

        it("Should not transfer Team Points to a non-member", async function () {
            await organization.addMember(addr1.address);
            await teamPoints.mint(addr1.address, 100);
        
            // Increase the blockchain time by 365 days to satisfy the lock-up period
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);
        
            await expect(teamPoints.connect(addr1).transfer(addr3.address, 50))
                .to.be.revertedWith("Recipient is not a member of the organization");
        });
        

        it("Should return the first receipt time of Team Points", async function () {
            await organization.addMember(addr1.address);
            await teamPoints.mint(addr1.address, 100);
            const receiptTime = await teamPoints.getFirstReceiptTime(addr1.address);
            expect(receiptTime).to.be.gt(0);
        });
    });
});
