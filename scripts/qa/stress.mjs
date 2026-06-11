// Critique launch stress harness (Arc testnet + real Supabase).
// Faithful to the product: same contract calls as BountyForm/review, same
// Supabase column mapping as lib/storage.ts. PRIVATE_KEY is read from env and
// NEVER printed/logged. Usage: node scripts/qa/stress.mjs <preflight|run>
import fs from "node:fs";
import { config as dotenv } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  decodeEventLog,
  getAddress,
  keccak256,
  stringToBytes,
  parseUnits,
  formatUnits
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createClient } from "@supabase/supabase-js";

dotenv({ path: ".env.local" });
dotenv({ path: ".env.qa.local" }); // adds public anon key only

const MODE = process.argv[2] || "preflight";

const RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
const CONTRACT = getAddress(process.env.NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT);
const USDC = getAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pk = process.env.PRIVATE_KEY || "";
if (pk && !pk.startsWith("0x")) pk = "0x" + pk;

if (!CONTRACT || !USDC || !SUPABASE_URL || !SUPABASE_ANON || !pk) {
  console.error("Missing required env (contract/usdc/supabase/pk). Aborting.");
  process.exit(1);
}

const arc = defineChain({
  id: CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: [RPC] } },
  testnet: true
});

const account = privateKeyToAccount(pk);
const publicClient = createPublicClient({ chain: arc, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: arc, transport: http(RPC) });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const USDC_DECIMALS = 6;
const parseUSDC = (v) => parseUnits(String(v || "0"), USDC_DECIMALS);
const fmtUSDC = (v) => formatUnits(v, USDC_DECIMALS);
const typeId = (t) => keccak256(stringToBytes(t));
const newId = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const usdcAbi = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] }
];
const dropAbi = [
  { type: "event", name: "BountyCreated", inputs: [
    { indexed: true, name: "bountyId", type: "uint256" }, { indexed: true, name: "founder", type: "address" },
    { indexed: false, name: "totalFundingRequired", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }, { indexed: false, name: "metadataURI", type: "string" }] },
  { type: "function", name: "createAndFundBounty", stateMutability: "nonpayable", inputs: [
    { name: "feedbackTypeIds", type: "bytes32[]" }, { name: "rewardAmounts", type: "uint256[]" }, { name: "slotCounts", type: "uint256[]" },
    { name: "deadline", type: "uint256" }, { name: "metadataURI", type: "string" }], outputs: [{ name: "bountyId", type: "uint256" }] },
  { type: "function", name: "approveSubmission", stateMutability: "nonpayable", inputs: [
    { name: "bountyId", type: "uint256" }, { name: "feedbackTypeId", type: "bytes32" }, { name: "tester", type: "address" }, { name: "submissionHash", type: "bytes32" }], outputs: [] }
];

const FEEDBACK_LABEL = {
  quick_written: "Written feedback",
  deep_product_review: "Deep product review",
  video_walkthrough: "Video walkthrough link",
  technical_proposal: "Technical improvement proposal"
};

function submissionHash(input) {
  const n = [
    input.bountyId, input.testerWallet.toLowerCase(), (input.feedbackType || "").trim(), (input.feedbackTypeLabel || "").trim(),
    (input.expectedRewardUSDC || "").trim(), (input.testerContext || "").trim(), (input.firstImpression || "").trim(), (input.firstAction || "").trim(),
    (input.confusionAnswer || "").trim(), (input.valueClarity || "").trim(), (input.hesitation || "").trim(), (input.decision || "").trim(),
    (input.decisionReason || "").trim(), (input.bestImprovement || "").trim(), "", "", "", (input.proofLink || "").trim(), (input.videoLink || "").trim(),
    (input.videoSummary || "").trim(), (input.biggestIssue || "").trim(), (input.videoImprovement || "").trim(), (input.contributorBackground || "").trim(),
    (input.technicalProblem || "").trim(), (input.technicalWhy || "").trim(), (input.suggestedFix || "").trim(), (input.expectedImpact || "").trim(),
    (input.estimatedDifficulty || "").trim(), (input.referenceLink || "").trim(), input.submissionId
  ].join("|");
  return keccak256(stringToBytes(n));
}

// mirror lib/storage.ts toSubmissionRow
function toSubmissionRow(s) {
  const isVideo = s.feedbackType === "video_walkthrough";
  const isTech = s.feedbackType === "technical_proposal";
  return {
    id: s.id, bounty_id: s.bountyId, tester_wallet: s.testerWallet,
    feedback_type: s.feedbackType || null, feedback_type_label: s.feedbackTypeLabel || null, expected_reward_usdc: s.expectedRewardUSDC || null,
    tester_context: s.testerContext || null,
    first_impression: isVideo ? s.videoSummary || null : s.firstImpression || null,
    tried_first: s.firstAction || null,
    confusion: isVideo ? s.biggestIssue || null : s.confusionAnswer || null,
    value_clarity: isTech ? s.technicalWhy || null : s.valueClarity || null,
    hesitation: s.hesitation || null, decision: s.decision || null, decision_reason: s.decisionReason || null,
    best_improvement: isVideo ? s.videoImprovement || null : s.bestImprovement || null,
    video_link: s.videoLink || null, technical_background: s.contributorBackground || null, technical_problem: s.technicalProblem || null,
    technical_fix: s.suggestedFix || null, expected_impact: s.expectedImpact || null, difficulty: s.estimatedDifficulty || null,
    proof_link: s.referenceLink || s.proofLink || null, submission_hash: s.submissionHash, status: s.status,
    rejection_reason: s.rejectionReason || null, payout_tx_hash: s.payoutTxHash || null, created_at: s.createdAt
  };
}

async function send(params) {
  // write with EIP-1559 default; fall back to legacy gasPrice if fees unsupported
  try {
    return await wallet.writeContract(params);
  } catch (e) {
    const msg = (e?.shortMessage || e?.message || "").toLowerCase();
    if (msg.includes("eip-1559") || msg.includes("maxfeepergas") || msg.includes("fee") || msg.includes("1559")) {
      const gasPrice = await publicClient.getGasPrice();
      return await wallet.writeContract({ ...params, gasPrice });
    }
    throw e;
  }
}

async function preflight() {
  console.log("founder address:", account.address);
  const [native, usdc, bountiesProbe] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account.address] }),
    supabase.from("bounties").select("id").limit(1)
  ]);
  console.log("native (gas) balance:", fmtUSDC(native), arc.nativeCurrency.symbol);
  console.log("USDC ERC20 balance:  ", fmtUSDC(usdc), "USDC");
  console.log("supabase SELECT ok:  ", bountiesProbe.error ? `ERROR ${bountiesProbe.error.message}` : "yes");
  console.log("chain id:            ", await publicClient.getChainId(), "(expected", CHAIN_ID + ")");
  const needed = parseUSDC("3.2");
  console.log("est. funding needed: ", fmtUSDC(needed), "USDC (3 bounties)");
  console.log("sufficient USDC:     ", usdc >= needed ? "yes" : "NO — will scale down or abort");
  console.log("sufficient gas:      ", native > 0n ? "yes" : "NO native balance for gas");
}

async function createBounty({ title, productUrl, instructions, rewards, deadlineMs }) {
  const id = newId("bounty");
  const deadlineSeconds = BigInt(Math.floor(deadlineMs / 1000));
  const ids = rewards.map((r) => typeId(r.feedbackType));
  const amts = rewards.map((r) => parseUSDC(r.rewardUSDC));
  const slots = rewards.map((r) => BigInt(r.slots));
  const total = rewards.reduce((t, r) => t + parseUSDC(r.rewardUSDC) * BigInt(r.slots), 0n);

  const allowance = await publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "allowance", args: [account.address, CONTRACT] });
  if (allowance < total) {
    const ah = await send({ address: USDC, abi: usdcAbi, functionName: "approve", args: [CONTRACT, total], account });
    await publicClient.waitForTransactionReceipt({ hash: ah });
  }
  const createArgs = [ids, amts, slots, deadlineSeconds, `local://${id}`];
  await publicClient.simulateContract({ address: CONTRACT, abi: dropAbi, functionName: "createAndFundBounty", args: createArgs, account: account.address });
  const ch = await send({ address: CONTRACT, abi: dropAbi, functionName: "createAndFundBounty", args: createArgs, account });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: ch });
  const created = receipt.logs.map((l) => { try { return decodeEventLog({ abi: dropAbi, data: l.data, topics: l.topics }); } catch { return null; } }).find((l) => l?.eventName === "BountyCreated");
  const contractBountyId = created?.args?.bountyId?.toString();
  if (!contractBountyId) throw new Error("No BountyCreated event for " + title);

  const feedback_config = rewards.map((r) => ({ feedbackType: r.feedbackType, rewardUSDC: String(r.rewardUSDC), slots: r.slots, label: FEEDBACK_LABEL[r.feedbackType], enabled: true }));
  const maxReward = Math.max(...rewards.map((r) => Number(r.rewardUSDC)));
  const row = {
    id, contract_bounty_id: contractBountyId, founder_address: account.address, title, product_url: productUrl,
    instructions, reward_usdc: String(maxReward), feedback_config, max_submissions: rewards.reduce((t, r) => t + r.slots, 0),
    deadline: new Date(deadlineMs).toISOString(), status: "open", created_at: new Date().toISOString(), tx_hashes: [ch]
  };
  const { error } = await supabase.from("bounties").upsert(row);
  if (error) throw new Error("Supabase bounty save failed: " + error.message);
  console.log(`  created "${title}"  app_id=${id}  contract_id=${contractBountyId}  funded=${fmtUSDC(total)} USDC  tx=${ch}`);
  return { id, contractBountyId, rewards };
}

async function insertSubmission(bounty, s) {
  const id = newId("submission");
  const expected = bounty.rewards.find((r) => r.feedbackType === s.feedbackType)?.rewardUSDC;
  const full = { ...s, id, bountyId: bounty.id, feedbackTypeLabel: FEEDBACK_LABEL[s.feedbackType], expectedRewardUSDC: expected ? String(expected) : undefined, status: "pending", createdAt: new Date().toISOString() };
  full.submissionHash = submissionHash({ ...full, submissionId: id });
  const row = toSubmissionRow(full);
  let { error } = await supabase.from("submissions").insert(row);
  if (error && /feedback_type_label|expected_reward_usdc|schema cache/i.test(error.message || "")) {
    const { feedback_type_label, expected_reward_usdc, ...legacy } = row;
    ({ error } = await supabase.from("submissions").insert(legacy));
  }
  if (error) throw new Error("submission insert failed: " + error.message);
  return full;
}

async function run() {
  const results = { bounties: [], submissions: 0, approvals: [], rejections: [], duplicateApproveBlocked: null, counts: {} };
  const hourMs = 3600 * 1000;
  const tester = () => privateKeyToAccount(generatePrivateKey()).address;

  console.log("founder:", account.address);
  const usdc0 = await publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account.address] });
  console.log("USDC before:", fmtUSDC(usdc0), "\n");

  console.log("PHASE 1 — create + fund 3 bounties");
  const normal = await createBounty({
    title: "QA Normal Bounty - Delete Later", productUrl: "https://example.com/qa-normal",
    instructions: "QA normal bounty. Review the landing page and report clarity, friction, and value.",
    rewards: [
      { feedbackType: "quick_written", rewardUSDC: "0.25", slots: 4 },
      { feedbackType: "deep_product_review", rewardUSDC: "0.25", slots: 2 },
      { feedbackType: "video_walkthrough", rewardUSDC: "0.25", slots: 2 },
      { feedbackType: "technical_proposal", rewardUSDC: "0.25", slots: 2 }
    ], deadlineMs: Date.now() + 72 * hourMs
  });
  const low = await createBounty({
    title: "QA Low Reward Bounty - Delete Later", productUrl: "https://example.com/qa-low",
    instructions: "QA low reward bounty edge: minimum reward, single slot.",
    rewards: [{ feedbackType: "quick_written", rewardUSDC: "0.1", slots: 1 }], deadlineMs: Date.now() + 48 * hourMs
  });
  const edge = await createBounty({
    title: "QA Edge Case Bounty - Delete Later",
    productUrl: "https://example.com/qa-edge?q=" + encodeURIComponent("<script>&\"'"),
    instructions: "QA edge case: special chars in URL, single technical slot, near-term deadline.\nLine break in instructions.",
    rewards: [{ feedbackType: "technical_proposal", rewardUSDC: "0.5", slots: 1 }], deadlineMs: Date.now() + 2 * hourMs
  });
  results.bounties = [normal, low, edge].map((b) => ({ id: b.id, contractBountyId: b.contractBountyId }));

  console.log("\nPHASE 2 — 10 submissions to the normal bounty (varied content + types)");
  const W = (extra) => ({ feedbackType: "quick_written", testerWallet: tester(), testerContext: "QA tester", firstImpression: "It looks like a feedback bounty tool.", firstAction: "Tried to read the hero.", confusionAnswer: "Pricing was unclear.", valueClarity: "USDC rewards are clear.", hesitation: "Trust in payout.", decision: "Maybe", decisionReason: "Promising but needs proof.", bestImprovement: "Add social proof.", ...extra });
  const D = (extra) => ({ feedbackType: "deep_product_review", testerWallet: tester(), testerContext: "Senior PM", firstImpression: "Feedback marketplace.", firstAction: "Explored create flow.", confusionAnswer: "Funding step needs explanation.", valueClarity: "Clear value for founders.", hesitation: "Onboarding length.", decision: "Yes", decisionReason: "Solves a real problem.", bestImprovement: "Streamline funding.", ...extra });
  const V = (extra) => ({ feedbackType: "video_walkthrough", testerWallet: tester(), videoLink: "https://www.loom.com/share/qa-demo", videoSummary: "Walkthrough of create+submit.", biggestIssue: "Wallet step confused me.", videoImprovement: "Add a progress indicator.", decision: "Maybe", decisionReason: "Good but rough edges.", ...extra });
  const T = (extra) => ({ feedbackType: "technical_proposal", testerWallet: tester(), contributorBackground: "Frontend dev", technicalProblem: "No optimistic UI on submit.", technicalWhy: "Perceived slowness.", suggestedFix: "Add pending state + skeleton.", expectedImpact: "Higher completion rate.", estimatedDifficulty: "Medium", referenceLink: "https://github.com/example/issue/1", ...extra });

  const subSpecs = [
    W({ firstImpression: "Short." }),                                                   // 1 short
    W({ bestImprovement: "Add a much longer, detailed explanation. ".repeat(20) }),     // 2 long
    W({ confusionAnswer: "Line one.\nLine two.\nLine three." }),                         // 3 line breaks
    D({ valueClarity: "See https://usecritique.xyz for the live product." }),            // 4 URL
    W({ hesitation: "Special chars: <>&\"'`{}[]() émojî ✅🚀 — ünïcode" }),               // 5 special chars
    T({}),                                                                               // 6 technical proposal
    W({ decisionReason: "Harsh but valid: the copy overpromises and underdelivers." }),  // 7 harsh
    D({ firstImpression: "Feedback marketplace." }),                                     // 8 duplicate-like
    V({ videoSummary: "Very long summary. ".repeat(60) }),                               // 9 very long textarea
    W({ bestImprovement: "Realistic: clarify the reward-per-type model up front." })     // 10 normal
  ];
  const inserted = [];
  for (let i = 0; i < subSpecs.length; i++) {
    const s = await insertSubmission(normal, subSpecs[i]);
    inserted.push(s);
    console.log(`  submission ${i + 1}/10  type=${s.feedbackType}  wallet=${s.testerWallet.slice(0, 10)}...  id=${s.id}`);
  }
  results.submissions = inserted.length;

  console.log("\nPHASE 3 — cross-session persistence (fresh Supabase client, no localStorage)");
  const fresh = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: freshBounty } = await fresh.from("bounties").select("*").eq("id", normal.id).maybeSingle();
  const { data: freshSubs } = await fresh.from("submissions").select("*").eq("bounty_id", normal.id);
  console.log("  fresh client sees bounty:", freshBounty ? `yes (${freshBounty.title})` : "NO");
  console.log("  fresh client sees submissions:", (freshSubs || []).length, "(expected 10)");
  results.crossSession = { bountyVisible: !!freshBounty, submissionCount: (freshSubs || []).length };

  console.log("\nPHASE 4 — approve 3 (on-chain payout) + reject 2");
  const writtenSubs = inserted.filter((s) => s.feedbackType === "quick_written");
  const toApprove = writtenSubs.slice(0, 3);
  for (const s of toApprove) {
    const txHash = await send({ address: CONTRACT, abi: dropAbi, functionName: "approveSubmission",
      args: [BigInt(normal.contractBountyId), typeId(s.feedbackType), getAddress(s.testerWallet), s.submissionHash], account });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    const { error } = await supabase.from("submissions").update({ status: "approved", payout_tx_hash: txHash }).eq("bounty_id", normal.id).eq("id", s.id);
    if (error) throw new Error("approve DB update failed: " + error.message);
    results.approvals.push({ id: s.id, tester: s.testerWallet, payoutTxHash: txHash });
    console.log(`  APPROVED ${s.id}  payout tx=${txHash}`);
  }
  const toReject = inserted.filter((s) => !toApprove.includes(s)).slice(0, 2);
  for (const s of toReject) {
    const { error } = await supabase.from("submissions").update({ status: "rejected", rejection_reason: "QA: not specific enough." }).eq("bounty_id", normal.id).eq("id", s.id);
    if (error) throw new Error("reject DB update failed: " + error.message);
    results.rejections.push({ id: s.id });
    console.log(`  REJECTED ${s.id}`);
  }

  console.log("\nPHASE 5 — duplicate-payout attempt (must revert on-chain)");
  try {
    await publicClient.simulateContract({ address: CONTRACT, abi: dropAbi, functionName: "approveSubmission",
      args: [BigInt(normal.contractBountyId), typeId(toApprove[0].feedbackType), getAddress(toApprove[0].testerWallet), toApprove[0].submissionHash], account: account.address });
    results.duplicateApproveBlocked = false;
    console.log("  WARNING: duplicate approve simulation did NOT revert");
  } catch (e) {
    results.duplicateApproveBlocked = true;
    console.log("  OK: duplicate approve reverted ->", (e.shortMessage || e.message || "").split("\n")[0]);
  }

  console.log("\nPHASE 6 — verify counts from Supabase (fresh read)");
  const { data: finalSubs } = await fresh.from("submissions").select("status").eq("bounty_id", normal.id);
  const counts = { total: finalSubs.length, approved: 0, pending: 0, rejected: 0 };
  for (const r of finalSubs) counts[r.status] = (counts[r.status] || 0) + 1;
  results.counts = counts;
  console.log("  counts:", JSON.stringify(counts), "(expected total 10, approved 3, rejected 2, pending 5)");

  const usdc1 = await publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account.address] });
  results.usdcSpent = fmtUSDC(usdc0 - usdc1);
  console.log("\nUSDC after:", fmtUSDC(usdc1), " spent:", results.usdcSpent);

  fs.writeFileSync("scripts/qa/qa-results.json", JSON.stringify(results, null, 2));
  console.log("\nwrote scripts/qa/qa-results.json");
  console.log("\nPUBLIC LINKS:");
  for (const b of results.bounties) console.log("  https://usecritique.xyz/bounty/" + b.id);
}

if (MODE === "preflight") await preflight();
else if (MODE === "run") await run();
else { console.error("unknown mode:", MODE); process.exit(1); }
