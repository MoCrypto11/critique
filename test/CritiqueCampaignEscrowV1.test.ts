import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const usdc = (value: string) => ethers.parseUnits(value, 6);
const hash = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

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

async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function latestDeadline(offset = 3600) {
  const block = await ethers.provider.getBlock("latest");
  return BigInt((block?.timestamp || 0) + offset);
}

const DISPUTE_WINDOW = 600;

async function deployFixture() {
  const [founder, agent, contributor, contributorTwo, other] = await ethers.getSigners();
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  const Escrow = await ethers.getContractFactory("CritiqueCampaignEscrowV1");
  const escrow = await Escrow.deploy(await mockUSDC.getAddress());
  const deadline = await latestDeadline();

  await mockUSDC.mint(founder.address, usdc("100"));
  await mockUSDC.mint(other.address, usdc("100"));
  await mockUSDC.connect(founder).approve(await escrow.getAddress(), usdc("100"));

  return { founder, agent, contributor, contributorTwo, other, mockUSDC, escrow, deadline };
}

async function createDefaultCampaign(fixture: Awaited<ReturnType<typeof deployFixture>>) {
  const { escrow, founder, agent, deadline } = fixture;
  await escrow
    .connect(founder)
    .createCampaign(agent.address, usdc("10"), usdc("2"), deadline, DISPUTE_WINDOW, true, "ipfs://campaign", hash("criteria"));
  const campaignId = 0n;
  await escrow.connect(founder).createTask(campaignId, usdc("1"), 2, true, "ipfs://task", hash("task-criteria"));
  const taskId = 0n;
  return { campaignId, taskId };
}

describe("CritiqueCampaignEscrowV1", () => {
  it("founder can create and fund a campaign; budget stored", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, deadline, mockUSDC } = fixture;

    await escrow
      .connect(founder)
      .createCampaign(agent.address, usdc("10"), usdc("2"), deadline, DISPUTE_WINDOW, true, "ipfs://c", hash("x"));

    const campaign = await escrow.getCampaign(0);
    expect(campaign.founder).to.equal(founder.address);
    expect(campaign.allowedAgent).to.equal(agent.address);
    expect(campaign.totalBudget).to.equal(usdc("10"));
    expect(campaign.maxRewardPerTask).to.equal(usdc("2"));
    expect(campaign.autoPayEnabled).to.equal(true);
    expect(await mockUSDC.balanceOf(await escrow.getAddress())).to.equal(usdc("10"));
    expect(await escrow.remainingBudget(0)).to.equal(usdc("10"));
  });

  it("rejects campaigns with past deadline, zero max reward, or oversized dispute window", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, deadline } = fixture;
    const block = await ethers.provider.getBlock("latest");
    const past = BigInt((block?.timestamp || 0) - 10);

    await expectCustomError(
      escrow.connect(founder).createCampaign(agent.address, 0, usdc("2"), past, DISPUTE_WINDOW, false, "", hash("x")),
      escrow,
      "InvalidDeadline"
    );
    await expectCustomError(
      escrow.connect(founder).createCampaign(agent.address, 0, 0, deadline, DISPUTE_WINDOW, false, "", hash("x")),
      escrow,
      "InvalidAmount"
    );
    await expectCustomError(
      escrow
        .connect(founder)
        .createCampaign(agent.address, 0, usdc("2"), deadline, 31 * 24 * 3600, false, "", hash("x")),
      escrow,
      "InvalidDisputeWindow"
    );
  });

  it("autopay requires an agent address", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, deadline } = fixture;
    await expectCustomError(
      escrow
        .connect(founder)
        .createCampaign(ethers.ZeroAddress, 0, usdc("2"), deadline, DISPUTE_WINDOW, true, "", hash("x")),
      escrow,
      "AgentRequired"
    );
  });

  it("only the founder can top up funding", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, other, mockUSDC } = fixture;
    await createDefaultCampaign(fixture);

    await mockUSDC.connect(other).approve(await escrow.getAddress(), usdc("5"));
    await expectCustomError(escrow.connect(other).fundCampaign(0, usdc("5")), escrow, "OnlyFounder");

    await escrow.connect(founder).fundCampaign(0, usdc("5"));
    expect((await escrow.getCampaign(0)).totalBudget).to.equal(usdc("15"));
  });

  it("task reward cannot exceed maxRewardPerTask; non-founder cannot create tasks", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, other } = fixture;
    await createDefaultCampaign(fixture);

    await expectCustomError(
      escrow.connect(founder).createTask(0, usdc("3"), 1, true, "", hash("t")),
      escrow,
      "RewardExceedsMax"
    );
    await expectCustomError(
      escrow.connect(other).createTask(0, usdc("1"), 1, true, "", hash("t")),
      escrow,
      "OnlyFounder"
    );
  });

  it("authorized agent can queue a payout; funds become reserved", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow
      .connect(agent)
      .agentQueuePayout(campaignId, taskId, contributor.address, hash("sub-1"), hash("eval-1"), "ipfs://eval-1");

    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.reserved).to.equal(usdc("1"));
    expect(await escrow.remainingBudget(campaignId)).to.equal(usdc("9"));

    const payout = await escrow.getPayout(campaignId, hash("sub-1"));
    expect(payout.state).to.equal(1n); // Queued
    expect(payout.contributor).to.equal(contributor.address);
    expect(payout.amount).to.equal(usdc("1"));
    expect(payout.evaluationHash).to.equal(hash("eval-1"));
    expect(payout.evaluationURI).to.equal("ipfs://eval-1");
  });

  it("unauthorized caller cannot queue a payout", async () => {
    const fixture = await deployFixture();
    const { escrow, other, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await expectCustomError(
      escrow.connect(other).agentQueuePayout(campaignId, taskId, contributor.address, hash("s"), hash("e"), ""),
      escrow,
      "OnlyAgent"
    );
  });

  it("agent cannot queue when autopay is disabled, campaign paused, or campaign closed", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(founder).setAutoPayEnabled(campaignId, false);
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("s1"), hash("e"), ""),
      escrow,
      "AutoPayDisabled"
    );
    await escrow.connect(founder).setAutoPayEnabled(campaignId, true);

    await escrow.connect(founder).setCampaignPaused(campaignId, true);
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("s2"), hash("e"), ""),
      escrow,
      "CampaignPausedError"
    );
    await escrow.connect(founder).setCampaignPaused(campaignId, false);

    await escrow.connect(founder).closeCampaign(campaignId);
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("s3"), hash("e"), ""),
      escrow,
      "CampaignClosedError"
    );
  });

  it("agent cannot queue after the deadline", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await increaseTime(4000);
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("s"), hash("e"), ""),
      escrow,
      "DeadlinePassed"
    );
  });

  it("agent cannot queue on unpublished tasks, above maxPayouts, or twice per contributor", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor, contributorTwo, other } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(founder).createTask(campaignId, usdc("1"), 1, false, "", hash("draft"));
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, 1, contributor.address, hash("d1"), hash("e"), ""),
      escrow,
      "TaskNotActive"
    );

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("q1"), hash("e"), "");
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("q2"), hash("e"), ""),
      escrow,
      "ContributorAlreadyPaid"
    );

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributorTwo.address, hash("q3"), hash("e"), "");
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, other.address, hash("q4"), hash("e"), ""),
      escrow,
      "TaskExhausted"
    );
  });

  it("submission hash cannot be reused", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor, contributorTwo } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("same"), hash("e"), "");
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributorTwo.address, hash("same"), hash("e"), ""),
      escrow,
      "SubmissionHashUsed"
    );
  });

  it("queueing cannot exceed the unreserved budget", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor, contributorTwo, deadline } = fixture;

    // Budget 1 USDC, task reward 1 USDC, 5 slots — only one payout fits.
    await escrow
      .connect(founder)
      .createCampaign(agent.address, usdc("1"), usdc("1"), deadline, DISPUTE_WINDOW, true, "", hash("c"));
    await escrow.connect(founder).createTask(0, usdc("1"), 5, true, "", hash("t"));

    await escrow.connect(agent).agentQueuePayout(0, 0, contributor.address, hash("b1"), hash("e"), "");
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(0, 0, contributorTwo.address, hash("b2"), hash("e"), ""),
      escrow,
      "InsufficientBudget"
    );
  });

  it("founder can cancel a queued payout; reserve and slots are released; hash stays blocked", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("c1"), hash("e"), "");
    await escrow.connect(founder).founderCancelQueuedPayout(campaignId, hash("c1"));

    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.reserved).to.equal(0n);
    expect((await escrow.getPayout(campaignId, hash("c1"))).state).to.equal(3n); // Cancelled

    // Same hash can never be re-queued...
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("c1"), hash("e"), ""),
      escrow,
      "SubmissionHashUsed"
    );
    // ...but the contributor slot is free for a revised submission.
    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("c1-rev"), hash("e"), "");
  });

  it("non-founder cannot cancel a queued payout", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor, other } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("n1"), hash("e"), "");
    await expectCustomError(escrow.connect(other).founderCancelQueuedPayout(campaignId, hash("n1")), escrow, "OnlyFounder");
  });

  it("queued payout cannot execute before the dispute window ends", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("w1"), hash("e"), "");
    await expectCustomError(escrow.executeQueuedPayout(campaignId, hash("w1")), escrow, "DisputeWindowActive");
  });

  it("queued payout executes after the window; contributor receives USDC; no double execution", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor, mockUSDC } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("x1"), hash("e"), "");
    await increaseTime(DISPUTE_WINDOW + 1);

    await escrow.executeQueuedPayout(campaignId, hash("x1"));
    expect(await mockUSDC.balanceOf(contributor.address)).to.equal(usdc("1"));

    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.reserved).to.equal(0n);
    expect(campaign.spent).to.equal(usdc("1"));

    await expectCustomError(escrow.executeQueuedPayout(campaignId, hash("x1")), escrow, "NotQueued");
  });

  it("payout queued before the deadline remains executable after it", async () => {
    const fixture = await deployFixture();
    const { escrow, agent, contributor, mockUSDC } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("l1"), hash("e"), "");
    await increaseTime(4000); // past both the window and the deadline
    await escrow.executeQueuedPayout(campaignId, hash("l1"));
    expect(await mockUSDC.balanceOf(contributor.address)).to.equal(usdc("1"));
  });

  it("cancelled payout cannot execute", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("z1"), hash("e"), "");
    await escrow.connect(founder).founderCancelQueuedPayout(campaignId, hash("z1"));
    await increaseTime(DISPUTE_WINDOW + 1);
    await expectCustomError(escrow.executeQueuedPayout(campaignId, hash("z1")), escrow, "NotQueued");
  });

  it("founder manual approve-and-pay transfers USDC immediately", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, contributor, mockUSDC } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow
      .connect(founder)
      .founderApproveAndPay(campaignId, taskId, contributor.address, hash("m1"), hash("eval"), "ipfs://eval");

    expect(await mockUSDC.balanceOf(contributor.address)).to.equal(usdc("1"));
    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.spent).to.equal(usdc("1"));
    expect((await escrow.getPayout(campaignId, hash("m1"))).state).to.equal(2n); // Paid
  });

  it("non-founder cannot manually approve; paused campaign blocks founder payouts", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, contributor, other } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await expectCustomError(
      escrow.connect(other).founderApproveAndPay(campaignId, taskId, contributor.address, hash("p1"), hash("e"), ""),
      escrow,
      "OnlyFounder"
    );

    await escrow.connect(founder).setCampaignPaused(campaignId, true);
    await expectCustomError(
      escrow.connect(founder).founderApproveAndPay(campaignId, taskId, contributor.address, hash("p2"), hash("e"), ""),
      escrow,
      "CampaignPausedError"
    );
  });

  it("founder-rejected submission hash cannot be queued or paid", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(founder).founderRejectSubmission(campaignId, hash("r1"));
    await expectCustomError(
      escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("r1"), hash("e"), ""),
      escrow,
      "SubmissionHashUsed"
    );
    await expectCustomError(
      escrow.connect(founder).founderApproveAndPay(campaignId, taskId, contributor.address, hash("r1"), hash("e"), ""),
      escrow,
      "SubmissionHashUsed"
    );
  });

  it("only the founder can pause or close", async () => {
    const fixture = await deployFixture();
    const { escrow, other } = fixture;
    const { campaignId } = await createDefaultCampaign(fixture);

    await expectCustomError(escrow.connect(other).setCampaignPaused(campaignId, true), escrow, "OnlyFounder");
    await expectCustomError(escrow.connect(other).closeCampaign(campaignId), escrow, "OnlyFounder");
  });

  it("refund pays back only unspent, unreserved funds; non-founder cannot refund", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor, other, mockUSDC } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    // Reserve 1 USDC via queue, spend 1 USDC via manual pay.
    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("f1"), hash("e"), "");
    await escrow.connect(founder).createTask(campaignId, usdc("1"), 1, true, "", hash("t2"));
    await escrow.connect(founder).founderApproveAndPay(campaignId, 1, contributor.address, hash("f2"), hash("e"), "");

    await expectCustomError(escrow.connect(founder).refundUnusedBudget(campaignId), escrow, "RefundUnavailable");

    await escrow.connect(founder).closeCampaign(campaignId);
    await expectCustomError(escrow.connect(other).refundUnusedBudget(campaignId), escrow, "OnlyFounder");

    const before = await mockUSDC.balanceOf(founder.address);
    await escrow.connect(founder).refundUnusedBudget(campaignId);
    const after = await mockUSDC.balanceOf(founder.address);

    // 10 funded - 1 spent - 1 reserved = 8 refundable.
    expect(after - before).to.equal(usdc("8"));
    const campaign = await escrow.getCampaign(campaignId);
    expect(campaign.totalBudget).to.equal(usdc("2"));
    expect(campaign.reserved).to.equal(usdc("1"));

    // The reserved queued payout still executes for the contributor.
    await increaseTime(DISPUTE_WINDOW + 1);
    await escrow.executeQueuedPayout(campaignId, hash("f1"));
    expect(await mockUSDC.balanceOf(contributor.address)).to.equal(usdc("2"));
  });

  it("cancelling a queued payout frees its reserve for refund", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor, mockUSDC } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("g1"), hash("e"), "");
    await escrow.connect(founder).closeCampaign(campaignId);
    await escrow.connect(founder).founderCancelQueuedPayout(campaignId, hash("g1"));

    const before = await mockUSDC.balanceOf(founder.address);
    await escrow.connect(founder).refundUnusedBudget(campaignId);
    const after = await mockUSDC.balanceOf(founder.address);
    expect(after - before).to.equal(usdc("10"));
  });

  it("agent cannot move funds directly: no transfer/withdraw path exists for the agent", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);

    // The only agent-callable function is agentQueuePayout, and executing a
    // queued payout only ever pays the contributor fixed at queue time.
    await expectCustomError(escrow.connect(agent).refundUnusedBudget(campaignId), escrow, "OnlyFounder");
    await expectCustomError(escrow.connect(agent).closeCampaign(campaignId), escrow, "OnlyFounder");
    await expectCustomError(
      escrow.connect(agent).founderApproveAndPay(campaignId, taskId, contributor.address, hash("a1"), hash("e"), ""),
      escrow,
      "OnlyFounder"
    );
    await expectCustomError(escrow.connect(agent).founderCancelQueuedPayout(campaignId, hash("a1")), escrow, "OnlyFounder");
  });

  it("stores task ids per campaign and exposes evaluation references", async () => {
    const fixture = await deployFixture();
    const { escrow, founder, agent, contributor } = fixture;
    const { campaignId, taskId } = await createDefaultCampaign(fixture);
    await escrow.connect(founder).createTask(campaignId, usdc("2"), 1, true, "ipfs://t2", hash("t2"));

    const ids = await escrow.getTaskIds(campaignId);
    expect(ids.length).to.equal(2);

    await escrow.connect(agent).agentQueuePayout(campaignId, taskId, contributor.address, hash("v1"), hash("eval-v1"), "ipfs://eval-v1");
    const payout = await escrow.getPayout(campaignId, hash("v1"));
    expect(payout.evaluationHash).to.equal(hash("eval-v1"));
    expect(payout.evaluationURI).to.equal("ipfs://eval-v1");
  });
});
