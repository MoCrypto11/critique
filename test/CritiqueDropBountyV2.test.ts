import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const usdc = (value: string) => ethers.parseUnits(value, 6);
const typeId = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

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

async function deployFixture() {
  const [founder, tester, other, testerTwo, testerThree] = await ethers.getSigners();
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  const Bounty = await ethers.getContractFactory("CritiqueDropBountyV2");
  const bounty = await Bounty.deploy(await mockUSDC.getAddress());
  const deadline = await latestDeadline();

  await mockUSDC.mint(founder.address, usdc("100"));
  await mockUSDC.mint(other.address, usdc("100"));

  return { founder, tester, other, testerTwo, testerThree, mockUSDC, bounty, deadline };
}

async function createDefaultBounty() {
  const fixture = await deployFixture();
  const { bounty, mockUSDC, deadline } = fixture;
  const feedbackTypeIds = [typeId("quick_written"), typeId("technical_proposal")];
  const rewardAmounts = [usdc("0.1"), usdc("10")];
  const slotCounts = [10n, 1n];
  const total = usdc("11");

  await mockUSDC.approve(await bounty.getAddress(), total);
  await bounty.createAndFundBounty(feedbackTypeIds, rewardAmounts, slotCounts, deadline, "local://metadata");

  return { ...fixture, feedbackTypeIds, rewardAmounts, slotCounts, total };
}

describe("CritiqueDropBountyV2", function () {
  it("creates and funds one bounty with multiple feedback type rewards", async function () {
    const { bounty, mockUSDC, founder, deadline } = await deployFixture();
    const feedbackTypeIds = [
      typeId("quick_written"),
      typeId("deep_product_review"),
      typeId("video_walkthrough"),
      typeId("technical_proposal")
    ];
    const rewardAmounts = [usdc("0.1"), usdc("0.1"), usdc("0.1"), usdc("10")];
    const slotCounts = [10n, 20n, 10n, 1n];
    const total = usdc("14");

    await mockUSDC.approve(await bounty.getAddress(), total);
    await bounty.createAndFundBounty(feedbackTypeIds, rewardAmounts, slotCounts, deadline, "local://metadata");

    const created = await bounty.getBounty(0);
    expect(created.founder).to.equal(founder.address);
    expect(created.fundedAmount).to.equal(total);
    expect(await bounty.remainingFunds(0)).to.equal(total);
    expect(await mockUSDC.balanceOf(await bounty.getAddress())).to.equal(total);

    const technical = await bounty.getFeedbackTypeConfig(0, typeId("technical_proposal"));
    expect(technical.rewardAmount).to.equal(usdc("10"));
    expect(technical.maxSlots).to.equal(1n);
  });

  it("rejects invalid feedback arrays", async function () {
    const { bounty, mockUSDC, deadline } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("1"));

    await expectCustomError(
      bounty.createAndFundBounty([], [], [], deadline, "x"),
      bounty,
      "InvalidArrayLength"
    );
    await expectCustomError(
      bounty.createAndFundBounty([typeId("quick_written")], [usdc("1")], [1n, 2n], deadline, "x"),
      bounty,
      "InvalidArrayLength"
    );
    await expectCustomError(
      bounty.createAndFundBounty([typeId("quick_written")], [0], [1], deadline, "x"),
      bounty,
      "InvalidAmount"
    );
  });

  it("rejects duplicate feedback type IDs", async function () {
    const { bounty, mockUSDC, deadline } = await deployFixture();
    await mockUSDC.approve(await bounty.getAddress(), usdc("2"));
    await expectCustomError(
      bounty.createAndFundBounty([typeId("quick_written"), typeId("quick_written")], [usdc("1"), usdc("1")], [1, 1], deadline, "x"),
      bounty,
      "DuplicateFeedbackType"
    );
  });

  it("pays the correct reward for each approved feedback type", async function () {
    const { bounty, mockUSDC, tester, testerTwo, feedbackTypeIds } = await createDefaultBounty();

    await bounty.approveSubmission(0, feedbackTypeIds[0], tester.address, ethers.id("written"));
    expect(await mockUSDC.balanceOf(tester.address)).to.equal(usdc("0.1"));

    await bounty.approveSubmission(0, feedbackTypeIds[1], testerTwo.address, ethers.id("technical"));
    expect(await mockUSDC.balanceOf(testerTwo.address)).to.equal(usdc("10"));
    expect(await bounty.remainingFunds(0)).to.equal(usdc("0.9"));
  });

  it("enforces slots by feedback type", async function () {
    const { bounty, tester, testerTwo, feedbackTypeIds } = await createDefaultBounty();

    await bounty.approveSubmission(0, feedbackTypeIds[1], tester.address, ethers.id("technical"));
    await expectCustomError(
      bounty.approveSubmission(0, feedbackTypeIds[1], testerTwo.address, ethers.id("technical-two")),
      bounty,
      "MaxSubmissionsReached"
    );
  });

  it("rejects unknown feedback type approvals", async function () {
    const { bounty, tester } = await createDefaultBounty();
    await expectCustomError(
      bounty.approveSubmission(0, typeId("video_walkthrough"), tester.address, ethers.id("video")),
      bounty,
      "InvalidFeedbackType"
    );
  });

  it("same tester cannot be paid twice in one bounty", async function () {
    const { bounty, tester, feedbackTypeIds } = await createDefaultBounty();
    await bounty.approveSubmission(0, feedbackTypeIds[0], tester.address, ethers.id("written"));
    await expectCustomError(
      bounty.approveSubmission(0, feedbackTypeIds[1], tester.address, ethers.id("technical")),
      bounty,
      "TesterAlreadyPaid"
    );
  });

  it("same submission hash cannot be reused", async function () {
    const { bounty, tester, testerTwo, feedbackTypeIds } = await createDefaultBounty();
    const hash = ethers.id("shared");
    await bounty.approveSubmission(0, feedbackTypeIds[0], tester.address, hash);
    await expectCustomError(
      bounty.approveSubmission(0, feedbackTypeIds[0], testerTwo.address, hash),
      bounty,
      "SubmissionHashAlreadyUsed"
    );
  });

  it("non-founder cannot approve or refund", async function () {
    const { bounty, other, tester, feedbackTypeIds } = await createDefaultBounty();
    await expectCustomError(
      bounty.connect(other).approveSubmission(0, feedbackTypeIds[0], tester.address, ethers.id("x")),
      bounty,
      "OnlyFounder"
    );
    await bounty.closeBounty(0);
    await expectCustomError(bounty.connect(other).refundUnused(0), bounty, "OnlyFounder");
  });

  it("founder can close and refund unused balance", async function () {
    const { bounty, mockUSDC, founder, tester, feedbackTypeIds } = await createDefaultBounty();
    await bounty.approveSubmission(0, feedbackTypeIds[0], tester.address, ethers.id("written"));
    await bounty.closeBounty(0);

    const before = await mockUSDC.balanceOf(founder.address);
    await bounty.refundUnused(0);
    expect(await mockUSDC.balanceOf(founder.address)).to.equal(before + usdc("10.9"));
    expect(await bounty.remainingFunds(0)).to.equal(0n);
  });
});
