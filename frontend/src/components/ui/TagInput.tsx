"use client";

import { KeyboardEvent, useState } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export function TagInput({ tags, onChange, maxTags = 20 }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim().toLowerCase();
    if (!value || tags.includes(value) || tags.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="tags" className="font-mono text-[11px] uppercase tracking-wide text-ink/60">
        Tags <span className="normal-case text-ink/40">(optional — press Enter to add)</span>
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-stone bg-white px-2.5 py-2 focus-within:border-brass-500 focus-within:ring-1 focus-within:ring-brass-500">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-bone px-2.5 py-1 font-mono text-[11px] text-ink/70"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="text-ink/40 hover:text-clay"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="tags"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? "e.g. linen, summer, work" : ""}
          className="min-w-[8ch] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-ink/30"
        />
      </div>
    </div>
  );
}
