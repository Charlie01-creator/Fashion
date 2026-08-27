"use client";

import { DragEvent, useCallback, useRef, useState } from "react";

export const DROPZONE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DROPZONE_MAX_SIZE_MB = 5;

interface DropzoneProps {
  file: File | null;
  previewUrl: string | null;
  /** Parent owns validation (single source of truth, shared with the submit-time check). */
  onFileSelected: (file: File) => void;
  onClear: () => void;
  error?: string | null;
}

export function Dropzone({ file, previewUrl, onFileSelected, onClear, error }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = useCallback(
    (candidate: File | undefined) => {
      if (candidate) onFileSelected(candidate);
    },
    [onFileSelected]
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    selectFile(e.dataTransfer.files?.[0]);
  }

  if (previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-sm border border-stone bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Selected garment preview" className="aspect-[4/5] w-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 rounded-full bg-ink/70 px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-bone backdrop-blur hover:bg-clay"
        >
          Remove
        </button>
        <p className="border-t border-dashed border-stone px-3 py-2 font-mono text-[11px] text-ink/60">
          {file?.name}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed px-6 text-center transition-colors ${
          isDragActive ? "border-brass-500 bg-brass-400/5" : "border-stone bg-white hover:border-ink/30"
        }`}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-ink/40" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7 9m5-5l5 5M5 16v3a2 2 0 002 2h10a2 2 0 002-2v-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="font-display text-lg text-ink">Drag a photo here</p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">
          or click to browse · JPEG, PNG, WebP · up to {DROPZONE_MAX_SIZE_MB}MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={DROPZONE_ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => selectFile(e.target.files?.[0])}
      />
      {error && (
        <p className="mt-2 text-sm text-clay" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
