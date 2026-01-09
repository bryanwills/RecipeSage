import { Worker, Queue } from "bullmq";
import { JobStatus, JobType } from "@prisma/client";
import * as Sentry from "@sentry/node";
import {
  jobSummary,
  prisma,
  prismaJobSummaryToJobSummary,
} from "@recipesage/prisma";
import type { JobQueueItem } from "./JobQueueItem";
import { processImportJob } from "./import/processImportJob";

const JOB_QUEUE_NAME = "rsJobQueue";
const JOB_QUEUE_PREFIX = process.env.JOB_QUEUE_PREFIX || "rsJobQueue";

let jobQueue: Queue<JobQueueItem, void> | undefined;
export const getJobQueue = () => {
  if (jobQueue) return jobQueue;

  jobQueue = new Queue<JobQueueItem, void>(JOB_QUEUE_NAME, {
    connection: {
      host: process.env.JOB_QUEUE_REDIS_HOST,
      port: parseInt(process.env.JOB_QUEUE_REDIS_PORT || "6379"),
      enableOfflineQueue: false,
    },
    prefix: JOB_QUEUE_PREFIX,
  });

  jobQueue.on("error", (err) => {
    Sentry.captureException(err);
    console.error(err);
  });

  jobQueue.on("waiting", (job) => {
    console.log(`Job ${job.id} is waiting to be processed`);
  });

  return jobQueue;
};

export const enqueueJob = (item: JobQueueItem) => {
  return getJobQueue().add(`${Date.now()}-${Math.random()}`, item);
};

let jobQueueWorker: Worker<JobQueueItem, void> | undefined;
export const getJobQueueWorker = () => {
  if (jobQueueWorker) return jobQueueWorker;

  jobQueueWorker = new Worker<JobQueueItem, void>(
    JOB_QUEUE_NAME,
    async (args) => {
      console.log(`Starting processing job ${args.id}`);

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
    },
    {
      autorun: false,
      connection: {
        host: process.env.JOB_QUEUE_REDIS_HOST,
        port: parseInt(process.env.JOB_QUEUE_REDIS_PORT || "6379"),
      },
      prefix: JOB_QUEUE_PREFIX,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
      concurrency: parseInt(process.env.JOB_QUEUE_CONCURRENCY || "1"),
    },
  );

  jobQueueWorker.on("error", (err) => {
    Sentry.captureException(err);
    console.error(err);
  });

  jobQueueWorker.on("drained", () => {
    console.log(`Job queue has drained`);
  });

  jobQueueWorker.on("completed", (job) => {
    console.log(`Job ${job.id} has triggered the completed event`);
  });

  jobQueueWorker.on("failed", (job) => {
    console.log(`Job ${job?.id} has triggered the failed event`);
  });

  return jobQueueWorker;
};
