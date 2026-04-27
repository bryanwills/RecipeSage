import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("deleteShoppingListItem", () => {
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
    it("deletes a shopping list item", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const shoppingListItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      const response = await trpc.shoppingLists.deleteShoppingListItem.mutate({
        id: shoppingListItem.id,
      });

      expect(response.id).toEqual(shoppingListItem.id);

      const fetched = await prisma.shoppingListItem.findUnique({
        where: {
          id: shoppingListItem.id,
        },
      });
      expect(fetched).toEqual(null);
    });
  });

  describe("error", () => {
    it("throws when shopping list item not found", async () => {
      return expect(async () => {
        await trpc.shoppingLists.deleteShoppingListItem.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("NOT_FOUND");
    });

    it("throws when user does not have access to the shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const shoppingListItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await expect(async () => {
        await trpc2.shoppingLists.deleteShoppingListItem.mutate({
          id: shoppingListItem.id,
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
