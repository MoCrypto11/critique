import { ARC_EXPLORER_URL } from "@/lib/arc";

export function BuiltOnArcBadge() {
  return (
    <a
      href={ARC_EXPLORER_URL || "https://arc.network"}
      target="_blank"
      rel="noreferrer"
      className="focus-ring fixed bottom-3 right-3 z-30 inline-flex items-center gap-2 rounded-full border border-action/20 bg-[#071a18]/95 px-3.5 py-2 text-xs font-black text-white shadow-[0_14px_36px_rgba(7,26,24,0.18)] backdrop-blur transition-colors hover:bg-[#0b2f29] sm:bottom-5 sm:right-5 sm:px-4"
      aria-label="Built on Arc"
    >
      <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
      Built on Arc
    </a>
  );
}
