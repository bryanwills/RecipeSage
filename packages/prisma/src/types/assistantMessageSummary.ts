import type { Prisma } from "../prisma/generated/client";
import { recipeSummaryLite, type RecipeSummaryLite } from "./recipeSummaryLite";

/**
 * Provides assistant chat history with recipe summary included
 **/
export const assistantMessageSummary = {
  select: {
    id: true,
    userId: true,
    role: true,
    content: true,
    name: true,
    recipeId: true,
    createdAt: true,
    updatedAt: true,
    recipe: recipeSummaryLite,
  },
} satisfies Prisma.AssistantMessageFindFirstArgs;

type InternalAssistantMessageSummary = Prisma.AssistantMessageGetPayload<
  typeof assistantMessageSummary
>;

/**
 * Provides assistant chat history with recipe summary included
 **/
export type AssistantMessageSummary = Omit<
  InternalAssistantMessageSummary,
  "recipe"
> & {
  recipe: RecipeSummaryLite | null;
};
