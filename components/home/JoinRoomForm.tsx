"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { joinRoom } from "@/lib/client/api";
import { apiErrorMessage } from "@/components/apiError";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClasses, labelClasses, MAX_NAME_LENGTH } from "@/components/ui/fields";
import { Panel } from "@/components/ui/Panel";

export function JoinRoomForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code) {
      setError("Enter the room code.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const session = await joinRoom(code, name.trim());
      router.push(`/room/${session.code}`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <Panel title="Join a room">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="grid grid-cols-[7.5rem_1fr] gap-3">
          <div>
            <label htmlFor="join-code" className={labelClasses}>
              Room code
            </label>
            <input
              id="join-code"
              className={`${inputClasses} font-mono font-bold uppercase tracking-[0.2em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCD"
              required
            />
          </div>
          <div>
            <label htmlFor="join-name" className={labelClasses}>
              Your name
            </label>
            <input
              id="join-name"
              className={inputClasses}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="nickname"
              enterKeyHint="go"
              placeholder="e.g. Alex"
              required
            />
          </div>
        </div>
        <ErrorText error={error} />
        <Button type="submit" variant="secondary" size="lg" pending={pending} className="w-full">
          Join room
        </Button>
        <p className="text-center text-xs text-zinc-500">Got an invite link? Just open it.</p>
      </form>
    </Panel>
  );
}
