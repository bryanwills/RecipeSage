import { inject } from "@angular/core";
import * as Sentry from "@sentry/browser";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@recipesage/trpc";

import { TRPCService } from "../trpc.service";
import { ErrorHandlers } from "../http-error-handler.service";
import { SyncService } from "../sync.service";
import { SearchService } from "../search.service";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export abstract class ActionsBase {
  protected trpcService = inject(TRPCService);
  protected syncService = inject(SyncService);
  protected searchService = inject(SearchService);

  protected get trpc() {
    return this.trpcService.trpc;
  }

  protected shouldAttemptFallback(error: unknown): boolean {
    if (!(error instanceof TRPCClientError)) return true;
    const statusCode = error.data?.httpStatus;
    if (statusCode === undefined) return true;
    return statusCode >= 500;
  }

  protected async executeQuery<T>(
    invoke: () => Promise<T>,
    fallback: () => Promise<T | undefined>,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    try {
      return await invoke();
    } catch (e) {
      if (this.shouldAttemptFallback(e)) {
        try {
          const fallbackResult = await fallback();
          if (fallbackResult !== undefined) {
            return fallbackResult;
          }
        } catch (fe) {
          console.warn("Local fallback failed", fe);
        }
      }
      return this.trpcService.handle(Promise.reject(e), errorHandlers);
    }
  }

  protected async executeMutation<T>(
    invoke: () => Promise<T>,
    onSuccess: (result: T) => void,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    try {
      const result = await invoke();
      onSuccess(result);
      return result;
    } catch (e) {
      return this.trpcService.handle(Promise.reject(e), errorHandlers);
    }
  }

  protected async executeMutationWithFallback<T>(
    invoke: () => Promise<T>,
    onSuccess: (result: T) => void,
    fallback: () => Promise<T>,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    try {
      const result = await invoke();
      onSuccess(result);
      return result;
    } catch (e) {
      if (this.shouldAttemptFallback(e)) {
        try {
          return await fallback();
        } catch (fe) {
          console.warn("Mutation fallback failed", fe);
          Sentry.captureException(fe);
        }
      }
      return this.trpcService.handle(Promise.reject(e), errorHandlers);
    }
  }

  protected passThrough<T>(
    invoke: () => Promise<T>,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    return this.trpcService.handle(invoke(), errorHandlers);
  }
}
