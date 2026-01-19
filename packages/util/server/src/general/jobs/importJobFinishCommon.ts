import { JobStatus } from "@recipesage/prisma";
import { prisma, type JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import {
  importStandardizedRecipes,
  type StandardizedRecipeImportEntry,
} from "../../db/importStandardizedRecipes";
import { indexRecipes } from "../../search";
import { ImportNoRecipesError } from "./jobErrors";
import { convertJobProgress, updateJobProgress } from "./updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../queue/import/processImportJob";

export async function importJobFinishCommon(args: {
  job: JobSummary;
  userId: string;
  standardizedRecipeImportInput: StandardizedRecipeImportEntry[];
  importTempDirectory: string | undefined;
}) {
  if (args.standardizedRecipeImportInput.length === 0) {
    throw new ImportNoRecipesError();
  }

  await updateJobProgress({
    jobId: args.job.id,
    userId: args.job.userId,
    progress: convertJobProgress({
      progress: 0,
      step: 2,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    }),
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

  await updateJobProgress({
    jobId: args.job.id,
    userId: args.job.userId,
    progress: convertJobProgress({
      progress: 0,
      step: 3,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    }),
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
}
