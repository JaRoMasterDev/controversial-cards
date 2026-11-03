"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { joinRoom } from "@/lib/client/api";
import { apiErrorMessage } from "@/components/apiError";
import { Alert, ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClasses, labelClasses, MAX_NAME_LENGTH } from "@/components/ui/fields";
import { StatusScreen } from "./StatusScreen";

/** Name-only join form for someone who opened a room link without a seat. */
export function JoinThisRoom({ code, message }: { code: string; message: string | null }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      // On success the room hook picks up the stored session and connects.
      await joinRoom(code, name.trim());
    } catch (err) {
      setError(apiErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <StatusScreen
      title={
        <>
          Join room <span className="font-mono tracking-[0.15em] text-rose-600 dark:text-rose-400">{code}</span>
        </>
      }
      message="Pick a name the others will recognise."
    >
      {message && <Alert tone="notice">{message}</Alert>}
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="room-join-name" className={labelClasses}>
            Your name
          </label>
          <input
            id="room-join-name"
            className={inputClasses}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            enterKeyHint="go"
            placeholder="e.g. Alex"
            autoFocus
            required
          />
        </div>
        <ErrorText error={error} />
        <Button type="submit" size="lg" pending={pending} className="w-full">
          Join the game
        </Button>
      </form>
      <p className="text-center text-xs leading-relaxed text-zinc-500">
        Lost your seat? Join with the same name to get your score back.
      </p>
      <Link href="/" className="text-center text-sm font-semibold text-zinc-600 hover:underline dark:text-zinc-400">
        Back to the home page
      </Link>
    </StatusScreen>
  );
}
