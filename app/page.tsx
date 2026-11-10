import Link from "next/link";
import { AnswerCard } from "@/components/cards/AnswerCard";
import { PromptCard } from "@/components/cards/PromptCard";
import { CreateRoomForm } from "@/components/home/CreateRoomForm";
import { JoinRoomForm } from "@/components/home/JoinRoomForm";
import { Logo } from "@/components/ui/Logo";

const steps = [
  {
    title: "Gather the group",
    text: "Create a room and share the invite link. You need at least two players, each on their own phone or laptop.",
  },
  {
    title: "Play your answers",
    text: "Each round brings a question on a black card. Everyone fills its blanks with white answer cards from their hand. Worse is usually better.",
  },
  {
    title: "Vote for the best",
    text: "The answers are shown without names and everyone votes for their favourite. You can't vote for your own.",
  },
  {
    title: "Win the point",
    text: "The answer with the most votes scores a point, and tied answers all score. First to the target score wins.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <div>
          <h1>
            <Logo size="lg" />
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            The party game where you fill in the blanks with the worst possible answers, right in the browser.
          </p>
          <div aria-hidden className="relative mt-10 hidden h-72 lg:block">
            <div className="absolute left-0 top-0 w-48 -rotate-6">
              <PromptCard text="My therapist says the root of all my problems is _." pick={1} size="sm" />
            </div>
            <div className="absolute left-40 top-10 w-40 rotate-6">
              <AnswerCard text="Competitive napping." />
            </div>
            <div className="absolute left-72 top-4 w-40 rotate-[14deg] opacity-90">
              <AnswerCard text="A suspiciously confident raccoon." />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CreateRoomForm />
          <JoinRoomForm />
        </div>
      </section>

      <section className="mt-14 sm:mt-20" aria-labelledby="how-to-play">
        <h2 id="how-to-play" className="text-2xl font-black tracking-tight">
          How to play
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-sm font-black text-white ring-1 ring-white/10">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-zinc-500">
          Prefer a judge? The host can switch the room to a rotating judge, who sits out a round and picks the winner.
          Hosts can also pick the card sets or import their own as JSON. Questions with two or three blanks take that
          many answers, played in order. With only two players you take turns as the leader, who plays a card too and
          then picks the winner.
        </p>
      </section>

      <footer className="mt-14 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        Some card sets are adapted from free print-and-play decks under Creative Commons BY-NC-SA, for non-commercial
        play only.{" "}
        <Link href="/credits" className="font-semibold text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
          Credits and licences
        </Link>
      </footer>
    </main>
  );
}
