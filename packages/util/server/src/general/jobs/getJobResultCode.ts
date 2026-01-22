import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import {
  ImportBadCredentialsError,
  ImportBadFormatError,
  ImportNoRecipesError,
  ImportTooManyRecipesError,
} from "./jobErrors";
import { ImportStandardizedRecipesTooManyRecipesError } from "../../db/importStandardizedRecipes";

export const jobErrorsToReport: (typeof JOB_RESULT_CODES)[keyof typeof JOB_RESULT_CODES][] =
  [JOB_RESULT_CODES.unknown];

export const jobErrorToResultCode = (error: unknown) => {
  if (!(error instanceof Error)) return JOB_RESULT_CODES.unknown;

  if (
    error instanceof ImportBadFormatError ||
    error.message === "end of central directory record signature not found" ||
    error.name === "Bad format"
  ) {
    return JOB_RESULT_CODES.badFile;
  }

  if (error instanceof ImportNoRecipesError) {
    return JOB_RESULT_CODES.emptyFile;
  }

  if (error instanceof ImportBadCredentialsError) {
    return JOB_RESULT_CODES.badCredentials;
  }

  if (
    error instanceof ImportStandardizedRecipesTooManyRecipesError ||
    error instanceof ImportTooManyRecipesError
  ) {
    return JOB_RESULT_CODES.tooManyRecipes;
  }

  return JOB_RESULT_CODES.unknown;
};
