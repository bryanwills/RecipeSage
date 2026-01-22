import _pdfmake from "pdfmake";
import {
  parseIngredients,
  parseInstructions,
  parseNotes,
} from "@recipesage/util/shared";
import sanitizeHtml from "sanitize-html";
import { fetchURL } from "../general/fetch";
import { Content, Margins, TDocumentDefinitions } from "pdfmake/interfaces";
import path from "path";
import { RecipeSummary } from "@recipesage/prisma";
import { readFile } from "fs/promises";
import process from "node:process";
import { setTimeout } from "node:timers/promises";

const FONT_PATH = process.env.FONTS_PATH;
if (!FONT_PATH) throw new Error("FONTS_PATH must be provided");

// DefinitelyTyped hasn't been updated for pdfmake 0.3.x yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfmake = _pdfmake as any;

pdfmake.addFonts({
  NotoSans: {
    normal: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-Regular.ttf"),
    bold: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-Bold.ttf"),
    italics: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-Italic.ttf"),
    bolditalics: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-BoldItalic.ttf"),
  },
});

export interface ExportOptions {
  includePrimaryImage?: boolean;
  includeImageUrls?: boolean;
}

const parsedToSchema = (
  parsedItems: { content: string; isHeader: boolean }[],
  includeMargin: boolean,
): {
  text: string;
  bold: boolean;
  margin: Margins | undefined;
}[] => {
  return parsedItems.map((item) => ({
    text: item.content,
    bold: item.isHeader,
    margin: includeMargin ? [0, 0, 0, 5] : undefined,
  }));
};

const recipeToSchema = async (
  recipe: RecipeSummary,
  options?: ExportOptions,
): Promise<Content> => {
  const schema: Content[] = [];

  const headerContent: Content[] = [];

  headerContent.push({
    text: recipe.title || "",
    fontSize: 16,
  });

  const showTagLine =
    recipe.source || recipe.activeTime || recipe.totalTime || recipe.yield;
  if (showTagLine) {
    const tagline: [string, string][] = [];

    if (recipe.source) tagline.push(["Source:", recipe.source]);
    if (recipe.activeTime) tagline.push(["Active time:", recipe.activeTime]);
    if (recipe.totalTime) tagline.push(["Total time:", recipe.totalTime]);
    if (recipe.yield) tagline.push(["Yield:", recipe.yield]);

    const taglineSchema = tagline.reduce((acc, item) => {
      return [
        ...acc,
        {
          text: item[0] + " ",
          bold: true,
        },
        {
          text: item[1] + "  ",
        },
      ];
    }, [] as Content[]);

    headerContent.push({
      text: taglineSchema,
      margin: [0, 10, 0, 10], // left top right bottom
    });
  }

  if (recipe.description) {
    headerContent.push({
      text: recipe.description,
      margin: [0, showTagLine ? 0 : 10, 0, 10], // left top right bottom
    });
  }

  const primaryImageUrl = recipe.recipeImages[0]?.image.location;
  if (primaryImageUrl && options?.includePrimaryImage) {
    try {
      let buffer: Buffer;
      if (
        process.env.NODE_ENV === "selfhost" &&
        primaryImageUrl.startsWith("/")
      ) {
        buffer = await readFile(primaryImageUrl);
      } else {
        const response = await fetchURL(primaryImageUrl, {
          timeout: 15 * 1000,
        });
        buffer = await response.buffer();
      }

      schema.push({
        columns: [
          {
            width: 100,
            image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
            fit: [100, 100],
          },
          {
            width: "auto",
            stack: headerContent,
            margin: [10, 10, 0, 0],
          },
        ],
        margin: [0, 0, 0, 10],
      });
    } catch (_e) {
      schema.push(...headerContent);
    }
  } else {
    schema.push(...headerContent);
  }

  const parsedInstructions = parseInstructions(
    sanitizeHtml(recipe.instructions || ""),
    1,
  );
  const parsedIngredients = parseIngredients(
    sanitizeHtml(recipe.ingredients || ""),
    1,
  );
  const parsedNotes = parseNotes(sanitizeHtml(recipe.notes || ""));
  if (recipe.ingredients && recipe.instructions) {
    schema.push({
      columns: [
        {
          width: 180,
          stack: parsedToSchema(parsedIngredients, true),
        },
        {
          width: "auto",
          stack: parsedToSchema(parsedInstructions, true),
        },
      ],
    });
  } else if (recipe.ingredients) {
    schema.push({
      text: parsedToSchema(parsedIngredients, true),
    });
  } else if (recipe.instructions) {
    schema.push({
      text: parsedToSchema(parsedInstructions, true),
    });
  }

  if (recipe.notes) {
    const header = {
      text: "Notes:",
      margin: [0, 10, 0, 5] satisfies Margins, // left top right bottom
      bold: true,
    };
    schema.push(header);
    schema.push(...parsedToSchema(parsedNotes, false));
  }
  if (recipe.url) {
    schema.push({
      text: [
        {
          text: "Source URL: ",
          bold: true,
        },
        {
          text: recipe.url,
          link: recipe.url,
        },
      ],
      margin: [0, 10, 0, 0],
    });
  }
  const otherImageUrls = recipe.recipeImages.map((el) => el.image.location);
  // Primary image is already included
  if (options?.includePrimaryImage) otherImageUrls.splice(0, 1);
  if (options?.includeImageUrls) {
    for (const imageUrl of otherImageUrls) {
      schema.push({
        text: [
          {
            text: "Image URL: ",
            bold: true,
          },
          {
            text: imageUrl,
            link: imageUrl,
          },
        ],
        margin: [0, 10, 0, 0],
      });
    }
  }

  return schema;
};

export async function* recipeAsyncIteratorToPDF(
  recipes: AsyncIterable<RecipeSummary>,
  options?: ExportOptions,
) {
  for await (const recipe of recipes) {
    const content: Content[] = [await recipeToSchema(recipe, options)];

    const docDefinition: TDocumentDefinitions = {
      content,
      defaultStyle: {
        font: "NotoSans",
        fontSize: 10,
        lineHeight: 1.2,
      },
    };

    const doc = pdfmake.createPdf(docDefinition);
    const stream = await doc.getStream();
    stream.end();

    yield {
      stream,
      recipe,
    };

    await setTimeout(50);
  }
}
