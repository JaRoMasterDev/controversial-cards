"use client";

import { useRouter } from "next/navigation";
import { useAction, type Act } from "@/components/useAction";
import { Button } from "@/components/ui/Button";
import { LogOutIcon } from "@/components/ui/icons";

/** Leaves the room for good and goes back to the home page. */
export function LeaveRoomButton({
  act,
  confirmFirst = false,
  className = "",
}: {
  act: Act;
  /** Ask before leaving, e.g. during a game where the seat and score are lost. */
  confirmFirst?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { run, pending } = useAction(act);

  async function leave() {
    if (confirmFirst && !window.confirm("Leave the room? You'll lose your seat and your points.")) return;
    const { error } = await run({ type: "leave" });
    if (error) {
      window.alert(error);
      return;
    }
    router.push("/");
  }

  return (
    <Button variant="ghost" size="sm" pending={pending} onClick={leave} className={className}>
      {!pending && <LogOutIcon />}
      Leave room
    </Button>
  );
}
