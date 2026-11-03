const palette = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-600",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-sky-600",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-600",
];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

/** A coloured circle with the player's initial. Greyed out while the player is away. */
export function Avatar({ name, away = false, className = "size-9 text-sm" }: { name: string; away?: boolean; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${
        away ? "bg-zinc-400 dark:bg-zinc-700" : colorFor(name)
      } ${className}`}
    >
      {initial}
    </span>
  );
}
