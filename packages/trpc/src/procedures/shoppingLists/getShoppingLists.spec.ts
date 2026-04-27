import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getShoppingLists", () => {
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
    it("returns owned shopping lists", async () => {
      const ownedTitle = faker.string.alphanumeric(10);
      await prisma.shoppingList.create({
        data: {
          title: ownedTitle,
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.getShoppingLists.query();
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual(ownedTitle);
    });

    it("returns shopping lists where the user is a collaborator", async () => {
      const sharedTitle = faker.string.alphanumeric(10);
      await prisma.shoppingList.create({
        data: {
          title: sharedTitle,
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [{ userId: user2.id }],
            },
          },
        },
      });

      const response = await trpc2.shoppingLists.getShoppingLists.query();
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual(sharedTitle);
    });

    it("returns an empty array when the user has none", async () => {
      const response = await trpc.shoppingLists.getShoppingLists.query();
      expect(response.length).toEqual(0);
    });

    it("does not return shopping lists owned by other users without a collaborator relationship", async () => {
      await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc2.shoppingLists.getShoppingLists.query();
      expect(response.length).toEqual(0);
    });
  });
});
