import { JobStatus } from "@recipesage/prisma";
import { prisma, type JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { metrics } from "../metrics";
import * as Sentry from "@sentry/node";

export async function exportJobFailCommon(args: {
  timer: ReturnType<typeof metrics.jobFinished.startTimer>;
  job: JobSummary;
  error: unknown;
}) {
  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      status: JobStatus.FAIL,
      resultCode: JOB_RESULT_CODES.unknown,
    },
  });

  Sentry.captureException(args.error, {
    extra: {
      jobId: args.job.id,
    },
  });
  console.error(args.error);

  metrics.jobFailed.observe(
    {
      job_type: "export",
      expected: "false",
    },
    args.timer(),
  );
}
