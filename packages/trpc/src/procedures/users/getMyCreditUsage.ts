import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { getDailyCreditUsage } from "@recipesage/util/server/general";

export const getMyCreditUsage = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

  return getDailyCreditUsage(session.userId);
});
