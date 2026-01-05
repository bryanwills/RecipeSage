import { ImageAnnotatorClient } from "@google-cloud/vision";
import { join } from "path";
import { metrics } from "../general";

export const ocrImageBuffer = async (
  imageBuffer: Buffer,
): Promise<string[]> => {
  metrics.convertImageToText.inc();

  const credentialsPath =
    process.env.FIREBASE_CREDENTIALS_PATH ||
    join(process.cwd(), ".credentials/firebase.json");
  const imageAnnotationClient = new ImageAnnotatorClient({
    keyFile: credentialsPath,
  });

  const ocrResults =
    await imageAnnotationClient.documentTextDetection(imageBuffer);

  const text = ocrResults
    .map((el) => {
      return el.fullTextAnnotation?.text;
    })
    .filter((el): el is string => !!el);

  return text;
};
