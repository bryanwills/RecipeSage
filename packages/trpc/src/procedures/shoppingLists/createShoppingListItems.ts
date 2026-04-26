import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEventIgnoringErrors,
  getShoppingListItemCategories,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import {
  CREATE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";

export const createShoppingListItems = publicProcedure
  .input(
    z.object({
      shoppingListId: z.uuid(),
      items: z
        .array(
          z.object({
            title: z
              .string()
              .min(1)
              .max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
            recipeId: z.uuid().nullable(),
            completed: z.boolean().optional(),
            categoryTitle: z.string().optional(),
          }),
        )
        .min(1)
        .max(CREATE_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToShoppingList(
      session.userId,
      input.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    const autoCategories = await getShoppingListItemCategories(
      input.items.map((el) => el.title),
    );
    const itemsWithCategoryTitles = input.items.map((item, idx) => ({
      ...item,
      completed: item.completed ?? false,
      categoryTitle: item.categoryTitle ?? `::${autoCategories[idx]}`,
      userId: session.userId,
      shoppingListId: input.shoppingListId,
    }));

    await prisma.shoppingListItem.createMany({
      data: itemsWithCategoryTitles,
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: input.shoppingListId,
        },
      );
    }

    return {
      reference,
    };
  });
