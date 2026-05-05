import { describe, it, expect, vi } from "vitest";
import { NoObjectGeneratedError } from "ai";
import { withNoObjectRetry } from "./withNoObjectRetry";

const makeNoObjectError = () =>
  new NoObjectGeneratedError({
    message: "fake",
    response: {
      id: "fake",
      timestamp: new Date(0),
      modelId: "fake",
    },
    usage: {
      inputTokens: undefined,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokens: undefined,
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
      totalTokens: undefined,
    },
    finishReason: "stop",
  });

describe("withNoObjectRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withNoObjectRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after NoObjectGeneratedError and returns success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(makeNoObjectError())
      .mockResolvedValue("ok");
    const result = await withNoObjectRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rethrows the final NoObjectGeneratedError after 3 failed attempts", async () => {
    const finalError = makeNoObjectError();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(makeNoObjectError())
      .mockRejectedValueOnce(finalError);
    await expect(withNoObjectRetry(fn)).rejects.toBe(finalError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rethrows non-NoObjectGeneratedError immediately without retrying", async () => {
    const other = new Error("nope");
    const fn = vi.fn().mockRejectedValue(other);
    await expect(withNoObjectRetry(fn)).rejects.toBe(other);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("waits ~400ms between attempts", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeNoObjectError())
      .mockResolvedValue("ok");
    const start = Date.now();
    await withNoObjectRetry(fn);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(380);
    expect(elapsed).toBeLessThan(800);
  });
});
