import { errorResponse, readJson } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** Join a room. Body: { name }. Returns the player's session { code, playerId, token }. */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    const { code } = await ctx.params;
    const body = await readJson(request);
    return Response.json(store.join(code, body.name));
  } catch (error) {
    return errorResponse(error);
  }
}
