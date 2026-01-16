import type { Prisma } from "../prisma/generated/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export const recipeSummaryLite = {
  select: {
    id: true,
    userId: true,
    fromUserId: true,
    title: true,
    description: true,
    yield: true,
    activeTime: true,
    totalTime: true,
    source: true,
    url: true,
    folder: true,
    createdAt: true,
    updatedAt: true,
    lastMadeAt: true,
    rating: true,
    recipeLabels: {
      select: {
        label: {
          select: {
            title: true,
          },
        },
      },
    },
    recipeImages: {
      select: {
        order: true,
        image: {
          select: {
            location: true,
          },
        },
      },
    },
    fromUser: userPublic,
    user: userPublic,
  },
} satisfies Prisma.RecipeFindFirstArgs;

type InternalRecipeSummaryLite = Prisma.RecipeGetPayload<
  typeof recipeSummaryLite
>;

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummaryLite = Omit<
  InternalRecipeSummaryLite,
  "lastMadeAt"
> & {
  lastMadeAt: string | null;
};
