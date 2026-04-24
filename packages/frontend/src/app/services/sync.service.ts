import { Injectable, inject } from "@angular/core";
import { SyncManager } from "../utils/SyncManager";
import { getLocalDb } from "../utils/localDb";
import { SearchService } from "./search.service";

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
    await manager.syncRecipe(recipeId);
  }

  async syncRecipes(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncRecipes();
  }

  async syncLabels(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncLabels();
  }

  async syncShoppingLists(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncShoppingLists();
  }

  async syncMealPlans(): Promise<void> {
    const manager = await this.managerP;
    await manager.syncMealPlans();
  }
}
