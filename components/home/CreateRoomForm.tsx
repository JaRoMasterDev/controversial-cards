"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createRoom } from "@/lib/client/api";
import { apiErrorMessage } from "@/components/apiError";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClasses, labelClasses, MAX_NAME_LENGTH } from "@/components/ui/fields";
import { Panel } from "@/components/ui/Panel";

export function CreateRoomForm() {
  const router = useRouter();
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
      const { code } = await createRoom(name.trim());
      router.push(`/room/${code}`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <Panel title="Create a room">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="create-name" className={labelClasses}>
            Your name
          </label>
          <input
            id="create-name"
            className={inputClasses}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            enterKeyHint="go"
            placeholder="e.g. Sam"
            required
          />
        </div>
        <ErrorText error={error} />
        <Button type="submit" size="lg" pending={pending} className="w-full">
          Create a room
        </Button>
        <p className="text-center text-xs text-zinc-500">You&apos;ll be the host and get a link to share.</p>
      </form>
    </Panel>
  );
}
