import type { JobSummary } from "@recipesage/prisma";
import { RecipeSummary } from "@recipesage/prisma";
import { PassThrough, Readable } from "stream";
import {
  ObjectTypes,
  writeStream,
  type StorageObjectRecord,
} from "../../../../storage";
import dedent from "ts-dedent";
import { transformRecipeImageUrlForSelfhost } from "../../../transformRecipeImageUrlForSelfhost";
import { pipeline } from "stream/promises";

async function* process(
  recipes: AsyncIterable<RecipeSummary>,
  onProgress: (processedCount: number) => void,
) {
  yield "==== Recipes ====\n\n";

  let processedCount = 0;
  for await (const recipe of recipes) {
    const images: string[] = [];

    for (const recipeImage of recipe.recipeImages) {
      const image = await transformRecipeImageUrlForSelfhost(
        recipeImage.image.location,
      );
      images.push(image);
    }

    const recipeStr = dedent`
      Title: ${recipe.title}
      Description: ${recipe.description}
      Yield: ${recipe.yield}
      ActiveTime: ${recipe.activeTime}
      TotalTime: ${recipe.totalTime}
      Source: ${recipe.source}
      Url: ${recipe.url}
      Folder: ${recipe.folder}
      Ingredients: ${recipe.ingredients}
      Instructions: ${recipe.instructions}
      Notes: ${recipe.notes}
      CreatedAt: ${recipe.createdAt}
      UpdatedAt: ${recipe.updatedAt}
      Rating: ${recipe.rating}
      Labels: ${recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.title).join(", ")}
      Images: ${images.join(" ")}
      \r\n
    `;

    yield recipeStr;

    processedCount++;
    onProgress(processedCount);
  }
}

export async function txtExportJobHandler(
  job: JobSummary,
  recipes: AsyncIterable<RecipeSummary>,
  onProgress: (processedCount: number) => void,
): Promise<StorageObjectRecord> {
  const outputStream = new PassThrough();
  const uploadResult = writeStream(
    ObjectTypes.DATA_EXPORT,
    outputStream,
    "text/plain",
  );

  await pipeline([Readable.from(process(recipes, onProgress)), outputStream]);

  return await uploadResult;
}
