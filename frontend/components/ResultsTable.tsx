"use client";

import { useMemo, useState, useRef } from "react";
import Papa from "papaparse";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ListChecks,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { CRM_FIELDS, type CrmField, type ImportResult } from "@/types/crm";
import { StatusBadge } from "./ui/StatusBadge";
import { Button } from "./ui/Button";

const FIELD_LABELS: Record<CrmField, string> = {
  created_at: "Created at",
  name: "Name",
  email: "Email",
  country_code: "Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession",
  description: "Description",
};

export function ResultsTable({ result }: { result: ImportResult }) {
  const { records, skipped, totalRows, totalImported, totalSkipped } = result;
  const [showSkipped, setShowSkipped] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: records.length,
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

  const skippedColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const s of skipped) {
      for (const k of Object.keys(s.originalRow)) keys.add(k);
    }
    return Array.from(keys);
  }, [skipped]);

  const downloadCsv = () => {
    const csv = Papa.unparse(
      records.map((r) => ({ ...r })),
      { columns: [...CRM_FIELDS] }
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groweasy-crm-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ListChecks className="h-5 w-5" />}
          label="Total rows"
          value={totalRows}
          tone="neutral"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Imported"
          value={totalImported}
          tone="accent"
        />
        <StatCard
          icon={<SkipForward className="h-5 w-5" />}
          label="Skipped"
          value={totalSkipped}
          tone="muted"
        />
      </div>

      {/* Mapped records */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">
                Mapped CRM records
              </h3>
              <p className="text-xs text-fg-subtle">
                {records.length} record{records.length === 1 ? "" : "s"} mapped
                to the GrowEasy schema
              </p>
            </div>
          </div>
          {records.length > 0 && (
            <Button variant="secondary" size="sm" onClick={downloadCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-fg-muted">
            No records could be mapped from this file.
          </div>
        ) : (
          <div
            ref={parentRef}
            className="scrollbar-slim max-h-[32rem] overflow-auto"
          >
            <table className="w-full border-collapse text-left text-sm relative">
              <thead className="sticky top-0 z-20">
                <tr className="bg-surface-2/95 backdrop-blur">
                  <th className="sticky left-0 z-30 border-b border-border bg-surface-2/95 px-4 py-2.5 text-xs font-semibold text-fg-subtle backdrop-blur">
                    #
                  </th>
                  {CRM_FIELDS.map((field) => (
                    <th
                      key={field}
                      className="whitespace-nowrap border-b border-border px-4 py-2.5 text-xs font-semibold text-fg-muted"
                    >
                      {FIELD_LABELS[field]}
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
                  const record = records[virtualRow.index];
                  if (!record) return null;
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
                      {CRM_FIELDS.map((field) => (
                        <td
                          key={field}
                          className="max-w-[18rem] truncate whitespace-nowrap px-4 py-2.5 text-fg"
                          title={cellTitle(record[field])}
                        >
                          {field === "crm_status" && record.crm_status ? (
                            <StatusBadge status={record.crm_status} />
                          ) : record[field] ? (
                            String(record[field])
                          ) : (
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
        )}
      </div>

      {/* Skipped rows */}
      {skipped.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-2/60"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
                <SkipForward className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-fg">
                  Skipped rows
                </h3>
                <p className="text-xs text-fg-subtle">
                  {skipped.length} row{skipped.length === 1 ? "" : "s"} with no
                  email or mobile
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-fg-subtle transition-transform ${
                showSkipped ? "rotate-180" : ""
              }`}
            />
          </button>

          {showSkipped && (
            <div className="scrollbar-slim max-h-[24rem] overflow-auto border-t border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-2/95 backdrop-blur">
                    <th className="border-b border-border px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Reason
                    </th>
                    {skippedColumns.map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap border-b border-border px-4 py-2.5 text-xs font-semibold text-fg-muted"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-2/70">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20">
                          {row.reason}
                        </span>
                      </td>
                      {skippedColumns.map((col) => (
                        <td
                          key={col}
                          className="max-w-[16rem] truncate whitespace-nowrap px-4 py-2.5 text-fg-muted"
                          title={row.originalRow[col] ?? ""}
                        >
                          {row.originalRow[col] || (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cellTitle(value: string | null): string {
  return value ? String(value) : "";
}

type Tone = "neutral" | "accent" | "muted";

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    neutral: "text-fg-muted bg-surface-2",
    accent: "text-accent bg-accent-soft",
    muted: "text-fg-muted bg-surface-2",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold tabular-nums text-fg">
          {value.toLocaleString()}
        </div>
        <div className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
          {label}
        </div>
      </div>
    </div>
  );
}
