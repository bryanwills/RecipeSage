import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getShoppingListsWithItems", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;
  let trpc2: TRPCClient<AppRouter>;

  beforeEach(async () => {
    ({ user, user2, trpc, trpc2 } = await trpcSetup());
  });

  afterEach(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("returns owned shopping lists with their items", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      const response =
        await trpc.shoppingLists.getShoppingListsWithItems.query();

      expect(response.length).toEqual(1);
      expect(response[0].id).toEqual(shoppingList.id);
      expect(response[0].items.length).toEqual(1);
      expect(response[0].items[0].title).toEqual("Apples");
    });

    it("returns shopping lists where the user is a collaborator", async () => {
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

      const response =
        await trpc2.shoppingLists.getShoppingListsWithItems.query();
      expect(response.length).toEqual(1);
      expect(response[0].id).toEqual(shoppingList.id);
    });

    it("returns an empty array when the user has none", async () => {
      const response =
        await trpc.shoppingLists.getShoppingListsWithItems.query();
      expect(response.length).toEqual(0);
    });
  });
});
