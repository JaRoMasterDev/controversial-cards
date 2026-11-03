import { ApiError } from "@/lib/client/api";

/** A message for a failed createRoom / joinRoom call. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Couldn't reach the server. Check your connection and try again.";
}
