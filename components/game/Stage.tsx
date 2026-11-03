import type { ReactNode } from "react";

/**
 * Layout of a round: the question card (sticky beside the content on wider screens,
 * on top on phones) and the phase-specific content.
 */
export function Stage({ card, caption, children }: { card: ReactNode; caption?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start xl:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="animate-fade-up space-y-2 md:sticky md:top-20">
        {card}
        {caption && (
          <div className="text-center text-sm font-medium text-zinc-600 dark:text-zinc-400" aria-live="polite">
            {caption}
          </div>
        )}
      </div>
      <div className="@container min-w-0 space-y-4">{children}</div>
    </div>
  );
}

/** A heading with a short explanation above the phase content. */
export function StageHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
      {children && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{children}</p>}
    </div>
  );
}

/** A bar that sticks to the bottom of the screen while its section is visible (Play, Pick winner). */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-zinc-200 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:mx-0 sm:mb-3 sm:rounded-2xl sm:border sm:pb-3 sm:shadow-lg dark:border-zinc-800">
      {children}
    </div>
  );
}
