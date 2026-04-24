import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";
import { getLocalDb, ObjectStoreName } from "../../utils/localDb";

@Injectable({
  providedIn: "root",
})
export class ShoppingListsActionsService extends ActionsBase {
  getShoppingList(
    input: RouterInputs["shoppingLists"]["getShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["getShoppingList"] | undefined> {
    return this.executeQuery(
      () => this.trpc.shoppingLists.getShoppingList.query(input),
      async () => {
        const localDb = await getLocalDb();
        return localDb.get(ObjectStoreName.ShoppingLists, input.id);
      },
      errorHandlers,
    );
  }

  getShoppingLists(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["getShoppingLists"] | undefined> {
    return this.executeQuery(
      () => this.trpc.shoppingLists.getShoppingLists.query(),
      async () => {
        const localDb = await getLocalDb();
        return localDb.getAll(ObjectStoreName.ShoppingLists);
      },
      errorHandlers,
    );
  }

  getShoppingListItems(
    input: RouterInputs["shoppingLists"]["getShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["getShoppingListItems"] | undefined
  > {
    return this.executeQuery(
      () => this.trpc.shoppingLists.getShoppingListItems.query(input),
      async () => {
        const localDb = await getLocalDb();
        const shoppingList = await localDb.get(
          ObjectStoreName.ShoppingLists,
          input.shoppingListId,
        );
        if (!shoppingList) return undefined;
        return shoppingList.items;
      },
      errorHandlers,
    );
  }

  createShoppingList(
    input: RouterInputs["shoppingLists"]["createShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["createShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.createShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  createShoppingListItem(
    input: RouterInputs["shoppingLists"]["createShoppingListItem"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["createShoppingListItem"] | undefined
  > {
    return this.executeMutation(
      () => this.trpc.shoppingLists.createShoppingListItem.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  createShoppingListItems(
    input: RouterInputs["shoppingLists"]["createShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["createShoppingListItems"] | undefined
  > {
    return this.executeMutation(
      () => this.trpc.shoppingLists.createShoppingListItems.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  deleteShoppingList(
    input: RouterInputs["shoppingLists"]["deleteShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["deleteShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.deleteShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  deleteShoppingListItem(
    input: RouterInputs["shoppingLists"]["deleteShoppingListItem"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["deleteShoppingListItem"] | undefined
  > {
    return this.executeMutation(
      () => this.trpc.shoppingLists.deleteShoppingListItem.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  deleteShoppingListItems(
    input: RouterInputs["shoppingLists"]["deleteShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["deleteShoppingListItems"] | undefined
  > {
    return this.executeMutation(
      () => this.trpc.shoppingLists.deleteShoppingListItems.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  detachShoppingList(
    input: RouterInputs["shoppingLists"]["detachShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["detachShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.detachShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  updateShoppingList(
    input: RouterInputs["shoppingLists"]["updateShoppingList"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["shoppingLists"]["updateShoppingList"] | undefined> {
    return this.executeMutation(
      () => this.trpc.shoppingLists.updateShoppingList.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  updateShoppingListItem(
    input: RouterInputs["shoppingLists"]["updateShoppingListItem"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["updateShoppingListItem"] | undefined
  > {
    return this.executeMutation(
      () => this.trpc.shoppingLists.updateShoppingListItem.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }

  updateShoppingListItems(
    input: RouterInputs["shoppingLists"]["updateShoppingListItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["shoppingLists"]["updateShoppingListItems"] | undefined
  > {
    return this.executeMutation(
      () => this.trpc.shoppingLists.updateShoppingListItems.mutate(input),
      () => {
        void this.syncService.syncShoppingLists();
      },
      errorHandlers,
    );
  }
}
