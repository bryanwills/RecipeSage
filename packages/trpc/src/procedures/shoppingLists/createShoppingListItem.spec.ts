import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("createShoppingListItem", () => {
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
    it("creates a shopping list item", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.createShoppingListItem.mutate({
        shoppingListId: shoppingList.id,
        title: "Apples",
        recipeId: null,
        categoryTitle: "Produce",
      });

      expect(typeof response.id).toBe("string");

      const item = await prisma.shoppingListItem.findUnique({
        where: {
          id: response.id,
        },
      });
      expect(item?.title).toEqual("Apples");
      expect(item?.shoppingListId).toEqual(shoppingList.id);
      expect(item?.completed).toEqual(false);
    });

    it("creates a shopping list item as a collaborator", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [{ userId: user2.id }],
            },
          },
        },
      });

      const response = await trpc2.shoppingLists.createShoppingListItem.mutate({
        shoppingListId: shoppingList.id,
        title: "Bread",
        recipeId: null,
        completed: true,
        categoryTitle: "Bakery",
      });

      const item = await prisma.shoppingListItem.findUnique({
        where: {
          id: response.id,
        },
      });
      expect(item?.userId).toEqual(user2.id);
      expect(item?.completed).toEqual(true);
      expect(item?.categoryTitle).toEqual("Bakery");
    });
  });

  describe("error", () => {
    it("throws when shopping list does not exist", async () => {
      return expect(async () => {
        await trpc.shoppingLists.createShoppingListItem.mutate({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          title: "Apples",
          recipeId: null,
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
        await trpc2.shoppingLists.createShoppingListItem.mutate({
          shoppingListId: shoppingList.id,
          title: "Apples",
          recipeId: null,
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
