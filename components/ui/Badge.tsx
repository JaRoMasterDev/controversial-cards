import type { ReactNode } from "react";

type BadgeTone = "neutral" | "host" | "judge" | "away" | "custom" | "success";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  host: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  judge: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
  away: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  custom: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
