import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("updateShoppingListItems", () => {
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
    it("updates multiple shopping list items", async () => {
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

      await trpc.shoppingLists.updateShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item1.id,
            title: "Pears",
            completed: true,
          },
          {
            id: item2.id,
            categoryTitle: "Bakery",
          },
        ],
      });

      const updated1 = await prisma.shoppingListItem.findUnique({
        where: { id: item1.id },
      });
      const updated2 = await prisma.shoppingListItem.findUnique({
        where: { id: item2.id },
      });
      expect(updated1?.title).toEqual("Pears");
      expect(updated1?.completed).toEqual(true);
      expect(updated2?.categoryTitle).toEqual("Bakery");
      expect(updated2?.title).toEqual("Bread");
    });
  });

  describe("error", () => {
    it("throws when one of the items does not exist", async () => {
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
        await trpc.shoppingLists.updateShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          items: [
            { id: item.id, title: "Pears" },
            {
              id: "00000000-0c70-4718-aacc-05add19096b5",
              title: "Bread",
            },
          ],
        });
      }).rejects.toThrow(
        "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
      );
    });

    it("throws when an item belongs to a different shopping list", async () => {
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
        await trpc.shoppingLists.updateShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          items: [{ id: otherItem.id, title: "Pears" }],
        });
      }).rejects.toThrow(
        "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
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
        await trpc2.shoppingLists.updateShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          items: [{ id: item.id, title: "Pears" }],
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
