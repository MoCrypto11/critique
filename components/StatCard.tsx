export function StatCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "strong" }) {
  return (
    <div className={tone === "strong" ? "surface glow-card p-5" : "surface p-5"}>
      <div className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-3 text-2xl font-black tracking-normal text-ink">{value}</div>
    </div>
  );
}
