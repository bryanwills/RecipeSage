import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getShoppingList", () => {
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
    it("gets a shopping list as the owner", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.getShoppingList.query({
        id: shoppingList.id,
      });
      expect(response.id).toEqual(shoppingList.id);
    });

    it("gets a shopping list as a collaborator", async () => {
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

      const response = await trpc2.shoppingLists.getShoppingList.query({
        id: shoppingList.id,
      });
      expect(response.id).toEqual(shoppingList.id);
    });
  });

  describe("error", () => {
    it("throws when shopping list not found", async () => {
      return expect(async () => {
        await trpc.shoppingLists.getShoppingList.query({
          id: "00000000-0c70-4718-aacc-05add19096b5",
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
        await trpc2.shoppingLists.getShoppingList.query({
          id: shoppingList.id,
        });
      }).rejects.toThrow("Shopping list not found or you do not have access");
    });
  });
});
