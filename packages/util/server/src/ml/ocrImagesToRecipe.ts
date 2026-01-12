import type { Readable } from "stream";
import {
  metrics,
  transformImageBuffer,
  transformImageStreamToBuffer,
} from "../general";
import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";
import { VisionToRecipeInputType, visionToRecipe } from "./visionToRecipe";

export const ocrImagesToRecipe = async (images: (Buffer | Readable)[]) => {
  metrics.convertImagesToRecipe.inc();

  const transformedImagesAsBuffers: Buffer[] = [];
  for (const image of images) {
    if (Buffer.isBuffer(image)) {
      transformedImagesAsBuffers.push(
        await transformImageBuffer(image, 4000, 4000, 85, "inside"),
      );
    } else {
      transformedImagesAsBuffers.push(
        await transformImageStreamToBuffer(image, 4000, 4000, 85, "inside"),
      );
    }
  }

  if (!IS_FIREBASE_AVAILABLE || process.env.DISABLE_GCV === "true") {
    if (process.env.DISABLE_GCV !== "true") {
      // Selfhosted environments do not have firebase available.
      // We fallback to using ChatGPT vision which is less capable at OCR than Google Cloud Vision.
      console.warn("Firebase not available, using GPT Vision");
    }

    const recognizedRecipe = await visionToRecipe(
      transformedImagesAsBuffers,
      VisionToRecipeInputType.Photo,
    );
    metrics.convertImagesToRecipe.inc();

    return recognizedRecipe;
  }

  const ocrResults: string[] = [];
  for (const imageBuffer of transformedImagesAsBuffers) {
    ocrResults.push(...(await ocrImageBuffer(imageBuffer)));
  }
  const recipeText = ocrResults.join("\n");

  const recognizedRecipe = await textToRecipe(
    recipeText,
    TextToRecipeInputType.OCR,
  );

  return recognizedRecipe;
};
