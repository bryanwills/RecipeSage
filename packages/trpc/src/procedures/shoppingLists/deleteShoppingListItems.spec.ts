import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("deleteShoppingListItems", () => {
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
    it("deletes multiple shopping list items", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const item1 = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });
      const item2 = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Bread",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await trpc.shoppingLists.deleteShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        ids: [item1.id, item2.id],
      });

      const remaining = await prisma.shoppingListItem.findMany({
        where: {
          shoppingListId: shoppingList.id,
        },
      });
      expect(remaining.length).toEqual(0);
    });

    it("does not delete items belonging to a different shopping list", async () => {
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

      await trpc.shoppingLists.deleteShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        ids: [otherItem.id],
      });

      const fetched = await prisma.shoppingListItem.findUnique({
        where: {
          id: otherItem.id,
        },
      });
      expect(fetched?.id).toEqual(otherItem.id);
    });
  });

  describe("error", () => {
    it("throws when shopping list does not exist", async () => {
      return expect(async () => {
        await trpc.shoppingLists.deleteShoppingListItems.mutate({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          ids: ["00000000-0c70-4718-aacc-05add19096b6"],
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
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await expect(async () => {
        await trpc2.shoppingLists.deleteShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          ids: [item.id],
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
