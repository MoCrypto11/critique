// Non-destructive: confirms production is wired to Supabase (not localStorage)
// by scanning the public client bundle for the supabase URL + anon JWT.
// The anon key is a PUBLIC client value (shipped to every browser, protected by RLS).
// It is written to .env.qa.local (gitignored) and never printed.
import fs from "node:fs";
import { config as dotenv } from "dotenv";

dotenv({ path: ".env.local" });

const SITE = "https://usecritique.xyz";
const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const html = await (await fetch(SITE)).text();
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+?\.js/g)].map((m) => m[0]))];

let anon = null;
let url = null;
for (const c of chunks) {
  const js = await (await fetch(SITE + c)).text();
  if (!url) {
    const m = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
    if (m) url = m[0];
  }
  if (!anon) {
    const m = js.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (m) anon = m[0];
  }
  if (url && anon) break;
}

console.log("chunks scanned:        ", chunks.length);
console.log("supabase URL in bundle:", url || "NONE FOUND");
console.log("local NEXT_PUBLIC_SUPABASE_URL host matches:", url && localUrl ? url === localUrl.replace(/\/$/, "") : "n/a");
console.log("anon key in bundle:    ", anon ? `yes (length ${anon.length})` : "NONE FOUND");

if (anon) {
  const payload = JSON.parse(Buffer.from(anon.split(".")[1], "base64").toString("utf8"));
  console.log("jwt role:              ", payload.role, "| project ref:", payload.ref);
  if (payload.role !== "anon") {
    console.log("WARNING: bundle key role is not 'anon' — NOT writing it.");
  } else {
    fs.writeFileSync(".env.qa.local", `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\n`);
    console.log("wrote public anon key -> .env.qa.local (gitignored, value not printed)");
  }
}
console.log(
  "\nVERDICT: production",
  url && anon ? "IS wired to Supabase (not localStorage fallback)" : "is NOT serving a Supabase anon key — CRITICAL"
);
