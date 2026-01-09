import type { JobSummary } from "@recipesage/prisma";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import {
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "../../../index";
import { ocrImagesToRecipe } from "../../../../ml/index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import type { JobQueueItem } from "../../JobQueueItem";

export async function imagesImportJobHandler(
  job: JobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.storageKey) {
      throw new Error("No S3 storage key provided for Images import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
    const zipPath = downloaded.filePath;

    await using extractDir = await mkdtempDisposable("/tmp/");
    const extractPath = extractDir.path;
    await extract(zipPath, { dir: extractPath });

    const fileNames = await readdir(extractPath);

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
    for (const fileName of fileNames) {
      const filePath = path.join(extractPath, fileName);

      if (
        !filePath.endsWith(".jpg") &&
        !filePath.endsWith(".jpeg") &&
        !filePath.endsWith(".png")
      ) {
        continue;
      }

      const recipeImageBuffer = await readFile(filePath);
      const images = [];
      images.push(filePath);

      const recipe = await ocrImagesToRecipe([recipeImageBuffer]);
      if (!recipe) {
        continue;
      }

      standardizedRecipeImportInput.push({
        ...recipe,
        images,
        labels: importLabels,
      });
    }

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: extractPath,
    });
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
