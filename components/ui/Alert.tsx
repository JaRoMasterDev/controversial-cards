import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";

type Tone = "error" | "notice" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  notice:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
  info: "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100",
};

const icons: Record<Tone, ReactNode> = {
  error: <AlertIcon className="mt-0.5 size-4 shrink-0" />,
  notice: <InfoIcon className="mt-0.5 size-4 shrink-0" />,
  info: <InfoIcon className="mt-0.5 size-4 shrink-0" />,
  success: <CheckIcon className="mt-0.5 size-4 shrink-0" />,
};

export function Alert({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${tones[tone]} ${className}`}
    >
      {icons[tone]}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Inline error under a control. Renders nothing for a null error. */
export function ErrorText({ error, className = "" }: { error: string | null | undefined; className?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className={`text-sm font-medium text-red-600 dark:text-red-400 ${className}`}>
      {error}
    </p>
  );
}
