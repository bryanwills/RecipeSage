import { textToNutrition } from "@recipesage/util/server/ml";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const getNutritionFromText = publicProcedure
  .input(
    z.object({
      text: z.string().min(1).max(10000),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    if (!session) {
      throw new TRPCError({
        message: "Must be logged in",
        code: "UNAUTHORIZED",
      });
    }

    const nutrition = await textToNutrition(input.text);
    if (!nutrition) {
      throw new TRPCError({
        message: "Could not extract nutrition from text",
        code: "BAD_REQUEST",
      });
    }

    return nutrition;
  });
