import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { Assistant } from "@recipesage/util/server/ml";
import { recordCreditsSpent } from "@recipesage/util/server/general";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { assertCreditsAvailableTrpc } from "../../util/assertCreditsAvailableTrpc";
import { TRPCError } from "@trpc/server";

const assistant = new Assistant();

export const sendAssistantMessage = publicProcedure
  .input(
    z.object({
      content: z.string().max(1500),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    if (!session) {
      throw new TRPCError({
        message: "Must be logged in",
        code: "UNAUTHORIZED",
      });
    }

    const hasMoreMessages = await userHasCapability(
      session.userId,
      Capabilities.AssistantMoreMessages,
    );

    if (hasMoreMessages) {
      const { isOverLimit, useLowQualityModel } =
        await assistant.checkMessageLimit(session.userId);
      if (isOverLimit) {
        throw new TRPCError({
          message: "Over daily message limit",
          code: "TOO_MANY_REQUESTS",
        });
      }

      await assistant.sendChat(
        input.content,
        session.userId,
        useLowQualityModel,
      );
    } else {
      await assertCreditsAvailableTrpc(session.userId, "assistantMessage");

      await assistant.sendChat(input.content, session.userId, false);

      await recordCreditsSpent(session.userId, "assistantMessage");
    }

    return "ok";
  });
