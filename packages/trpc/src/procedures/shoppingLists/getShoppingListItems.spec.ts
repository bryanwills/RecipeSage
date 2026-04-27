import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getShoppingListItems", () => {
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
    it("gets shopping list items as the owner", async () => {
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

      const response = await trpc.shoppingLists.getShoppingListItems.query({
        shoppingListId: shoppingList.id,
      });

      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual("Apples");
    });

    it("returns items ordered by createdAt descending", async () => {
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
          createdAt: new Date(Date.now() - 60000),
        },
      });
      await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Bread",
          completed: false,
          categoryTitle: "::uncategorized",
          createdAt: new Date(),
        },
      });

      const response = await trpc.shoppingLists.getShoppingListItems.query({
        shoppingListId: shoppingList.id,
      });

      expect(response.length).toEqual(2);
      expect(response[0].title).toEqual("Bread");
      expect(response[1].title).toEqual("Apples");
    });

    it("gets shopping list items as a collaborator", async () => {
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
      await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      const response = await trpc2.shoppingLists.getShoppingListItems.query({
        shoppingListId: shoppingList.id,
      });
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual("Apples");
    });

    it("returns an empty array when the shopping list has no items", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.getShoppingListItems.query({
        shoppingListId: shoppingList.id,
      });
      expect(response.length).toEqual(0);
    });
  });

  describe("error", () => {
    it("throws when shopping list not found", async () => {
      return expect(async () => {
        await trpc.shoppingLists.getShoppingListItems.query({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Shopping list not found or you do not have access");
    });

    it("throws when user has no access to the shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(async () => {
        await trpc2.shoppingLists.getShoppingListItems.query({
          shoppingListId: shoppingList.id,
        });
      }).rejects.toThrow("Shopping list not found or you do not have access");
    });
  });
});
