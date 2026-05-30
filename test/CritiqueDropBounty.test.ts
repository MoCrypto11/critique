import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const usdc = (value: string) => ethers.parseUnits(value, 6);

async function latestDeadline(offset = 3600) {
  const block = await ethers.provider.getBlock("latest");
  return BigInt((block?.timestamp || 0) + offset);
}

async function deployFixture(maxSubmissions = 2n, reward = usdc("1")) {
  const [founder, tester, other, testerTwo, testerThree] = await ethers.getSigners();
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  const Bounty = await ethers.getContractFactory("CritiqueDropBounty");
  const bounty = await Bounty.deploy(await mockUSDC.getAddress());
  const deadline = await latestDeadline();

  await mockUSDC.mint(founder.address, usdc("100"));
  await mockUSDC.mint(other.address, usdc("100"));
  await bounty.createBounty(reward, maxSubmissions, deadline, "local://metadata");

  return { founder, tester, other, testerTwo, testerThree, mockUSDC, bounty, deadline, reward };
}

describe("CritiqueDropBounty", function () {
  it("creates bounty successfully", async function () {
    const { bounty, founder, deadline, reward } = await deployFixture();

    const created = await bounty.getBounty(0);
    expect(created.founder).to.equal(founder.address);
    expect(created.rewardPerSubmission).to.equal(reward);
    expect(created.maxSubmissions).to.equal(2);
    expect(created.deadline).to.equal(deadline);
  });

  it("rejects bounty with zero reward", async function () {
    const { bounty } = await deployFixture();
    await expect(bounty.createBounty(0, 1, await latestDeadline(), "x")).to.be.revertedWithCustomError(
      bounty,
      "InvalidAmount"
    );
  });

  it("rejects bounty with zero slots", async function () {
    const { bounty } = await deployFixture();
    await expect(bounty.createBounty(usdc("1"), 0, await latestDeadline(), "x")).to.be.revertedWithCustomError(
      bounty,
      "InvalidAmount"
    );
  });

  it("rejects bounty with past deadline", async function () {
    const { bounty } = await deployFixture();
    const block = await ethers.provider.getBlock("latest");
    await expect(bounty.createBounty(usdc("1"), 1, BigInt((block?.timestamp || 0) - 1), "x")).to.be.revertedWithCustomError(
      bounty,
      "InvalidDeadline"
    );
  });

  it("funds bounty with mock USDC", async function () {
    const { bounty, mockUSDC } = await deployFixture();

    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await expect(bounty.fundBounty(0, usdc("2"))).to.emit(bounty, "BountyFunded");
    expect(await bounty.remainingFunds(0)).to.equal(usdc("2"));
  });

  it("founder approves submission and tester gets paid", async function () {
    const { bounty, mockUSDC, tester } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    const hash = ethers.id("submission-1");
    await expect(bounty.approveSubmission(0, tester.address, hash)).to.emit(bounty, "TesterPaid");
    expect(await mockUSDC.balanceOf(tester.address)).to.equal(usdc("1"));
  });

  it("non-founder cannot approve", async function () {
    const { bounty, mockUSDC, other, tester } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await expect(bounty.connect(other).approveSubmission(0, tester.address, ethers.id("x"))).to.be.revertedWithCustomError(
      bounty,
      "OnlyFounder"
    );
  });

  it("same tester cannot be paid twice", async function () {
    const { bounty, mockUSDC, tester } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await bounty.approveSubmission(0, tester.address, ethers.id("a"));
    await expect(bounty.approveSubmission(0, tester.address, ethers.id("b"))).to.be.revertedWithCustomError(
      bounty,
      "TesterAlreadyPaid"
    );
  });

  it("same submission hash cannot be reused", async function () {
    const { bounty, mockUSDC, tester, testerTwo } = await deployFixture();
    const hash = ethers.id("shared");
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await bounty.approveSubmission(0, tester.address, hash);
    await expect(bounty.approveSubmission(0, testerTwo.address, hash)).to.be.revertedWithCustomError(
      bounty,
      "SubmissionHashAlreadyUsed"
    );
  });

  it("cannot approve more than max submissions", async function () {
    const { bounty, mockUSDC, tester, testerTwo } = await deployFixture(1n);
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await bounty.approveSubmission(0, tester.address, ethers.id("a"));
    await expect(bounty.approveSubmission(0, testerTwo.address, ethers.id("b"))).to.be.revertedWithCustomError(
      bounty,
      "MaxSubmissionsReached"
    );
  });

  it("cannot approve without enough funded balance", async function () {
    const { bounty, tester } = await deployFixture();
    await expect(bounty.approveSubmission(0, tester.address, ethers.id("a"))).to.be.revertedWithCustomError(
      bounty,
      "InsufficientBountyFunds"
    );
  });

  it("founder can close bounty", async function () {
    const { bounty } = await deployFixture();
    await expect(bounty.closeBounty(0)).to.emit(bounty, "BountyClosed");
    expect((await bounty.getBounty(0)).closed).to.equal(true);
  });

  it("founder can refund unused funds after close", async function () {
    const { bounty, mockUSDC, founder } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));
    await bounty.closeBounty(0);

    const before = await mockUSDC.balanceOf(founder.address);
    await expect(bounty.refundUnused(0)).to.emit(bounty, "UnusedRefunded");
    expect(await mockUSDC.balanceOf(founder.address)).to.equal(before + usdc("2"));
  });

  it("founder can refund unused funds after deadline", async function () {
    const { bounty, mockUSDC, founder } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);

    const before = await mockUSDC.balanceOf(founder.address);
    await bounty.refundUnused(0);
    expect(await mockUSDC.balanceOf(founder.address)).to.equal(before + usdc("2"));
  });

  it("non-founder cannot refund", async function () {
    const { bounty, mockUSDC, other } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));
    await bounty.closeBounty(0);

    await expect(bounty.connect(other).refundUnused(0)).to.be.revertedWithCustomError(bounty, "OnlyFounder");
  });
});
