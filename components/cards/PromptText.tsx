import { countBlanks, fillPrompt, type PromptSegment } from "@/lib/game/cards";

/**
 * Renders a question with its blanks. With `answers` the blanks are filled in order
 * (unfilled ones stay empty); without, blanks are drawn as empty underlines.
 */
export function PromptText({
  text,
  answers,
  answerClassName = "text-rose-300",
}: {
  text: string;
  answers?: string[];
  answerClassName?: string;
}) {
  // A question without a blank only gets a trailing blank once answers are shown.
  const segments: PromptSegment[] =
    answers === undefined && countBlanks(text) === 0 ? [{ kind: "text", text }] : fillPrompt(text, answers ?? []);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.kind === "text") return <span key={i}>{segment.text}</span>;
        if (segment.answer === null) {
          return (
            <span key={i}>
              <span aria-hidden className="mx-0.5 inline-block w-[3.2em] border-b-[3px] border-current align-baseline" />
              <span className="sr-only">blank</span>
            </span>
          );
        }
        return (
          <span
            key={i}
            className={`underline decoration-current/40 decoration-2 underline-offset-[0.2em] ${answerClassName}`}
          >
            {segment.answer}
          </span>
        );
      })}
    </>
  );
}

/** Total characters a filled question shows, used to pick a font size. */
export function filledLength(text: string, answers: string[] = []): number {
  return answers.reduce((sum, a) => sum + a.length, text.length);
}
