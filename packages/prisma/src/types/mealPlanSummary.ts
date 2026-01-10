import type { Prisma } from "../prisma/generated/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export const mealPlanSummary = {
  select: {
    id: true,
    userId: true,
    user: userPublic,
    collaboratorUsers: {
      select: {
        user: userPublic,
      },
    },
    title: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        items: true,
      },
    },
  },
} satisfies Prisma.MealPlanFindFirstArgs;

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export type MealPlanSummary = Prisma.MealPlanGetPayload<typeof mealPlanSummary>;
