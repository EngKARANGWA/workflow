import { ApiError } from "./api";

export function formatError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errors) {
      const messages = Object.values(err.errors).flat();
      if (messages.length) return messages.join(" ");
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
