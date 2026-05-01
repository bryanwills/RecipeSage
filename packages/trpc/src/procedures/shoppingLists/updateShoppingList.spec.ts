import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@recipesage/prisma";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("updateShoppingList", () => {
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
    it("updates the title of a shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.updateShoppingList.mutate({
        id: shoppingList.id,
        title: "newtitle",
      });
      expect(response.id).toEqual(shoppingList.id);

      const updated = await prisma.shoppingList.findUnique({
        where: {
          id: shoppingList.id,
        },
      });
      expect(updated?.title).toEqual("newtitle");
    });

    it("updates the categoryOrder of a shopping list", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList.mutate({
        id: shoppingList.id,
        categoryOrder: "Produce,Bakery",
      });

      const updated = await prisma.shoppingList.findUnique({
        where: {
          id: shoppingList.id,
        },
      });
      expect(updated?.categoryOrder).toEqual("Produce,Bakery");
    });

    it("clears the categoryOrder when null is passed", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          categoryOrder: "Produce,Bakery",
        },
      });

      await trpc.shoppingLists.updateShoppingList.mutate({
        id: shoppingList.id,
        categoryOrder: null,
      });

      const updated = await prisma.shoppingList.findUnique({
        where: {
          id: shoppingList.id,
        },
      });
      expect(updated?.categoryOrder).toEqual(null);
    });

    it("updates title and collaborators in a single call", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList.mutate({
        id: shoppingList.id,
        title: "combined",
        collaboratorUserIds: [user2.id],
      });

      const updated = await prisma.shoppingList.findUnique({
        where: {
          id: shoppingList.id,
        },
      });
      expect(updated?.title).toEqual("combined");

      const collaborators = await prisma.shoppingListCollaborator.findMany({
        where: {
          shoppingListId: shoppingList.id,
        },
      });
      expect(collaborators.length).toEqual(1);
      expect(collaborators[0].userId).toEqual(user2.id);
    });

    it("updates collaborators by replacing the existing set", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList.mutate({
        id: shoppingList.id,
        collaboratorUserIds: [user2.id],
      });

      const collaborators = await prisma.shoppingListCollaborator.findMany({
        where: {
          shoppingListId: shoppingList.id,
        },
      });
      expect(collaborators.length).toEqual(1);
      expect(collaborators[0].userId).toEqual(user2.id);

      await trpc.shoppingLists.updateShoppingList.mutate({
        id: shoppingList.id,
        collaboratorUserIds: [],
      });

      const collaboratorsAfter = await prisma.shoppingListCollaborator.findMany(
        {
          where: {
            shoppingListId: shoppingList.id,
          },
        },
      );
      expect(collaboratorsAfter.length).toEqual(0);
    });
  });

  describe("error", () => {
    it("throws when shopping list not found", async () => {
      return expect(async () => {
        await trpc.shoppingLists.updateShoppingList.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          title: "newtitle",
        });
      }).rejects.toThrow("Shopping list not found or you do not own it");
    });

    it("throws when user is only a collaborator", async () => {
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

      await expect(async () => {
        await trpc2.shoppingLists.updateShoppingList.mutate({
          id: shoppingList.id,
          title: "newtitle",
        });
      }).rejects.toThrow("Shopping list not found or you do not own it");
    });

    it("throws when a collaborator user id is invalid", async () => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(async () => {
        await trpc.shoppingLists.updateShoppingList.mutate({
          id: shoppingList.id,
          collaboratorUserIds: ["00000000-0c70-4718-aacc-05add19096b5"],
        });
      }).rejects.toThrow(
        "One or more of the collaborators you specified are not valid",
      );
    });
  });
});
