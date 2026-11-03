import type { NextRequest } from "next/server";
import { GameError } from "@/lib/game/engine";
import type { ServerEvent } from "@/lib/game/types";
import { store } from "@/lib/server/store";

const KEEP_ALIVE_MS = 20_000;

/**
 * Server-Sent Events stream of the room, personalised for the player: GET ?token=...
 * Sends a `state` event on every change. Errors are sent as an `error` event (with a
 * 200 status) so the client can tell "room gone" apart from a network blip.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/rooms/[code]/events">) {
  const { code } = await ctx.params;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const encoder = new TextEncoder();

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const write = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };
      const send = (event: ServerEvent) => write(`data: ${JSON.stringify(event)}\n\n`);
      const keepAlive = setInterval(() => write(": keep-alive\n\n"), KEEP_ALIVE_MS);

      let disconnect = () => {};
      function close() {
        if (!open) return;
        open = false;
        clearInterval(keepAlive);
        disconnect();
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      }
      cleanup = close;
      request.signal.addEventListener("abort", close);

      try {
        disconnect = store.connect(code, token, { send, close: () => close() });
      } catch (error) {
        const known = error instanceof GameError;
        send({
          type: "error",
          code: known && error.status === 404 ? "ROOM_NOT_FOUND" : "INVALID_TOKEN",
          message: known ? error.message : "Couldn't connect to the room.",
        });
        close();
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression from buffering the stream
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
