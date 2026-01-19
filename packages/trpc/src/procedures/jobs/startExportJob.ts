import { JobStatus, JobType, prisma, type JobMeta } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import {
  enqueueJob,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { z } from "zod";

export const startExportJob = publicProcedure
  .input(
    z.object({
      format: z.union([
        z.literal("txt"),
        z.literal("pdf"),
        z.literal("jsonld"),
      ]),
      recipeIds: z.array(z.uuid()).min(1).max(5000).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const job = await prisma.job.create({
      data: {
        userId: session.userId,
        type: JobType.EXPORT,
        status: JobStatus.CREATE,
        progress: 1,
        meta: {
          exportType: input.format,
          exportScope: input.recipeIds ? "recipeids" : "all",
          recipeIds: input.recipeIds,
        } satisfies JobMeta,
      },
    });

    await enqueueJob({
      jobId: job.id,
    });

    return {
      jobId: job.id,
    };
  });
