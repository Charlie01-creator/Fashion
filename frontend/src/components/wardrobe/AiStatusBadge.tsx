"use client";

import type { AiAnalysisStatus } from "@fashion-platform/shared";

interface AiStatusBadgeProps {
  status: AiAnalysisStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<AiAnalysisStatus, { label: string; className: string; pulse?: boolean }> = {
  PENDING: { label: "Queued", className: "bg-brass-400/15 text-brass-600", pulse: true },
  ANALYZING: { label: "Analyzing", className: "bg-brass-400/15 text-brass-600", pulse: true },
  COMPLETED: { label: "AI verified", className: "bg-moss/10 text-moss" },
  FAILED: { label: "Analysis failed", className: "bg-clay/10 text-clay" },
};

export function AiStatusBadge({ status, size = "sm" }: AiStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wide ${sizeClasses} ${config.className}`}
    >
      {config.pulse && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass-500" aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}
