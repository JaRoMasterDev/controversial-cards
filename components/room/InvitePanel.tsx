"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { CheckIcon, CopyIcon, LinkIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";

const noopSubscribe = () => () => {};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // The Clipboard API needs a secure context (e.g. not on a LAN address over http).
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function InvitePanel({ code }: { code: string }) {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copy, setCopy] = useState<"copied" | "failed" | null>(null);
  const link = `${origin}/room/${code}`;

  async function onCopy() {
    const ok = await copyText(link);
    setCopy(ok ? "copied" : "failed");
    setTimeout(() => setCopy(null), 2500);
  }

  async function onShare() {
    try {
      await navigator.share({ title: "Controversial Cards", text: `Join my game! Room code ${code}`, url: link });
    } catch {
      // Cancelled by the user.
    }
  }

  return (
    <Panel>
      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Room code</p>
        <p className="mt-1 font-mono text-5xl font-black tracking-[0.25em] text-zinc-950 sm:text-6xl dark:text-white">
          {code}
        </p>
        <p className="mt-2 text-sm text-zinc-500">Friends can enter this code on the home page, or open the link.</p>
        <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="secondary" onClick={onCopy} className="sm:min-w-48">
            {copy === "copied" ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon />}
            {copy === "copied" ? "Link copied" : "Copy invite link"}
          </Button>
          {canShare && (
            <Button variant="secondary" onClick={onShare}>
              <LinkIcon />
              Share
            </Button>
          )}
        </div>
        {copy === "failed" && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">Couldn&apos;t copy. Select the link below instead.</p>
        )}
        <input
          readOnly
          aria-label="Invite link"
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-3 w-full truncate rounded-lg bg-zinc-100 px-3 py-1.5 text-center font-mono text-xs text-zinc-600 outline-none focus:ring-2 focus:ring-rose-500/30 dark:bg-zinc-800 dark:text-zinc-400"
        />
      </div>
    </Panel>
  );
}
