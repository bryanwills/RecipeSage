import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("upsertShoppingListItems", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;
  let trpc2: TRPCClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc, trpc2 } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("creates new items when ids do not exist", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const newId = crypto.randomUUID();
      await trpc.shoppingLists.upsertShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: newId,
            title: "Apples",
            recipeId: null,
            categoryTitle: "Produce",
            updatedAt: new Date(),
          },
        ],
      });

      const created = await prisma.shoppingListItem.findUnique({
        where: { id: newId },
      });
      expect(created?.title).toEqual("Apples");
      expect(created?.shoppingListId).toEqual(shoppingList.id);
      expect(created?.userId).toEqual(user.id);
    });

    it("updates existing items when the incoming updatedAt is newer", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const originalUpdatedAt = new Date(Date.now() - 60000);
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
          updatedAt: originalUpdatedAt,
        },
      });

      await trpc.shoppingLists.upsertShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item.id,
            title: "Pears",
            recipeId: null,
            completed: true,
            categoryTitle: "Produce",
            updatedAt: new Date(),
          },
        ],
      });

      const updated = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(updated?.title).toEqual("Pears");
      expect(updated?.completed).toEqual(true);
      expect(
        (updated?.updatedAt.getTime() ?? 0) > originalUpdatedAt.getTime(),
      ).toEqual(true);
    });

    it("updates existing items when the incoming updatedAt equals the stored one", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const sharedUpdatedAt = new Date(Date.now() - 60000);
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
          updatedAt: sharedUpdatedAt,
        },
      });

      await trpc.shoppingLists.upsertShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item.id,
            title: "Pears",
            recipeId: null,
            categoryTitle: "Produce",
            updatedAt: sharedUpdatedAt,
          },
        ],
      });

      const updated = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(updated?.title).toEqual("Pears");
    });

    it("does not overwrite items with a stale updatedAt", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await trpc.shoppingLists.upsertShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item.id,
            title: "Pears",
            recipeId: null,
            categoryTitle: "Produce",
            updatedAt: new Date(Date.now() - 60000),
          },
        ],
      });

      const fetched = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(fetched?.title).toEqual("Apples");
    });
  });

  describe("error", () => {
    it("throws when shopping list does not exist", async () => {
      return expect(async () => {
        await trpc.shoppingLists.upsertShoppingListItems.mutate({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          items: [
            {
              id: crypto.randomUUID(),
              title: "Apples",
              recipeId: null,
              categoryTitle: "Produce",
              updatedAt: new Date(),
            },
          ],
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });

    it("throws when user does not have access to the shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(async () => {
        await trpc2.shoppingLists.upsertShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          items: [
            {
              id: crypto.randomUUID(),
              title: "Apples",
              recipeId: null,
              categoryTitle: "Produce",
              updatedAt: new Date(),
            },
          ],
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });

    it("throws when an existing item belongs to a different shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const otherShoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const otherItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: otherShoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await expect(async () => {
        await trpc.shoppingLists.upsertShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          items: [
            {
              id: otherItem.id,
              title: "Pears",
              recipeId: null,
              categoryTitle: "Produce",
              updatedAt: new Date(),
            },
          ],
        });
      }).rejects.toThrow(
        "One of the items you've passed does not not belong to the shopping list id you're updating",
      );
    });
  });
});
