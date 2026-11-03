import type { Metadata } from "next";
import Link from "next/link";
import { languageName } from "@/components/room/languages";
import { Logo } from "@/components/ui/Logo";
import { BUILT_IN_PACKS } from "@/lib/packs";

export const metadata: Metadata = {
  title: "Credits and licences",
};

const linkClasses = "font-semibold text-rose-600 underline underline-offset-2 dark:text-rose-400";

export default function CreditsPage() {
  const adapted = BUILT_IN_PACKS.filter((pack) => pack.source);
  const original = BUILT_IN_PACKS.filter((pack) => !pack.source);
  const licenses = [...new Map(adapted.map((p) => [p.source!.license, p.source!.licenseUrl])).entries()];
  const authors = [...new Set(adapted.map((p) => p.source!.author))];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <Link href="/" aria-label="Home">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-black tracking-tight">Credits and licences</h1>

      <section className="mt-6 space-y-3 leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>
          {original.map((p) => p.name).join(" and ")} {original.length === 1 ? "was" : "were"} written for this app.
          The other built-in card sets are adapted from free print-and-play decks that their publisher shares under{" "}
          {licenses.map(([name, url], i) => (
            <span key={name}>
              {i > 0 && ", "}
              <a href={url} className={linkClasses} target="_blank" rel="noreferrer">
                {name}
              </a>
            </span>
          ))}
          .
        </p>
        <p>
          We converted the printed cards into digital ones and removed print-only elements such as brand marks and
          “pick” badges. A few cards were left out: cards that name the original game, and cards that ask for more
          answers than they have blanks. The card text is otherwise unchanged.
        </p>
        <p>
          The adapted sets are shared under the same licence. You may copy and adapt them for non-commercial purposes
          as long as you credit the original authors and share your changes under the same licence. Neither this app
          nor these card sets may be sold or used commercially.
        </p>
        {authors.length > 0 && (
          <p>
            This app is a fan-made project. It is not affiliated with, sponsored or endorsed by {authors.join(" or ")},
            and their names and trademarks are used here only to credit their work.
          </p>
        )}
      </section>

      <h2 className="mt-10 text-xl font-bold tracking-tight">Adapted card sets</h2>
      <ul className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {adapted.map((pack) => {
          const source = pack.source!;
          const language = pack.language ? languageName(pack.language).english : null;
          return (
            <li key={pack.id} className="p-4">
              <p className="font-semibold">
                {pack.name}
                {language && <span className="font-normal text-zinc-500"> · {language}</span>}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Adapted from the {source.edition} of “{source.title}” by {source.author} (
                <a href={source.url} className={linkClasses} target="_blank" rel="noreferrer">
                  {new URL(source.url).hostname}
                </a>
                ), licensed under{" "}
                <a href={source.licenseUrl} className={linkClasses} target="_blank" rel="noreferrer">
                  {source.license}
                </a>
                .{source.copyright && ` ${source.copyright}`}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-10">
        <Link href="/" className={linkClasses}>
          Back to the game
        </Link>
      </p>
    </main>
  );
}
