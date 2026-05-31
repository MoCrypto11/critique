import { notFound } from "next/navigation";
import { SupabaseDebugClient } from "./SupabaseDebugClient";

export default function SupabaseDebugPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SHOW_DEBUG !== "true") {
    notFound();
  }

  return <SupabaseDebugClient />;
}
