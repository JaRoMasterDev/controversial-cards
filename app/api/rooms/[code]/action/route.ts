import type { Action } from "@/lib/game/types";
import { errorResponse, readJson } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/**
 * Perform a game action. Header `x-player-token`, body: an Action ({ type, ...fields }).
 * The new state is pushed to everyone over the events stream; this only returns { ok }.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/action">) {
  try {
    const { code } = await ctx.params;
    const token = request.headers.get("x-player-token") ?? "";
    const action = (await readJson(request)) as unknown as Action;
    const result = store.act(code, token, action);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
