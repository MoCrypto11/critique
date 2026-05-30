import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const usdc = (value: string) => ethers.parseUnits(value, 6);

type ContractWithInterface = {
  interface: {
    parseError(data: string): { name: string } | null;
  };
};

function getErrorData(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybe = error as { data?: unknown; error?: unknown };
  if (typeof maybe.data === "string") return maybe.data;
  return getErrorData(maybe.error);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

async function expectCustomError(promise: Promise<unknown>, contract: ContractWithInterface, errorName: string) {
  try {
    await promise;
  } catch (error) {
    const data = getErrorData(error);
    const parsed = data ? contract.interface.parseError(data) : null;
    if (parsed?.name === errorName || getErrorMessage(error).includes(errorName)) return;
    throw error;
  }

  throw new Error(`Expected custom error ${errorName}`);
}

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
    expect(created.maxSubmissions).to.equal(2n);
    expect(created.deadline).to.equal(deadline);
  });

  it("rejects bounty with zero reward", async function () {
    const { bounty } = await deployFixture();
    await expectCustomError(bounty.createBounty(0, 1, await latestDeadline(), "x"), bounty, "InvalidAmount");
  });

  it("rejects bounty with zero slots", async function () {
    const { bounty } = await deployFixture();
    await expectCustomError(bounty.createBounty(usdc("1"), 0, await latestDeadline(), "x"), bounty, "InvalidAmount");
  });

  it("rejects bounty with past deadline", async function () {
    const { bounty } = await deployFixture();
    const block = await ethers.provider.getBlock("latest");
    await expectCustomError(
      bounty.createBounty(usdc("1"), 1, BigInt((block?.timestamp || 0) - 1), "x"),
      bounty,
      "InvalidDeadline"
    );
  });

  it("funds bounty with mock USDC", async function () {
    const { bounty, mockUSDC } = await deployFixture();

    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));
    expect(await bounty.remainingFunds(0)).to.equal(usdc("2"));
  });

  it("founder approves submission and tester gets paid", async function () {
    const { bounty, mockUSDC, tester } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    const hash = ethers.id("submission-1");
    await bounty.approveSubmission(0, tester.address, hash);
    expect(await mockUSDC.balanceOf(tester.address)).to.equal(usdc("1"));
  });

  it("non-founder cannot approve", async function () {
    const { bounty, mockUSDC, other, tester } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await expectCustomError(
      bounty.connect(other).approveSubmission(0, tester.address, ethers.id("x")),
      bounty,
      "OnlyFounder"
    );
  });

  it("same tester cannot be paid twice", async function () {
    const { bounty, mockUSDC, tester } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await bounty.approveSubmission(0, tester.address, ethers.id("a"));
    await expectCustomError(
      bounty.approveSubmission(0, tester.address, ethers.id("b")),
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
    await expectCustomError(
      bounty.approveSubmission(0, testerTwo.address, hash),
      bounty,
      "SubmissionHashAlreadyUsed"
    );
  });

  it("cannot approve more than max submissions", async function () {
    const { bounty, mockUSDC, tester, testerTwo } = await deployFixture(1n);
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));

    await bounty.approveSubmission(0, tester.address, ethers.id("a"));
    await expectCustomError(
      bounty.approveSubmission(0, testerTwo.address, ethers.id("b")),
      bounty,
      "MaxSubmissionsReached"
    );
  });

  it("cannot approve without enough funded balance", async function () {
    const { bounty, tester } = await deployFixture();
    await expectCustomError(
      bounty.approveSubmission(0, tester.address, ethers.id("a")),
      bounty,
      "InsufficientBountyFunds"
    );
  });

  it("founder can close bounty", async function () {
    const { bounty } = await deployFixture();
    await bounty.closeBounty(0);
    expect((await bounty.getBounty(0)).closed).to.equal(true);
  });

  it("founder can refund unused funds after close", async function () {
    const { bounty, mockUSDC, founder } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await bounty.fundBounty(0, usdc("2"));
    await bounty.closeBounty(0);

    const before = await mockUSDC.balanceOf(founder.address);
    await bounty.refundUnused(0);
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

    await expectCustomError(bounty.connect(other).refundUnused(0), bounty, "OnlyFounder");
  });
});
