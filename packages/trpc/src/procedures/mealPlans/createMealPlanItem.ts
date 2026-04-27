import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEventIgnoringErrors,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";
import {
  MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";

export const createMealPlanItem = publicProcedure
  .input(
    z.object({
      mealPlanId: z.uuid(),
      title: z.string().min(1).max(MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT),
      scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: z.string().min(1).max(MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT),
      recipeId: z.uuid().nullable(),
      notes: z.string().max(MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.mealPlanId);

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you do not have access",
      });
    }

    const createdMealPlanItem = await prisma.mealPlanItem.create({
      data: {
        mealPlanId: input.mealPlanId,
        title: input.title,
        userId: session.userId,
        scheduledDate: new Date(input.scheduledDate),
        meal: input.meal,
        recipeId: input.recipeId,
        notes: input.notes ?? "",
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: input.mealPlanId,
        },
      );
    }

    return {
      reference,
      id: createdMealPlanItem.id,
    };
  });
