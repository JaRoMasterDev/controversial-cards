import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";

/** A centered card for screens outside the game: join, not found, removed. */
export function StatusScreen({
  title,
  message,
  children,
}: {
  title: ReactNode;
  message?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg shadow-black/5 dark:border-zinc-800 dark:bg-zinc-900">
        <LogoMark className="mx-auto size-12" />
        <h1 className="mt-4 text-2xl font-black tracking-tight">{title}</h1>
        {message && <div className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{message}</div>}
        {children && <div className="mt-6 flex flex-col gap-3 text-left">{children}</div>}
      </div>
    </main>
  );
}
