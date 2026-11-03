/** Shared input styles. 16px text keeps iOS from zooming in on focus. */
export const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600";

export const labelClasses = "mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-300";

export { MAX_NAME_LENGTH, MAX_POINTS_TO_WIN, MIN_POINTS_TO_WIN } from "@/lib/game/constants";
