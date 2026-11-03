import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomScreen } from "@/components/room/RoomScreen";
import { FullScreenSpinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Game room",
};

// The room code is runtime data (no generateStaticParams), so it is read inside Suspense.
export default function RoomPage({ params }: PageProps<"/room/[code]">) {
  return (
    <Suspense fallback={<FullScreenSpinner label="Opening the room…" />}>
      <RoomScreen params={params} />
    </Suspense>
  );
}
