import { Spinner } from "@/components/ui/Spinner";

export function ReconnectingBanner() {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-3 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] text-xs font-semibold text-amber-950 shadow-sm"
    >
      <Spinner className="size-3" />
      Reconnecting…
    </div>
  );
}
