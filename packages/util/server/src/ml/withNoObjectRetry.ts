import { setTimeout } from "node:timers/promises";
import { NoObjectGeneratedError } from "ai";

const MAX_ATTEMPTS = 3;
const RETRY_WAIT_MS = 400;

export async function withNoObjectRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (!NoObjectGeneratedError.isInstance(err) || attempt >= MAX_ATTEMPTS) {
        throw err;
      }
      await setTimeout(RETRY_WAIT_MS);
    }
  }
}
