import { Logo } from "@/components/ui/Logo";

export function RoomHeader({ code }: { code: string }) {
  return (
    <header className="border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Room <span className="font-mono font-bold tracking-widest text-zinc-900 dark:text-white">{code}</span>
        </span>
      </div>
    </header>
  );
}
