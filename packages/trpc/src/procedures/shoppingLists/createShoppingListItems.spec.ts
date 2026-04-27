import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("createShoppingListItems", () => {
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
    it("creates multiple shopping list items", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.createShoppingListItems.mutate({
        shoppingListId: shoppingList.id,
        items: [
          {
            title: "Apples",
            recipeId: null,
            categoryTitle: "Produce",
          },
          {
            title: "Bread",
            recipeId: null,
            completed: true,
            categoryTitle: "Bakery",
          },
        ],
      });

      expect(typeof response.reference).toBe("string");

      const items = await prisma.shoppingListItem.findMany({
        where: {
          shoppingListId: shoppingList.id,
        },
      });
      expect(items.length).toEqual(2);
      const bread = items.find((el) => el.title === "Bread");
      expect(bread?.completed).toEqual(true);
      expect(bread?.categoryTitle).toEqual("Bakery");
    });
  });

  describe("error", () => {
    it("throws when shopping list does not exist", async () => {
      return expect(async () => {
        await trpc.shoppingLists.createShoppingListItems.mutate({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          items: [
            {
              title: "Apples",
              recipeId: null,
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
        await trpc2.shoppingLists.createShoppingListItems.mutate({
          shoppingListId: shoppingList.id,
          items: [
            {
              title: "Apples",
              recipeId: null,
            },
          ],
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
