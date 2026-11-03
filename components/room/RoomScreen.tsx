"use client";

import Link from "next/link";
import { use } from "react";
import { useRoom } from "@/lib/client/useRoom";
import { Game } from "@/components/game/Game";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { JoinThisRoom } from "./JoinThisRoom";
import { Lobby } from "./Lobby";
import { ReconnectingBanner } from "./ReconnectingBanner";
import { StatusScreen } from "./StatusScreen";

export function RoomScreen({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = use(params);
  const code = rawCode.trim().toUpperCase();
  const { status, view, message, act, reset } = useRoom(code);

  switch (status) {
    case "loading":
      return <FullScreenSpinner label="Opening the room…" />;
    case "connecting":
      return <FullScreenSpinner label="Connecting…" />;
    case "no-session":
      return <JoinThisRoom code={code} message={message} />;
    case "not-found":
      return (
        <StatusScreen title="Room not found" message={message ?? `There is no room with the code ${code}.`}>
          <Link href="/" className={buttonClasses("primary", "lg", "w-full")}>
            Go to the home page
          </Link>
        </StatusScreen>
      );
    case "removed":
      return (
        <StatusScreen title="You're out of the room" message={message ?? "You're no longer in this room."}>
          <Button size="lg" className="w-full" onClick={reset}>
            Join again
          </Button>
          <Link href="/" className={buttonClasses("secondary", "lg", "w-full")}>
            Go to the home page
          </Link>
        </StatusScreen>
      );
    case "connected":
    case "reconnecting":
      if (!view) {
        return <FullScreenSpinner label={status === "reconnecting" ? "Reconnecting…" : "Loading the room…"} />;
      }
      return (
        <>
          {status === "reconnecting" && <ReconnectingBanner />}
          {view.phase === "lobby" ? <Lobby view={view} act={act} /> : <Game view={view} act={act} />}
        </>
      );
  }
}
