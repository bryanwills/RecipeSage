import { JobStatus } from "@recipesage/prisma";
import { prisma, type JobMeta, type JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { metrics } from "../metrics";

export async function exportJobFinishCommon(args: {
  timer: ReturnType<typeof metrics.jobFinished.startTimer>;
  job: JobSummary;
  storageRecord: {
    bucket: string;
    key: string;
    location: string;
  };
}) {
  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      status: JobStatus.SUCCESS,
      resultCode: JOB_RESULT_CODES.success,
      progress: 100,
      meta: {
        ...(args.job.meta as JobMeta),
        exportStorageBucket: args.storageRecord.bucket,
        exportStorageKey: args.storageRecord.key,
        exportDownloadUrl: args.storageRecord.location,
      } satisfies JobMeta,
    },
  });

  metrics.jobFinished.observe(
    {
      job_type: "export",
    },
    args.timer(),
  );
}
