import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("detachShoppingList", () => {
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
    it("removes the collaborator from the shopping list", async () => {
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

      const response = await trpc2.shoppingLists.detachShoppingList.mutate({
        id: shoppingList.id,
      });

      expect(response.id).toEqual(shoppingList.id);

      const collab = await prisma.shoppingListCollaborator.findUnique({
        where: {
          shoppingListId_userId: {
            shoppingListId: shoppingList.id,
            userId: user2.id,
          },
        },
      });
      expect(collab).toEqual(null);

      const fetched = await prisma.shoppingList.findUnique({
        where: {
          id: shoppingList.id,
        },
      });
      expect(fetched?.id).toEqual(shoppingList.id);
    });
  });

  describe("error", () => {
    it("throws when shopping list not found", async () => {
      return expect(async () => {
        await trpc.shoppingLists.detachShoppingList.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you are not a collaborator for it",
      );
    });

    it("throws when user is the owner", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(async () => {
        await trpc.shoppingLists.detachShoppingList.mutate({
          id: shoppingList.id,
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you are not a collaborator for it",
      );
    });

    it("throws when user has no relationship to the shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(async () => {
        await trpc2.shoppingLists.detachShoppingList.mutate({
          id: shoppingList.id,
        });
      }).rejects.toThrow(
        "Shopping list with that id does not exist or you are not a collaborator for it",
      );
    });
  });
});
