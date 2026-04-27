import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("updateShoppingListItem", () => {
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
    it("updates a shopping list item", async () => {
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

      const response = await trpc.shoppingLists.updateShoppingListItem.mutate({
        id: item.id,
        title: "Bread",
        completed: true,
        categoryTitle: "Bakery",
      });
      expect(response.id).toEqual(item.id);

      const updated = await prisma.shoppingListItem.findUnique({
        where: {
          id: item.id,
        },
      });
      expect(updated?.title).toEqual("Bread");
      expect(updated?.completed).toEqual(true);
      expect(updated?.categoryTitle).toEqual("Bakery");
    });
  });

  describe("error", () => {
    it("throws when no properties are provided", async () => {
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
        await trpc.shoppingLists.updateShoppingListItem.mutate({
          id: item.id,
        });
      }).rejects.toThrow("You must specify at least one property to update");
    });

    it("throws when shopping list item not found", async () => {
      return expect(async () => {
        await trpc.shoppingLists.updateShoppingListItem.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          title: "Bread",
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
        await trpc2.shoppingLists.updateShoppingListItem.mutate({
          id: item.id,
          title: "Bread",
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
