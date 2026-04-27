import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("createShoppingList", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("creates a shopping list with no collaborators", async () => {
      const response = await trpc.shoppingLists.createShoppingList.mutate({
        title: faker.string.alphanumeric(10),
        collaboratorUserIds: [],
      });

      expect(typeof response.id).toBe("string");
      expect(typeof response.reference).toBe("string");

      const shoppingList = await prisma.shoppingList.findUnique({
        where: {
          id: response.id,
        },
      });
      expect(shoppingList?.userId).toEqual(user.id);
    });

    it("creates a shopping list with collaborators", async () => {
      const response = await trpc.shoppingLists.createShoppingList.mutate({
        title: faker.string.alphanumeric(10),
        collaboratorUserIds: [user2.id],
      });

      expect(typeof response.id).toBe("string");

      const collaborators = await prisma.shoppingListCollaborator.findMany({
        where: {
          shoppingListId: response.id,
        },
      });
      expect(collaborators.length).toEqual(1);
      expect(collaborators[0].userId).toEqual(user2.id);
    });
  });

  describe("error", () => {
    it("throws when a collaborator user id is invalid", async () => {
      return expect(async () => {
        await trpc.shoppingLists.createShoppingList.mutate({
          title: faker.string.alphanumeric(10),
          collaboratorUserIds: ["00000000-0c70-4718-aacc-05add19096b5"],
        });
      }).rejects.toThrow(
        "One or more of the collaborators you specified are not valid",
      );
    });
  });
});
