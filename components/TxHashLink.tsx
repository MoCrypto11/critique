import { ARC_EXPLORER_URL } from "@/lib/arc";
import { shortAddress } from "@/lib/utils";

export function TxHashLink({ hash }: { hash?: string }) {
  if (!hash) return <span className="text-muted">No transaction hash</span>;

  return (
    <a
      href={`${ARC_EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="font-bold text-action underline-offset-4 hover:underline"
    >
      {shortAddress(hash)}
    </a>
  );
}
