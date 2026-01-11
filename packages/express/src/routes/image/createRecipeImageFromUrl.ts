import { UnsupportedMediaTypeError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import * as Sentry from "@sentry/node";
import { FileTransformError } from "@recipesage/util/server/general";
import { ObjectTypes, writeImageURL } from "@recipesage/util/server/storage";
import { z } from "zod";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { imageSummary, prisma, type ImageSummary } from "@recipesage/prisma";
import type { InputJsonValue } from "@prisma/client/runtime/client";

const schema = {
  body: z.object({
    url: z.string().min(1).max(2048),
  }),
};

export const createRecipeImageFromUrlHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const encodeInHighRes = await userHasCapability(
      res.locals.session.userId,
      Capabilities.HighResImages,
    );

    let storedFile;
    try {
      storedFile = await writeImageURL(
        ObjectTypes.RECIPE_IMAGE,
        req.body.url,
        encodeInHighRes,
      );
    } catch (e) {
      if (!(e instanceof FileTransformError)) {
        Sentry.captureException(e);
      }
      throw new UnsupportedMediaTypeError();
    }

    const image = await prisma.image.create({
      data: {
        userId: res.locals.session.userId,
        location: storedFile.location,
        key: storedFile.key,
        json: storedFile as unknown as InputJsonValue,
      },
      ...imageSummary,
    });

    return {
      statusCode: 201,
      data: image satisfies ImageSummary,
    };
  },
);
