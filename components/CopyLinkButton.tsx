"use client";

import { useState } from "react";
import { copyText } from "@/lib/utils";

export function CopyLinkButton({ href, label = "Copy Bounty Link" }: { href: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await copyText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={onCopy} className="btn-secondary w-full sm:w-auto">
      {copied ? "Link copied" : label}
    </button>
  );
}
