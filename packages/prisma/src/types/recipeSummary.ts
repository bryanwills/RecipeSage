import type { Prisma } from "../prisma/generated/client";
import { userPublic } from "./userPublic";
import { labelSummary } from "./labelSummary";
import { recipeSummaryLite } from "./recipeSummaryLite";

/**
 * All recipe fields including labels, user profile, images, etc
 **/
export const recipeSummary = {
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
    ingredients: true,
    instructions: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    lastMadeAt: true,
    rating: true,
    nutritionServingSize: true,
    nutritionCalories: true,
    nutritionTotalFat: true,
    nutritionSaturatedFat: true,
    nutritionTransFat: true,
    nutritionPolyunsaturatedFat: true,
    nutritionMonounsaturatedFat: true,
    nutritionCholesterol: true,
    nutritionSodium: true,
    nutritionTotalCarbs: true,
    nutritionDietaryFiber: true,
    nutritionTotalSugars: true,
    nutritionAddedSugars: true,
    nutritionProtein: true,
    nutritionVitaminD: true,
    nutritionCalcium: true,
    nutritionIron: true,
    nutritionPotassium: true,
    nutritionOtherDetails: true,
    recipeLabels: {
      select: {
        id: true,
        labelId: true, // TODO: Remove after v3.3.x has settled
        recipeId: true, // TODO: Remove after v3.3.x has settled
        createdAt: true,
        updatedAt: true,
        label: labelSummary,
      },
    },
    recipeImages: {
      select: {
        id: true,
        order: true,
        imageId: true,
        image: {
          select: {
            id: true,
            location: true,
          },
        },
      },
    },
    recipeLinks: {
      select: {
        id: true,
        linkedRecipe: recipeSummaryLite,
      },
    },
    fromUser: userPublic,
    user: userPublic,
  },
} satisfies Prisma.RecipeFindFirstArgs;

type InternalRecipeSummary = Prisma.RecipeGetPayload<typeof recipeSummary>;

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummary = Omit<InternalRecipeSummary, "lastMadeAt"> & {
  lastMadeAt: string | null;
};
