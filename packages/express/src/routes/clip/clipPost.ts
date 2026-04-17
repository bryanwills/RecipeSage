import { z } from "zod";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { BadRequestError } from "../../errors";
import {
  ClipFetchError,
  clipHtml,
  clipUrl,
  ClipTimeoutError,
} from "@recipesage/util/server/general";

const schema = {
  body: z.object({
    url: z.string().optional(),
    html: z.string().optional(),
  }),
};

export const clipPostHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req) => {
    const url = (req.body.url || "").trim();
    const html = (req.body.html || "").trim();

    if (url) {
      try {
        const results = await clipUrl(url);
        return {
          statusCode: 200,
          data: results,
        };
      } catch (e) {
        if (e instanceof ClipTimeoutError || e instanceof ClipFetchError) {
          throw new BadRequestError("Failed to reach target site");
        }
        throw e;
      }
    }

    if (html) {
      const results = await clipHtml(html);

      return {
        statusCode: 200,
        data: {
          ...results.recipe,
          imageURL: results.images[0] || "",
        },
      };
    }

    throw new BadRequestError("Must provide 'html' or 'url' in body");
  },
);
