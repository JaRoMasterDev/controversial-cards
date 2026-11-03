export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/** Centered spinner with a label, for whole-screen loading states. */
export function FullScreenSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-zinc-500" role="status">
      <Spinner className="size-8 text-rose-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
