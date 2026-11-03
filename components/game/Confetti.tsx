import type { CSSProperties } from "react";

const COLORS = ["#e11d48", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#fafafa", "#18181b"];
const PIECES = 42;

/** Falling confetti for the winner screen. Positions are derived from the index, so render stays pure. */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {Array.from({ length: PIECES }, (_, i) => {
        const style = {
          left: `${(i * 37 + 11) % 100}%`,
          width: i % 3 === 0 ? 6 : 9,
          height: i % 2 === 0 ? 14 : 9,
          background: COLORS[i % COLORS.length],
          animationDelay: `${((i * 0.23) % 2.8).toFixed(2)}s`,
          animationDuration: `${2.6 + (i % 5) * 0.4}s`,
          animationIterationCount: 2,
          "--drift": `${((i * 29) % 90) - 45}px`,
        } as CSSProperties;
        return <span key={i} className="absolute top-0 animate-confetti rounded-[2px] opacity-0" style={style} />;
      })}
    </div>
  );
}
