/** Two overlapping cards: a black question and a white answer. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-block shrink-0 ${className}`}>
      <span className="absolute inset-y-[8%] left-[6%] w-[58%] -rotate-12 rounded-[18%] bg-zinc-950 shadow-sm ring-1 ring-white/15" />
      <span className="absolute inset-y-[4%] right-[6%] w-[58%] rotate-[10deg] rounded-[18%] bg-white shadow-md ring-1 ring-zinc-900/80">
        <span className="absolute left-[18%] top-[26%] h-[9%] w-[55%] rounded-full bg-rose-600" />
        <span className="absolute left-[18%] top-[44%] h-[9%] w-[38%] rounded-full bg-zinc-900" />
      </span>
    </span>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  if (size === "lg") {
    return (
      <span className="inline-flex items-center gap-3">
        <LogoMark className="size-14 sm:size-16" />
        <span className="text-left text-3xl font-black leading-[0.95] tracking-tight sm:text-4xl">
          Controversial{" "}
          <br />
          Cards
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="size-7" />
      <span className="text-[15px] font-extrabold tracking-tight">Controversial Cards</span>
    </span>
  );
}
