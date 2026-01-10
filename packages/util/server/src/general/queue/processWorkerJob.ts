import type { Job } from "bullmq";
import type { JobQueueItem } from "./JobQueueItem";
import {
  jobSummary,
  prisma,
  prismaJobSummaryToJobSummary,
  type JobMeta,
} from "@recipesage/prisma";
import { JobStatus, JobType } from "@recipesage/prisma";
import { processImportJob } from "./import/processImportJob";

export const processWorkerJob = async (
  args: Job<JobQueueItem, void, string>,
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
    `Starting processing job ${args.id} with ${verify.type}.${(verify.meta as JobMeta)?.importType}`,
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

  switch (job.type) {
    case JobType.IMPORT: {
      await processImportJob(job, args.data);
      break;
    }
    default: {
      throw new Error(`Unsupported job type: ${job.type}`);
    }
  }

  console.log(`Finished processing job ${args.id}`);
};
