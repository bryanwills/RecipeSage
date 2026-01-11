import { BadRequestError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import multer from "multer";
import { multerAutoCleanup } from "@recipesage/util/server/general";
import { tmpdir } from "os";
import { pdfToRecipe } from "@recipesage/util/server/ml";

const FILE_SIZE_LIMIT_MB = 50;

const schema = {};

export const getRecipeFromPDFHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multerAutoCleanup,
      multer({
        storage: multer.diskStorage({
          destination: tmpdir(),
        }),
        limits: {
          fileSize: FILE_SIZE_LIMIT_MB * 1024 * 1024,
        },
      }).single("file"),
    ],
  },
  async (req) => {
    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const recognizedRecipe = await pdfToRecipe(file.path);
    if (!recognizedRecipe) {
      throw new BadRequestError("Could not parse recipe from OCR results");
    }

    return {
      data: recognizedRecipe,
      statusCode: 200,
    };
  },
);
