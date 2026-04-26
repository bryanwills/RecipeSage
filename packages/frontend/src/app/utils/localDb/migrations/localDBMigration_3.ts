import { IDBPDatabase } from "idb";
import { ObjectStoreName, type RSLocalDB } from "../localDb";

export const localDBMigration_3 = (db: IDBPDatabase<RSLocalDB>) => {
  const pendingShoppingListItemUpdatesDb = db.createObjectStore(
    ObjectStoreName.PendingShoppingListItemUpdates,
    {
      keyPath: "id",
    },
  );

  pendingShoppingListItemUpdatesDb.createIndex(
    "shoppingListId",
    "shoppingListId",
    { unique: false },
  );
};
