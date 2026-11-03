import { errorResponse, readJson } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** Create a room. Body: { name }. Returns the host's session { code, playerId, token }. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    return Response.json(store.create(body.name), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
