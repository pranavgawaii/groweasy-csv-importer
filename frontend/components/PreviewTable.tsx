"use client";

import { useRef } from "react";
import { Table2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RawRow } from "@/types/crm";

interface PreviewTableProps {
  headers: string[];
  rows: RawRow[];
}

export function PreviewTable({ headers, rows }: PreviewTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? items[0]?.start ?? 0 : 0;
  const paddingBottom =
    items.length > 0
      ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0)
      : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
            <Table2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fg">Raw preview</h3>
            <p className="text-xs text-fg-subtle">
              Exactly as uploaded — no mapping yet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-fg-muted">
          <span>
            <span className="font-semibold text-fg">{rows.length}</span> rows
          </span>
          <span>
            <span className="font-semibold text-fg">{headers.length}</span>{" "}
            columns
          </span>
        </div>
      </div>

      <div
        ref={parentRef}
        className="scrollbar-slim max-h-[26rem] overflow-auto"
      >
        <table className="w-full border-collapse text-left text-sm relative">
          <thead className="sticky top-0 z-20">
            <tr className="bg-surface-2/95 backdrop-blur">
              <th className="sticky left-0 z-30 border-b border-border bg-surface-2/95 px-4 py-2.5 text-xs font-semibold text-fg-subtle backdrop-blur">
                #
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap border-b border-border px-4 py-2.5 text-xs font-semibold text-fg-muted"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: paddingTop }} />
              </tr>
            )}
            {items.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              return (
                <tr
                  key={virtualRow.index}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="group transition-colors hover:bg-surface-2/70"
                >
                  <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-xs tabular-nums text-fg-subtle group-hover:bg-surface-2/70">
                    {virtualRow.index + 1}
                  </td>
                  {headers.map((header) => (
                    <td
                      key={header}
                      className="max-w-[16rem] truncate whitespace-nowrap px-4 py-2.5 text-fg"
                      title={row[header] ?? ""}
                    >
                      {row[header] || (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
