"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  FileSpreadsheet,
  Waypoints,
  RotateCcw,
  X,
  AlertTriangle,
} from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { PreviewTable } from "@/components/PreviewTable";
import { ResultsTable } from "@/components/ResultsTable";
import { ImportProgress } from "@/components/ImportProgress";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { parseCsvFile, formatBytes, type ParsedCsv } from "@/lib/csv";
import { importRows, checkHealth } from "@/lib/api";
import type { ImportResult } from "@/types/crm";

type Stage = "upload" | "preview" | "processing" | "done";

interface Health {
  model: string;
  groqConfigured: boolean;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    checkHealth().then((h) =>
      setHealth(h ? { model: h.model, groqConfigured: h.groqConfigured } : null)
    );
  }, []);

  const handleFileSelected = useCallback(async (selected: File) => {
    setError(null);
    setParsing(true);
    setFile(selected);
    try {
      const result = await parseCsvFile(selected);
      if (result.rows.length === 0) {
        throw new Error("This CSV has headers but no data rows.");
      }
      setParsed(result);
      setStage("preview");
    } catch (err) {
      setFile(null);
      setParsed(null);
      setError(err instanceof Error ? err.message : "Failed to read the file.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!parsed) return;
    setError(null);
    setStage("processing");
    setProgress({ completed: 0, total: 0 });
    try {
      const res = await importRows(parsed.rows, (event) => {
        if (event.type === "start") {
          setProgress({ completed: 0, total: event.totalBatches });
        } else if (event.type === "progress") {
          setProgress({
            completed: event.completedBatches,
            total: event.totalBatches,
          });
        }
      });
      setResult(res);
      setStage("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed. Please try again."
      );
      setStage("preview");
    }
  }, [parsed]);

  const reset = useCallback(() => {
    setStage("upload");
    setFile(null);
    setParsed(null);
    setResult(null);
    setError(null);
    setProgress({ completed: 0, total: 0 });
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader health={health} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        {stage === "upload" && (
          <div className="mx-auto mb-10 max-w-2xl text-center animate-in">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              AI-powered column mapping
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Import any CSV into your CRM
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-fg-muted">
              Upload a messy export from anywhere. Our AI figures out the columns
              and maps every lead into the GrowEasy schema — no templates, no
              manual mapping.
            </p>
          </div>
        )}

        <Stepper stage={stage} />

        {/* Global error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 animate-in">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Upload */}
        {stage === "upload" && (
          <div className="mx-auto max-w-2xl">
            <FileUpload onFileSelected={handleFileSelected} disabled={parsing} />
            {parsing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-fg-muted">
                <Spinner className="h-4 w-4" />
                Parsing your CSV…
              </div>
            )}
          </div>
        )}

        {/* Preview / processing / done all show the file bar */}
        {(stage === "preview" || stage === "processing" || stage === "done") &&
          file &&
          parsed && (
            <div className="space-y-6">
              <FileBar
                name={file.name}
                size={file.size}
                rows={parsed.rows.length}
                columns={parsed.headers.length}
                onReset={reset}
                canReset={stage !== "processing"}
              />

              {stage === "preview" && (
                <>
                  <PreviewTable
                    headers={parsed.headers}
                    rows={parsed.rows}
                  />
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
                    <p className="text-sm text-fg-muted sm:mr-auto">
                      Looks right? Send these {parsed.rows.length} rows to the AI
                      mapper.
                    </p>
                    <Button variant="secondary" onClick={reset}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                      Confirm &amp; Import
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {stage === "processing" && (
                <ImportProgress
                  completedBatches={progress.completed}
                  totalBatches={progress.total}
                />
              )}

              {stage === "done" && result && (
                <>
                  <ResultsTable result={result} />
                  <div className="flex justify-center pt-2">
                    <Button variant="secondary" onClick={reset}>
                      <RotateCcw className="h-4 w-4" />
                      Import another CSV
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader({ health }: { health: Health | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 44 44" className="w-full h-full">
              <rect width="44" height="44" fill="#0F0F0F" rx="10.5"></rect>
              <path fill="#FBFBFB" d="m28.282 22.731-21.5 21.501-6.795-6.794 21.5-21.501z"></path>
              <path fill="#FBFBFB" d="M8.877 15.938H28.28v6.795H8.877z"></path>
              <path fill="#FBFBFB" d="M28.28 15.938V35.34h-6.794V15.938z"></path>
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-fg">GrowEasy</div>
            <div className="text-xs text-fg-subtle">AI CSV Importer</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-2 px-4 text-xs text-fg-subtle sm:flex-row sm:px-6">
        <span>GrowEasy CSV Importer · Built by Pranav</span>
      </div>
    </footer>
  );
}

const STEPS = ["Upload", "Preview", "Import", "Results"] as const;

function Stepper({ stage }: { stage: Stage }) {
  const index =
    stage === "upload"
      ? 0
      : stage === "preview"
        ? 1
        : stage === "processing"
          ? 2
          : 3;

  return (
    <div className="mb-8 flex items-center justify-center">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {STEPS.map((label, i) => {
          const active = i === index;
          const done = i < index;
          return (
            <li key={label} className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    done
                      ? "bg-accent text-accent-fg"
                      : active
                        ? "bg-accent-soft text-accent ring-2 ring-accent/40"
                        : "bg-surface-2 text-fg-subtle"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:inline ${
                    active
                      ? "text-fg"
                      : done
                        ? "text-fg-muted"
                        : "text-fg-subtle"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={`h-px w-5 sm:w-8 ${
                    done ? "bg-accent" : "bg-border-strong"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FileBar({
  name,
  size,
  rows,
  columns,
  onReset,
  canReset,
}: {
  name: string;
  size: number;
  rows: number;
  columns: number;
  onReset: () => void;
  canReset: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-fg">{name}</div>
          <div className="text-xs text-fg-subtle">
            {formatBytes(size)} · {rows.toLocaleString()} rows · {columns}{" "}
            columns
          </div>
        </div>
      </div>
      {canReset && (
        <button
          type="button"
          onClick={onReset}
          className="flex-shrink-0 rounded-lg p-2 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
