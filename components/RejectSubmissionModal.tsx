"use client";

import { useEffect, useRef, useState } from "react";

export function RejectSubmissionModal({
  open,
  busy,
  error,
  onCancel,
  onConfirm
}: {
  open: boolean;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset the field and focus the textarea each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setReason("");
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Escape closes the modal — but never while a rejection is in flight.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        // Close only on a genuine backdrop click and only when it is safe to do so.
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        aria-describedby="reject-modal-desc"
        className="w-full max-w-md rounded-2xl border border-line/70 bg-[#fffdf7] p-5 shadow-[0_24px_60px_rgba(21,45,36,0.18)] sm:p-6"
      >
        <h2 id="reject-modal-title" className="text-lg font-black text-ink">
          Reject submission
        </h2>
        <p id="reject-modal-desc" className="mt-2 text-sm leading-6 text-muted">
          Add a short reason so the contributor understands the decision.
        </p>

        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          rows={4}
          disabled={busy}
          placeholder="Example: Feedback was too vague or did not follow the bounty instructions."
          className="field mt-4 resize-y leading-6 disabled:cursor-not-allowed disabled:bg-panel disabled:opacity-60"
        />

        {error ? (
          <div className="notice mt-4 border-red-200 bg-red-50 font-semibold text-red-700">{error}</div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary w-full sm:w-auto">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy}
            className="btn-primary w-full sm:w-auto"
          >
            {busy ? "Rejecting..." : "Reject submission"}
          </button>
        </div>
      </div>
    </div>
  );
}
