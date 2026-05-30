"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type TestResult = {
  status: "idle" | "success" | "fail";
  title: string;
  details: Record<string, string>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseDomain() {
  if (!supabaseUrl) return "missing";
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "invalid URL";
  }
}

function getKeyPrefix() {
  if (!supabaseAnonKey) return "missing";
  if (supabaseAnonKey.startsWith("sb_publishable_")) return "sb_publishable";
  if (supabaseAnonKey.split(".").length === 3) return "JWT anon";
  return "unknown";
}

function getSafeErrorString(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function resultRows(result: TestResult) {
  return Object.entries(result.details).map(([label, value]) => (
    <div key={label} className="grid gap-1 rounded-lg border border-line/70 bg-white p-3 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="break-words text-sm font-semibold text-ink">{value}</dd>
    </div>
  ));
}

export default function SupabaseDebugPage() {
  const [readResult, setReadResult] = useState<TestResult>({
    status: "idle",
    title: "Not tested",
    details: {}
  });
  const [insertResult, setInsertResult] = useState<TestResult>({
    status: "idle",
    title: "Not tested",
    details: {}
  });
  const [isReading, setIsReading] = useState(false);
  const [isInserting, setIsInserting] = useState(false);

  const diagnostics = useMemo(
    () => [
      ["Supabase URL configured", supabaseUrl ? "yes" : "no"],
      ["Supabase URL domain", getSupabaseDomain()],
      ["Supabase anon key configured", supabaseAnonKey ? "yes" : "no"],
      ["Supabase anon key prefix", getKeyPrefix()],
      ["Supabase enabled", isSupabaseConfigured ? "yes" : "no"]
    ],
    []
  );

  async function testRead() {
    setIsReading(true);
    setReadResult({ status: "idle", title: "Testing read...", details: {} });

    if (!supabase) {
      setReadResult({
        status: "fail",
        title: "Supabase client is not configured",
        details: {
          success: "no",
          message: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
        }
      });
      setIsReading(false);
      return;
    }

    try {
      const response = await supabase.from("bounties").select("id").limit(1);
      console.info("[Supabase debug] read response", response);
      if (response.error) {
        setReadResult({
          status: "fail",
          title: "Read failed",
          details: {
            success: "no",
            "HTTP status": String(response.status || "unavailable"),
            "Supabase error": response.error.message || "No Supabase error message.",
            "safe raw error": getSafeErrorString(response.error)
          }
        });
        return;
      }

      setReadResult({
        status: "success",
        title: "Read succeeded",
        details: {
          success: "yes",
          "HTTP status": String(response.status || "unavailable"),
          rows: String(response.data?.length || 0)
        }
      });
    } catch (caught) {
      console.error("[Supabase debug] read exception", caught);
      setReadResult({
        status: "fail",
        title: "Read threw an exception",
        details: {
          success: "no",
          "HTTP status": "unavailable",
          "Supabase error": caught instanceof Error ? caught.message : "No Supabase error message.",
          "safe raw error": getSafeErrorString(caught)
        }
      });
    } finally {
      setIsReading(false);
    }
  }

  async function testInsert() {
    setIsInserting(true);
    setInsertResult({ status: "idle", title: "Testing insert...", details: {} });

    if (!supabase) {
      setInsertResult({
        status: "fail",
        title: "Supabase client is not configured",
        details: {
          success: "no",
          message: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
        }
      });
      setIsInserting(false);
      return;
    }

    const id = `debug-${Date.now()}`;

    try {
      const response = await supabase
        .from("bounties")
        .insert({
          id,
          contract_bounty_id: "debug",
          founder_address: "0x0000000000000000000000000000000000000000",
          title: "Debug bounty",
          product_url: "https://example.com",
          instructions: "Debug insert test",
          reward_usdc: "0.1",
          max_submissions: 1,
          deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: "open",
          tx_hashes: []
        })
        .select("id")
        .single();

      console.info("[Supabase debug] insert response", response);
      if (response.error) {
        setInsertResult({
          status: "fail",
          title: "Insert failed",
          details: {
            success: "no",
            "inserted id": id,
            "HTTP status": String(response.status || "unavailable"),
            "Supabase error": response.error.message || "No Supabase error message.",
            "safe raw error": getSafeErrorString(response.error)
          }
        });
        return;
      }

      setInsertResult({
        status: "success",
        title: "Insert succeeded",
        details: {
          success: "yes",
          "inserted id": response.data?.id || id,
          "HTTP status": String(response.status || "unavailable")
        }
      });
    } catch (caught) {
      console.error("[Supabase debug] insert exception", caught);
      setInsertResult({
        status: "fail",
        title: "Insert threw an exception",
        details: {
          success: "no",
          "inserted id": id,
          "HTTP status": "unavailable",
          "Supabase error": caught instanceof Error ? caught.message : "No Supabase error message.",
          "safe raw error": getSafeErrorString(caught)
        }
      });
    } finally {
      setIsInserting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Diagnostics</p>
          <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Supabase debug</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Safe runtime checks for the shared database configuration. Open the browser console for the real error
            objects when a request fails.
          </p>
        </div>

        <section className="surface p-5 sm:p-6">
          <h2 className="text-lg font-black text-ink">Runtime config</h2>
          <dl className="mt-4 grid gap-3">
            {diagnostics.map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-lg border border-line/70 bg-panel/55 p-3 sm:grid-cols-[220px_1fr]">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</dt>
                <dd className="break-words text-sm font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="surface p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black text-ink">Test Supabase read</h2>
              <button type="button" onClick={testRead} disabled={isReading} className="btn-secondary">
                {isReading ? "Testing..." : "Test Supabase read"}
              </button>
            </div>
            {readResult.status === "idle" && !Object.keys(readResult.details).length ? (
              <div className="mt-4">
                <EmptyState title="Read not tested" body="This will select id from bounties with limit 1." />
              </div>
            ) : (
              <div className="mt-4">
                <p
                  className={`notice mb-4 font-semibold ${
                    readResult.status === "success"
                      ? "border-action/20 bg-action/10 text-action"
                      : readResult.status === "fail"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-line/80 bg-panel/70 text-muted"
                  }`}
                >
                  {readResult.title}
                </p>
                <dl className="grid gap-3">{resultRows(readResult)}</dl>
              </div>
            )}
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-black text-ink">Test Supabase insert</h2>
              <button type="button" onClick={testInsert} disabled={isInserting} className="btn-secondary">
                {isInserting ? "Testing..." : "Test Supabase insert"}
              </button>
            </div>
            {insertResult.status === "idle" && !Object.keys(insertResult.details).length ? (
              <div className="mt-4">
                <EmptyState title="Insert not tested" body="This will create one harmless debug bounty row." />
              </div>
            ) : (
              <div className="mt-4">
                <p
                  className={`notice mb-4 font-semibold ${
                    insertResult.status === "success"
                      ? "border-action/20 bg-action/10 text-action"
                      : insertResult.status === "fail"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-line/80 bg-panel/70 text-muted"
                  }`}
                >
                  {insertResult.title}
                </p>
                <dl className="grid gap-3">{resultRows(insertResult)}</dl>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
