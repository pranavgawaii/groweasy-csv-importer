"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileSpreadsheet } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setError(null);
      if (rejections.length > 0) {
        setError("Only .csv files are supported. Please choose a CSV export.");
        return;
      }
      const file = accepted[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      onDrop,
      disabled,
      multiple: false,
      noClick: true,
      noKeyboard: true,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
        "text/plain": [".csv"],
      },
    });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          isDragActive && !isDragReject
            ? "border-accent bg-accent-soft"
            : isDragReject
              ? "border-rose-400 bg-rose-50 dark:bg-rose-500/5"
              : "border-border-strong bg-surface/60 hover:border-accent/60 hover:bg-surface-2"
        }`}
      >
        <input {...getInputProps()} />

        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
          <UploadCloud className="h-8 w-8" strokeWidth={1.75} />
        </div>

        <p className="text-lg font-semibold text-fg">
          {isDragActive ? "Drop your CSV here" : "Drag & drop your CSV"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">
          Facebook Lead exports, Google Ads, real-estate CRMs, or a
          hand-made spreadsheet — any columns work.
        </p>

        <button
          type="button"
          onClick={open}
          disabled={disabled}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-sm shadow-accent/20 transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Browse files
        </button>

        <p className="mt-4 text-xs text-fg-subtle">.csv up to ~5,000 rows</p>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
