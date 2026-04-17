import { z } from "zod";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { BadRequestError } from "../../errors";
import {
  ClipFetchError,
  clipUrl,
  ClipTimeoutError,
} from "@recipesage/util/server/general";

const schema = {
  query: z.object({
    url: z.string().optional(),
  }),
};

export const clipGetHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req) => {
    const url = (req.query.url || "").trim();
    if (!url) {
      throw new BadRequestError("Must provide a URL");
    }

    try {
      const results = await clipUrl(url);
      return {
        statusCode: 200,
        data: {
          ...results.recipe,
          imageURL: results.images[0] || "",
        },
      };
    } catch (e) {
      if (e instanceof ClipTimeoutError || e instanceof ClipFetchError) {
        throw new BadRequestError("Failed to reach target site");
      }
      throw e;
    }
  },
);
