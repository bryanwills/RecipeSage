import type { SandboxedJob } from "bullmq";
import type { JobQueueItem } from "./JobQueueItem";
import * as Sentry from "@sentry/node";
import {
  jobSummary,
  prisma,
  prismaJobSummaryToJobSummary,
  type JobMeta,
} from "@recipesage/prisma";
import { JobStatus, JobType } from "@recipesage/prisma";
import { processImportJob } from "./import/processImportJob";
import { processExportJob } from "./export/processExportJob";
import {
  jobErrorsToReport,
  jobErrorToResultCode,
} from "../jobs/getJobResultCode";
import { onJobUpdate } from "../jobs/updateJobProgress";

export const processWorkerJob = async (
  args: SandboxedJob<JobQueueItem, unknown>,
) => {
  const verify = await prisma.job.findUniqueOrThrow({
    where: {
      id: args.data.jobId,
    },
    ...jobSummary,
  });
  if (
    verify.status !== JobStatus.CREATE &&
    !process.env.JOB_QUEUE_ALLOW_REPROCESS
  ) {
    throw new Error(
      "Attempted to start processing on job that is not in CREATE state",
    );
  }

  console.log(
    `Starting processing job ${args.id} with ${verify.type}.${
      (verify.meta as JobMeta)?.importType ||
      (verify.meta as JobMeta)?.exportType
    }`,
  );

  const _job = await prisma.job.update({
    where: {
      id: args.data.jobId,
      status: JobStatus.CREATE,
    },
    data: {
      status: JobStatus.RUN,
    },
    ...jobSummary,
  });
  const job = prismaJobSummaryToJobSummary(_job);
  await onJobUpdate({
    jobId: job.id,
    userId: job.userId,
  });

  try {
    switch (job.type) {
      case JobType.IMPORT: {
        await processImportJob(job, args.data);
        break;
      }
      case JobType.EXPORT: {
        await processExportJob(job, args.data);
        break;
      }
      default: {
        throw new Error(`Unsupported job type: ${job.type}`);
      }
    }
  } catch (e) {
    const resultCode = jobErrorToResultCode(e);
    if (jobErrorsToReport.includes(resultCode)) {
      Sentry.captureException(e, {
        extra: {
          jobId: job.id,
        },
      });
      console.error(e);
    }

    await prisma.job.update({
      where: {
        id: job.id,
      },
      data: {
        status: JobStatus.FAIL,
        resultCode,
      },
    });
  }

  await onJobUpdate({
    jobId: job.id,
    userId: job.userId,
  });

  console.log(`Finished processing job ${args.id}`);
};
