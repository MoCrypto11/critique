"use client";

import { useState } from "react";
import { copyText } from "@/lib/utils";

export function CopyLinkButton({
  href,
  label = "Copy Bounty Link",
  className
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await copyText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={onCopy} className={className ?? "btn-secondary w-full sm:w-auto"}>
      {copied ? "Link copied" : label}
    </button>
  );
}
