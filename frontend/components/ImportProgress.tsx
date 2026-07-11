"use client";

import { Sparkles } from "lucide-react";

interface ImportProgressProps {
  completedBatches: number;
  totalBatches: number;
}

export function ImportProgress({
  completedBatches,
  totalBatches,
}: ImportProgressProps) {
  const known = totalBatches > 0;
  const pct = known
    ? Math.round((completedBatches / totalBatches) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm animate-in">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Sparkles className="h-5 w-5" />
          <span className="absolute inset-0 rounded-xl ring-2 ring-accent/30 motion-safe:animate-ping" />
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">
            AI is mapping your CSV to the CRM schema
          </p>
          <p className="text-xs text-fg-muted">
            {known
              ? `Processing batch ${Math.min(
                  completedBatches + 1,
                  totalBatches
                )} of ${totalBatches}…`
              : "Preparing batches…"}
          </p>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {known ? (
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        ) : (
          <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] rounded-full bg-accent/70" />
        )}
      </div>

      <div className="mt-2 flex justify-between text-xs text-fg-subtle">
        <span>
          {known ? `${completedBatches} / ${totalBatches} batches` : "Starting…"}
        </span>
        <span className="tabular-nums">{known ? `${pct}%` : ""}</span>
      </div>
    </div>
  );
}
