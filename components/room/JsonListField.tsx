"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { UploadIcon } from "@/components/ui/icons";
import { inputClasses } from "@/components/ui/fields";

const MAX_FILE_BYTES = 2_000_000;

/** A textarea for a JSON array of strings, with a button to load it from a local .json file. */
export function JsonListField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  jsonError,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  jsonError: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so the same file can be picked again
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError("That file is too big (2 MB max).");
      return;
    }
    try {
      onChange(await file.text());
      setFileError(null);
    } catch {
      setFileError("Couldn't read that file.");
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
          {hint && <span className="ml-1.5 font-normal text-zinc-500">{hint}</span>}
        </label>
        <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          <UploadIcon />
          Load .json file
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onFile}
          tabIndex={-1}
          aria-hidden
        />
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        placeholder={placeholder}
        aria-invalid={jsonError ? true : undefined}
        className={`${inputClasses} resize-y font-mono leading-relaxed ${jsonError ? "ring-2 ring-red-500/50" : ""}`}
      />
      <ErrorText error={fileError ?? (jsonError ? `Not valid JSON: ${jsonError}` : null)} className="mt-1" />
    </div>
  );
}
