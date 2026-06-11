// Reads back the QA data via the public anon key (same path the browser uses)
// to prove Supabase persistence + correct schema fields. No writes.
import fs from "node:fs";
import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv({ path: ".env.local" });
dotenv({ path: ".env.qa.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const results = JSON.parse(fs.readFileSync("scripts/qa/qa-results.json", "utf8"));
const normalId = results.bounties[0].id;

const { data: bounties } = await supabase.from("bounties").select("*").in("id", results.bounties.map((b) => b.id));
console.log("=== BOUNTIES (read via anon key) ===");
for (const b of bounties) {
  console.log(`- ${b.title}`);
  console.log(`    id=${b.id} contract_id=${b.contract_bounty_id} status=${b.status}`);
  console.log(`    founder_address=${b.founder_address}`);
  console.log(`    max_submissions=${b.max_submissions} created_at=${b.created_at}`);
  console.log(`    tx_hashes=${(b.tx_hashes || []).length}`);
}

const { data: subs } = await supabase.from("submissions").select("*").eq("bounty_id", normalId).order("created_at", { ascending: false });
const byStatus = subs.reduce((a, s) => ((a[s.status] = (a[s.status] || 0) + 1), a), {});
const allSameBounty = subs.every((s) => s.bounty_id === normalId);
const approved = subs.filter((s) => s.status === "approved");
const rejected = subs.filter((s) => s.status === "rejected");

console.log("\n=== NORMAL BOUNTY SUBMISSIONS ===");
console.log("count:", subs.length, "| status:", JSON.stringify(byStatus));
console.log("all linked to same bounty_id:", allSameBounty);
console.log("all have tester_wallet:", subs.every((s) => /^0x[a-fA-F0-9]{40}$/.test(s.tester_wallet || "")));
console.log("all have submission_hash:", subs.every((s) => /^0x[a-fA-F0-9]{64}$/.test(s.submission_hash || "")));
console.log("approved all have payout_tx_hash:", approved.length > 0 && approved.every((s) => /^0x[a-fA-F0-9]{64}$/.test(s.payout_tx_hash || "")));
console.log("rejected all have rejection_reason:", rejected.length > 0 && rejected.every((s) => !!s.rejection_reason));
console.log("feedback types present:", [...new Set(subs.map((s) => s.feedback_type))].join(", "));
console.log("\napproved payout tx hashes:");
for (const s of approved) console.log("  ", s.id, "->", s.payout_tx_hash);
