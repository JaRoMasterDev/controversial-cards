import { LogoMark } from "@/components/ui/Logo";

function textSize(length: number, small: boolean): string {
  if (small) return length > 80 ? "text-xs" : "text-sm";
  if (length > 110) return "text-[13px] sm:text-sm";
  if (length > 60) return "text-sm sm:text-[15px]";
  return "text-[15px] sm:text-base";
}

/**
 * A white answer card: sized to its text on phones, playing-card proportions on larger
 * screens. Pass `onSelect` to make it a toggle;
 * `order` (1–3) is shown as a badge when the card is part of the current selection.
 */
export function AnswerCard({
  text,
  order = null,
  onSelect,
  disabled = false,
  size = "md",
  className = "",
}: {
  text: string;
  order?: number | null;
  onSelect?: () => void;
  disabled?: boolean;
  size?: "md" | "sm";
  className?: string;
}) {
  const selected = order !== null;
  const small = size === "sm";
  const body = (
    <>
      <span dir="auto" className={`block font-bold leading-snug tracking-tight [overflow-wrap:anywhere] ${textSize(text.length, small)}`}>
        {text}
      </span>
      <span className="hidden sm:block">
        <LogoMark className="size-3.5 opacity-70" />
      </span>
      {selected && (
        <span className="absolute -right-2 -top-2 grid size-7 animate-pop-in place-items-center rounded-full bg-rose-600 text-sm font-black text-white shadow-md ring-2 ring-white dark:ring-zinc-950">
          {order}
        </span>
      )}
    </>
  );

  // On phones the card is only as tall as its text; from `sm` up it keeps card proportions.
  const shape = `relative flex h-full w-full flex-col justify-between gap-3 bg-white text-start text-zinc-950 sm:aspect-[5/7] ${
    small ? "rounded-xl p-3" : "rounded-xl p-3 sm:rounded-2xl sm:p-4"
  }`;
  const state = selected
    ? "-translate-y-1 shadow-xl shadow-rose-900/20 ring-4 ring-rose-500"
    : "shadow-md shadow-black/10 ring-1 ring-black/10";

  if (!onSelect) {
    return <div className={`${shape} ${state} ${className}`}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={selected ? `${text} (selected, ${order})` : text}
      className={`${shape} ${state} cursor-pointer transition-[transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? "" : "hover:-translate-y-0.5 hover:shadow-lg"
      } ${className}`}
    >
      {body}
    </button>
  );
}
