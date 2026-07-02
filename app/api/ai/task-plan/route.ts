import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// AI Campaign Builder: turns a founder's campaign goal + limits into a draft
// task plan. Drafts are suggestions only — the founder edits, approves, and
// publishes them, and the smart contract enforces every payout limit.
// Server-side only: ANTHROPIC_API_KEY must never be exposed to the client.

export const runtime = "nodejs";

const TASK_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tasks"],
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "category", "reason", "reward", "criteria", "requiredProof", "expectedDeliverable"],
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          reason: { type: "string" },
          reward: { type: "string", description: "USDC amount as a decimal string, e.g. \"3\" or \"2.5\"" },
          criteria: { type: "array", items: { type: "string" } },
          requiredProof: { type: "array", items: { type: "string" } },
          expectedDeliverable: { type: "string" }
        }
      }
    }
  }
} as const;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured on this deployment (missing ANTHROPIC_API_KEY). Create tasks manually instead." },
      { status: 503 }
    );
  }

  let body: {
    goal?: string;
    productUrl?: string;
    totalBudgetUSDC?: string;
    maxRewardPerTaskUSDC?: string;
    deadline?: string;
    acceptanceCriteria?: string[];
    requireProof?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.goal || !body.totalBudgetUSDC || !body.maxRewardPerTaskUSDC) {
    return NextResponse.json(
      { error: "goal, totalBudgetUSDC, and maxRewardPerTaskUSDC are required." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system:
        "You are the Critique AI Campaign Builder. Critique lets founders fund USDC feedback campaigns on Arc testnet " +
        "and pay contributors for approved product feedback. You draft a small plan of focused feedback tasks " +
        "(micro-bounties) for a founder's campaign. Rules: stay strictly within the campaign budget (the sum of " +
        "reward * expected payouts should not exceed it); no single task reward may exceed the max reward per task; " +
        "3-6 tasks; each task must be a concrete review job (e.g. first-use UX review, copy clarity review, technical " +
        "review, onboarding walkthrough, landing page review, launch readiness synthesis) — never generic marketplace " +
        "gigs. Criteria must be specific and checkable (exact page/step tested, minimum number of specific issues, " +
        "proof required, one suggested fix, no praise-only or duplicate feedback). Rewards are USDC decimal strings.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            goal: body.goal,
            productUrl: body.productUrl || null,
            totalBudgetUSDC: body.totalBudgetUSDC,
            maxRewardPerTaskUSDC: body.maxRewardPerTaskUSDC,
            deadline: body.deadline || null,
            campaignAcceptanceCriteria: body.acceptanceCriteria || [],
            requireProof: body.requireProof ?? true
          })
        }
      ],
      output_config: { format: { type: "json_schema", schema: TASK_PLAN_SCHEMA } }
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The AI declined to draft this plan." }, { status: 422 });
    }

    const text = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (!text) {
      return NextResponse.json({ error: "The AI returned no plan." }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(text.text));
  } catch (error) {
    console.error("[Critique AI task-plan]", error);
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI is rate limited — try again shortly." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "AI request failed — try again." }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not generate a task plan." }, { status: 500 });
  }
}
