import type { JobSummary, Prisma, RecipeSummary } from "@recipesage/prisma";
import type { JobQueueItem } from "../JobQueueItem";
import * as Sentry from "@sentry/node";
import { JobStatus, JobType, prisma, prismaCursorStream, recipeSummary } from "@recipesage/prisma";
import { txtExportJobHandler } from "./handlers/txtExportJobHandler";
import { pdfExportJobHandler } from "./handlers/pdfExportJobHandler";
import { jsonldExportJobHandler } from "./handlers/jsonldExportJobHandler";
import { metrics } from "../../metrics";
import { exportJobFinishCommon } from "../../jobs/exportJobFinishCommon";
import { throttleDropPromise } from "../../throttleDropPromise";
import { exportJobFailCommon } from "../../jobs/exportJobFailCommon";

/**
 * How often to write the job percentage completion to the database
 */
const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;

export const processExportJob = async (
  job: JobSummary,
  _jobQueueItem: JobQueueItem,
) => {
  const timer = metrics.jobFinished.startTimer();

  try {
    const jobMeta = job.meta;

    if (!jobMeta || job.type !== JobType.EXPORT) {
      throw new Error(
        "Export processor received a non-export job or job without meta",
      );
    }

    const whereClause: Prisma.RecipeWhereInput = {
      userId: job.userId,
      id: jobMeta.recipeIds
        ? {
            in: jobMeta.recipeIds,
          }
        : undefined,
    };

    const totalCount = await prisma.recipe.count({
      where: whereClause,
    });

    const recipes = prismaCursorStream.recipe.cursorStream(
      {
        where: whereClause,
        ...recipeSummary,
        orderBy: {
          title: "asc",
        },
      },
      {
        batchSize: 50,
        prefill: 200,
      },
    ) as unknown as AsyncIterable<RecipeSummary>;

    const onProgress = throttleDropPromise(
      async (processedCount: number) => {
        try {
          await prisma.job.updateMany({
            where: {
              id: job.id,
              status: JobStatus.RUN,
            },
            data: {
              progress: Math.min(100, Math.max(Math.floor((processedCount / totalCount) * 100), 1)),
            },
          });
        } catch (e) {
          Sentry.captureException(e);
          console.error(e);
        }
      },
      JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000,
    );

    const storageRecord = await (async () => {
      switch (jobMeta.exportType) {
        case "txt":
          return txtExportJobHandler(job, recipes, onProgress);
        case "pdf":
          return pdfExportJobHandler(job, recipes, onProgress);
        case "jsonld":
          return jsonldExportJobHandler(job, recipes, onProgress);
        default:
          throw new Error(`Unsupported export type: ${jobMeta.exportType}`);
      }
    })();

    await exportJobFinishCommon({
      timer,
      job,
      storageRecord: {
        bucket: storageRecord.bucket,
        key: storageRecord.key,
        location: storageRecord.location,
      },
    });
  } catch(e) {
    await exportJobFailCommon({
      timer,
      job,
      error: e,
    });
  }
};
