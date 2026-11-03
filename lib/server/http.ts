import "server-only";

import { GameError } from "@/lib/game/engine";

/** Imported card lists can be large, but not unbounded. */
const MAX_BODY_BYTES = 1_500_000;

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new GameError("Request is too large.", 413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new GameError("Request is too large.", 413);
  try {
    const body: unknown = JSON.parse(text || "{}");
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new GameError("Request body must be a JSON object.");
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof GameError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
