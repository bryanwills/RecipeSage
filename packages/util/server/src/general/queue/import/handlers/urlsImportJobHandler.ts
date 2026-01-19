import type { JobSummary } from "@recipesage/prisma";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { clipUrl, importJobFinishCommon } from "../../../index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile } from "fs/promises";
import type { JobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

export async function urlsImportJobHandler(
  job: JobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for URLs import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);

  const urlsText = await readFile(downloaded.filePath, "utf-8");
  const urls = urlsText.split("\n").filter((url) => url.trim().length > 0);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = urls.length;
  let processedCount = 0;
  for (const url of urls) {
    try {
      const clipResults = await clipUrl(url);
      standardizedRecipeImportInput.push({
        ...clipResults,
        labels: importLabels,
      });
    } catch (_e) {
      // Skip entry
    }

    processedCount++;
    onProgress({
      processedCount,
      totalCount,
      step: 1,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    });
  }

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: undefined,
  });
}
