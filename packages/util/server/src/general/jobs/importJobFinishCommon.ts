import { JobStatus } from "@recipesage/prisma";
import { prisma, type JobMeta, type JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { metrics } from "../metrics";
import {
  importStandardizedRecipes,
  type StandardizedRecipeImportEntry,
} from "../../db/importStandardizedRecipes";
import { indexRecipes } from "../../search";
import { ImportNoRecipesError } from "./importJobFailCommon";

export async function importJobFinishCommon(args: {
  timer: ReturnType<typeof metrics.jobFinished.startTimer>;
  job: JobSummary;
  userId: string;
  standardizedRecipeImportInput: StandardizedRecipeImportEntry[];
  importTempDirectory: string | undefined;
}) {
  if (args.standardizedRecipeImportInput.length === 0) {
    throw new ImportNoRecipesError();
  }

  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      progress: 50,
    },
  });

  const createdRecipeIds = await importStandardizedRecipes(
    args.userId,
    args.standardizedRecipeImportInput,
    args.importTempDirectory,
  );
  const createdRecipeIdsSet = new Set(createdRecipeIds);

  const allRecipes = await prisma.recipe.findMany({
    where: {
      userId: args.userId,
    },
  });
  const recipesToIndex = allRecipes.filter((el) =>
    createdRecipeIdsSet.has(el.id),
  );

  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      progress: 75,
    },
  });

  await indexRecipes(recipesToIndex);

  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      status: JobStatus.SUCCESS,
      resultCode: JOB_RESULT_CODES.success,
      progress: 100,
    },
  });

  metrics.jobFinished.observe(
    {
      job_type: "import",
      import_type: (args.job.meta as JobMeta).importType,
    },
    args.timer(),
  );
}
