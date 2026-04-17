import { pdfToRecipe } from "@recipesage/util/server/ml";
import {
  isRecipeRecognitionSuccess,
  recordCreditsSpent,
} from "@recipesage/util/server/general";
import { publicProcedure } from "../../trpc";
import { assertCreditsAvailableTrpc } from "../../util/assertCreditsAvailableTrpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * @deprecated Please use express routes which support file streaming rather than base64
 */
export const getRecipeFromPDF = publicProcedure
  .input(
    z.object({
      pdf: z.string(),
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

    await assertCreditsAvailableTrpc(session.userId, "mlPdf");

    const pdf = Buffer.from(input.pdf, "base64");

    const recognizedRecipe = await pdfToRecipe(pdf);
    if (!recognizedRecipe) {
      throw new TRPCError({
        message: "Could not parse recipe from OCR results",
        code: "BAD_REQUEST",
      });
    }

    if (isRecipeRecognitionSuccess(recognizedRecipe.recipe)) {
      await recordCreditsSpent(session.userId, "mlPdf");
    }

    return recognizedRecipe;
  });
