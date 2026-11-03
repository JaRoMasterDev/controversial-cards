import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { filledLength, PromptText } from "./PromptText";

type Size = "hero" | "md" | "sm";
type Ring = "default" | "winner" | "selected";

const ringClasses: Record<Ring, string> = {
  default: "shadow-xl shadow-black/25 ring-1 ring-white/10",
  winner: "shadow-xl shadow-amber-500/30 ring-4 ring-amber-400",
  selected: "shadow-2xl shadow-rose-900/30 ring-4 ring-rose-500",
};

// On phones cards are only as tall as their text; larger screens get card proportions.
const sizeClasses: Record<Size, string> = {
  hero: "mx-auto w-full max-w-md rounded-2xl p-4 sm:min-h-44 sm:p-6 md:max-w-none md:aspect-[5/7] md:min-h-[auto]",
  md: "w-full rounded-2xl p-4 sm:min-h-36 sm:p-5",
  sm: "w-full rounded-xl p-3 sm:aspect-[5/7]",
};

function textSize(size: Size, length: number): string {
  if (size === "sm") return length > 110 ? "text-xs" : "text-sm";
  if (size === "md") return length > 160 ? "text-base" : "text-lg";
  if (length > 180) return "text-lg";
  if (length > 110) return "text-xl";
  return "text-xl sm:text-2xl";
}

/**
 * A black question card. Pass `answers` to show the question with its blanks filled in.
 */
export function PromptCard({
  text,
  pick,
  answers,
  size = "hero",
  ring = "default",
  footer,
  className = "",
}: {
  text: string;
  pick: number;
  answers?: string[];
  size?: Size;
  /** "winner" draws a gold ring, "selected" the selection ring. */
  ring?: Ring;
  /** Replaces the default footer (brand mark). */
  footer?: ReactNode;
  className?: string;
}) {
  // The plain brand footer is decoration, so phones skip it unless it shows "Pick N".
  const footerVisibility = footer !== undefined || pick > 1 ? "flex" : "hidden sm:flex";
  return (
    <div
      className={`relative flex flex-col justify-between gap-3 bg-zinc-950 text-white sm:gap-4 ${ringClasses[ring]} ${sizeClasses[size]} ${className}`}
    >
      <p
        dir="auto"
        className={`font-bold leading-snug tracking-tight [overflow-wrap:anywhere] ${textSize(size, filledLength(text, answers))}`}
      >
        <PromptText text={text} answers={answers} />
      </p>
      <div className={`${footerVisibility} items-center justify-between gap-2`}>
        {footer ?? (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <LogoMark className="size-3.5" />
            {size !== "sm" && "Controversial Cards"}
          </span>
        )}
        {pick > 1 && (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-zinc-950">
            Pick {pick}
          </span>
        )}
      </div>
    </div>
  );
}
