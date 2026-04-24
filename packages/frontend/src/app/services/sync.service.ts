import { Injectable, inject } from "@angular/core";
import { AbortedSyncError, SyncManager } from "../utils/SyncManager";
import { getLocalDb } from "../utils/localDb";
import { SearchService } from "./search.service";
import { TRPCClientError } from "@trpc/client";
import * as Sentry from "@sentry/browser";

const RS_LOGO_URL = "https://recipesage.com/assets/imgs/logo_green.png";

@Injectable({
  providedIn: "root",
})
export class SyncService {
  private searchService = inject(SearchService);

  private managerP = (async () => {
    const [localDb, searchManager] = await Promise.all([
      getLocalDb(),
      this.searchService.getManager(),
    ]);
    return new SyncManager(localDb, searchManager);
  })();

  constructor() {
    this.syncAll();
  }

  async syncAll(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncAll();
  }

  async syncAllAndNotify(notification: {
    title: string;
    body: string;
    tag?: string;
  }): Promise<void> {
    await this.syncAll();

    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, {
        tag: notification.tag || "syncCompleted",
        icon: RS_LOGO_URL,
        body: notification.body,
      });
    } catch (e) {
      console.warn("Failed to show sync-completed notification", e);
    }
  }

  async syncRecipe(recipeId: string): Promise<void> {
    const manager = await this.managerP;
    await manager.syncRecipe(recipeId).catch((e) => {
      console.error(e);
      if (!(e instanceof TRPCClientError) && !(e instanceof AbortedSyncError)) {
        Sentry.captureException(e);
      }
    });
  }

  async syncRecipes(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncRecipes().catch((e) => {
      console.error(e);
      if (!(e instanceof TRPCClientError) && !(e instanceof AbortedSyncError)) {
        Sentry.captureException(e);
      }
    });
  }

  async syncLabels(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncLabels().catch((e) => {
      console.error(e);
      if (!(e instanceof TRPCClientError) && !(e instanceof AbortedSyncError)) {
        Sentry.captureException(e);
      }
    });
  }

  async syncLabelGroups(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncLabelGroups().catch((e) => {
      console.error(e);
      if (!(e instanceof TRPCClientError) && !(e instanceof AbortedSyncError)) {
        Sentry.captureException(e);
      }
    });
  }

  async syncShoppingLists(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncShoppingLists().catch((e) => {
      console.error(e);
      if (!(e instanceof TRPCClientError) && !(e instanceof AbortedSyncError)) {
        Sentry.captureException(e);
      }
    });
  }

  async syncMealPlans(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncMealPlans().catch((e) => {
      console.error(e);
      if (!(e instanceof TRPCClientError) && !(e instanceof AbortedSyncError)) {
        Sentry.captureException(e);
      }
    });
  }
}
