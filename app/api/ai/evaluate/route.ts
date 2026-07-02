import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// AI submission evaluation: summarizes and scores a contributor submission
// against founder-defined task criteria. The evaluation is advisory only —
// it can recommend approve/reject/revise/queue_payout, but every payout is
// enforced by the CritiqueCampaignEscrowV1 contract (budget, max reward,
// deadline, allowed agent, dispute window). The AI never moves funds.
// Server-side only: ANTHROPIC_API_KEY must never be exposed to the client.

export const runtime = "nodejs";

const EVALUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "qualityScore", "criteriaMatch", "spamRisk", "duplicateRisk", "suggestedAction", "reason"],
  properties: {
    summary: { type: "string" },
    qualityScore: { type: "integer", description: "0-100" },
    criteriaMatch: { type: "string", enum: ["low", "medium", "high"] },
    spamRisk: { type: "string", enum: ["low", "medium", "high"] },
    duplicateRisk: { type: "string", enum: ["low", "medium", "high"] },
    suggestedAction: { type: "string", enum: ["approve", "reject", "revise", "queue_payout"] },
    reason: { type: "string" }
  }
} as const;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured on this deployment (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  let body: {
    campaignGoal?: string;
    spamRules?: string;
    approvalMode?: string;
    task?: { title?: string; criteria?: string[]; requiredProof?: string[]; expectedDeliverable?: string };
    submission?: { content?: string; proofUrl?: string };
    otherSubmissionSummaries?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.task?.title || !body.submission?.content) {
    return NextResponse.json({ error: "task and submission are required." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system:
        "You evaluate contributor feedback submissions for Critique feedback campaigns. Score honestly against the " +
        "founder's task criteria. Flag praise-only, generic, copied, or off-topic feedback as spam/duplicate risk. " +
        "suggestedAction rules: use \"queue_payout\" only when criteriaMatch is high AND spamRisk and duplicateRisk " +
        "are low AND the approval mode is agent_queued; otherwise use \"approve\" for strong submissions in founder " +
        "mode, \"revise\" for fixable near-misses, and \"reject\" for clear failures. Your output is advisory: the " +
        "smart contract enforces all payout limits and the founder can always cancel a queued payout.",
      messages: [{ role: "user", content: JSON.stringify(body) }],
      output_config: { format: { type: "json_schema", schema: EVALUATION_SCHEMA } }
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The AI declined to evaluate this submission." }, { status: 422 });
    }

    const text = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (!text) {
      return NextResponse.json({ error: "The AI returned no evaluation." }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(text.text));
  } catch (error) {
    console.error("[Critique AI evaluate]", error);
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI is rate limited — try again shortly." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "AI request failed — try again." }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not evaluate the submission." }, { status: 500 });
  }
}
