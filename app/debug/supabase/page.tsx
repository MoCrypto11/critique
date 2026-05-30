"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type DebugStatus = "idle" | "running" | "success" | "fail";

type DebugResult = {
  operation: string;
  status: DebugStatus;
  summary: string;
  errorName?: string;
  errorMessage?: string;
  errorCode?: string;
  httpStatus?: string;
  safeJson?: string;
  diagnosis?: string;
  details?: Record<string, string>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const expectedHostname = "ptzjyuwrjsvyptuwffn.supabase.co";

function getSupabaseHostname() {
  if (!supabaseUrl) return "missing";
  try {
    return new URL(supabaseUrl).hostname;
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

function safeStringify(value: unknown) {
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (_key, nestedValue) => {
        if (typeof nestedValue === "object" && nestedValue !== null) {
          if (seen.has(nestedValue)) return "[Circular]";
          seen.add(nestedValue);
        }
        return nestedValue;
      },
      2
    );
  } catch {
    return String(value);
  }
}

function getErrorField(error: unknown, field: "name" | "message" | "code") {
  if (!error || typeof error !== "object") return "";
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function diagnose(errorMessage?: string, errorCode?: string, httpStatus?: string) {
  const lower = `${errorMessage || ""} ${errorCode || ""}`.toLowerCase();
  if (lower.includes("relation") && lower.includes("does not exist")) return "bounties table missing";
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    httpStatus === "401" ||
    httpStatus === "403"
  ) {
    return "RLS/policy/key issue";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return "network/config/CORS/reachability issue";
  }
  return "";
}

function fromFailure(operation: string, error: unknown, httpStatus?: string): DebugResult {
  const errorName = getErrorField(error, "name") || (error instanceof Error ? error.name : "");
  const errorMessage = getErrorField(error, "message") || (error instanceof Error ? error.message : String(error));
  const errorCode = getErrorField(error, "code");

  return {
    operation,
    status: "fail",
    summary: `${operation} failed`,
    errorName: errorName || "unavailable",
    errorMessage: errorMessage || "unavailable",
    errorCode: errorCode || "unavailable",
    httpStatus: httpStatus || "unavailable",
    safeJson: safeStringify(error),
    diagnosis: diagnose(errorMessage, errorCode, httpStatus) || "See browser console for the full error object."
  };
}

function fromSuccess(operation: string, details: Record<string, string> = {}, httpStatus?: string): DebugResult {
  return {
    operation,
    status: "success",
    summary: `${operation} succeeded`,
    httpStatus: httpStatus || "unavailable",
    details
  };
}

function resultClass(status: DebugStatus) {
  if (status === "success") return "border-action/20 bg-action/10 text-action";
  if (status === "fail") return "border-red-200 bg-red-50 text-red-700";
  if (status === "running") return "border-line/80 bg-panel/70 text-muted";
  return "border-line/80 bg-white text-muted";
}

function ResultCard({ result }: { result: DebugResult }) {
  const rows = [
    ["status", result.status],
    ["operation", result.operation],
    ["error.name", result.errorName || "none"],
    ["error.message", result.errorMessage || "none"],
    ["error.code", result.errorCode || "none"],
    ["HTTP status", result.httpStatus || "unavailable"],
    ["diagnosis", result.diagnosis || "none"],
    ["safe JSON", result.safeJson || "none"],
    ...Object.entries(result.details || {})
  ];

  return (
    <section className="surface p-5 sm:p-6">
      <div className={`notice mb-4 font-semibold ${resultClass(result.status)}`}>{result.summary}</div>
      <dl className="grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 rounded-lg border border-line/70 bg-white p-3 sm:grid-cols-[180px_1fr]">
            <dt className="text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</dt>
            <dd className="break-words text-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function SupabaseDebugPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const hostname = getSupabaseHostname();
  const hostnameMatches = hostname === expectedHostname;

  const diagnostics = useMemo(
    () => [
      ["Supabase URL configured", supabaseUrl ? "yes" : "no"],
      ["Supabase URL hostname", hostname],
      ["Expected hostname", expectedHostname],
      ["Supabase anon key configured", supabaseAnonKey ? "yes" : "no"],
      ["Supabase anon key prefix", getKeyPrefix()],
      ["Supabase enabled", isSupabaseConfigured ? "yes" : "no"]
    ],
    [hostname]
  );

  function appendResult(result: DebugResult) {
    setResults((current) => [...current.filter((item) => item.operation !== result.operation), result]);
  }

  async function runStep(operation: string, task: () => Promise<DebugResult>) {
    appendResult({ operation, status: "running", summary: `${operation} running` });
    try {
      const result = await task();
      appendResult(result);
      return result;
    } catch (caught) {
      console.error(`[Supabase debug] ${operation} exception`, caught);
      const result = fromFailure(operation, caught);
      appendResult(result);
      return result;
    }
  }

  async function runDiagnostics() {
    setIsRunning(true);
    setResults([]);
    const debugId = `debug-${Date.now()}`;

    await runStep("A) Supabase client initialization", async () => {
      if (!supabaseUrl || !supabaseAnonKey || !supabase) {
        return fromFailure("A) Supabase client initialization", {
          name: "ConfigError",
          message: "Supabase URL or anon key is missing."
        });
      }

      try {
        new URL(supabaseUrl);
      } catch (caught) {
        return fromFailure("A) Supabase client initialization", caught);
      }

      return fromSuccess("A) Supabase client initialization", {
        "URL configured": "yes",
        "anon key configured": "yes",
        "client created": "yes"
      });
    });

    await runStep("Direct browser fetch reachability", async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        return fromFailure("Direct browser fetch reachability", {
          name: "ConfigError",
          message: "Supabase URL or anon key is missing."
        });
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/bounties?select=id&limit=1`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      });

      let body: unknown = "";
      const text = await response.text();
      try {
        body = text ? JSON.parse(text) : "";
      } catch {
        body = text.slice(0, 800);
      }

      console.info("[Supabase debug] direct fetch response", {
        ok: response.ok,
        status: response.status,
        body
      });

      if (!response.ok) {
        return fromFailure(
          "Direct browser fetch reachability",
          {
            name: "FetchResponseError",
            message: typeof body === "object" && body && "message" in body ? String((body as { message?: unknown }).message) : text,
            code: typeof body === "object" && body && "code" in body ? String((body as { code?: unknown }).code) : "",
            body
          },
          String(response.status)
        );
      }

      return fromSuccess(
        "Direct browser fetch reachability",
        {
          ok: "yes",
          "response body": safeStringify(body)
        },
        String(response.status)
      );
    });

    await runStep("B) Supabase client read bounties", async () => {
      if (!supabase) {
        return fromFailure("B) Supabase client read bounties", {
          name: "ConfigError",
          message: "Supabase client is not configured."
        });
      }

      const response = await supabase.from("bounties").select("id").limit(1);
      console.info("[Supabase debug] client read response", response);
      if (response.error) {
        return fromFailure("B) Supabase client read bounties", response.error, String(response.status || ""));
      }

      return fromSuccess(
        "B) Supabase client read bounties",
        {
          rows: String(response.data?.length || 0)
        },
        String(response.status || "")
      );
    });

    await runStep("C) Supabase client insert bounty", async () => {
      if (!supabase) {
        return fromFailure("C) Supabase client insert bounty", {
          name: "ConfigError",
          message: "Supabase client is not configured."
        });
      }

      const response = await supabase
        .from("bounties")
        .insert({
          id: debugId,
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

      console.info("[Supabase debug] client insert response", response);
      if (response.error) {
        return fromFailure("C) Supabase client insert bounty", response.error, String(response.status || ""));
      }

      return fromSuccess(
        "C) Supabase client insert bounty",
        {
          "inserted id": response.data?.id || debugId
        },
        String(response.status || "")
      );
    });

    await runStep("D) Supabase client read back debug row", async () => {
      if (!supabase) {
        return fromFailure("D) Supabase client read back debug row", {
          name: "ConfigError",
          message: "Supabase client is not configured."
        });
      }

      const response = await supabase.from("bounties").select("id,title,status").eq("id", debugId).maybeSingle();
      console.info("[Supabase debug] client read back response", response);
      if (response.error) {
        return fromFailure("D) Supabase client read back debug row", response.error, String(response.status || ""));
      }
      if (!response.data) {
        return fromFailure(
          "D) Supabase client read back debug row",
          {
            name: "MissingRow",
            message: "Debug row was not found after insert."
          },
          String(response.status || "")
        );
      }

      return fromSuccess(
        "D) Supabase client read back debug row",
        {
          "read id": response.data.id,
          title: response.data.title,
          status: response.data.status
        },
        String(response.status || "")
      );
    });

    await runStep("E) Supabase client delete debug row", async () => {
      if (!supabase) {
        return fromFailure("E) Supabase client delete debug row", {
          name: "ConfigError",
          message: "Supabase client is not configured."
        });
      }

      const response = await supabase.from("bounties").delete().eq("id", debugId).select("id");
      console.info("[Supabase debug] client delete response", response);
      if (response.error) {
        return fromFailure("E) Supabase client delete debug row", response.error, String(response.status || ""));
      }

      return fromSuccess(
        "E) Supabase client delete debug row",
        {
          "deleted rows": String(response.data?.length || 0)
        },
        String(response.status || "")
      );
    });

    setIsRunning(false);
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Diagnostics</p>
          <h1 className="font-display mt-3 text-3xl tracking-normal text-ink sm:text-4xl">Supabase debug</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Safe runtime checks for the shared database configuration. Open the browser console for full non-secret
            error objects when a request fails.
          </p>
        </div>

        <section className="surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Runtime config</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Values are intentionally reduced to yes/no, hostname, and key type. Full keys are never shown.
              </p>
            </div>
            <button type="button" onClick={runDiagnostics} disabled={isRunning} className="btn-primary">
              {isRunning ? "Running diagnostics..." : "Run full diagnostic suite"}
            </button>
          </div>

          {!hostnameMatches ? (
            <div className="notice mt-4 border-red-200 bg-red-50 font-semibold text-red-700">
              Supabase URL hostname does not match expected project hostname.
            </div>
          ) : null}

          <dl className="mt-4 grid gap-3">
            {diagnostics.map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-lg border border-line/70 bg-panel/55 p-3 sm:grid-cols-[220px_1fr]">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</dt>
                <dd className="break-words text-sm font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-6 grid gap-6">
          {results.length ? (
            results.map((result) => <ResultCard key={result.operation} result={result} />)
          ) : (
            <section className="surface-soft p-6 text-sm font-semibold leading-7 text-muted">
              Click “Run full diagnostic suite” to test client initialization, direct REST fetch, table read, insert,
              read-back, and cleanup delete.
            </section>
          )}
        </div>
      </main>
    </>
  );
}
