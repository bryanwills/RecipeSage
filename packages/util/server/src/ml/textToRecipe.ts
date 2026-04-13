import { ocrFormatRecipeSchema } from "../ml/chatFunctionsVercel";
import { StandardizedRecipeImportEntry } from "../db";
import { metrics } from "../general";
import { generateText, Output } from "ai";
import { AI_MODEL_LOW, aiProvider } from "./vercel";

export enum TextToRecipeInputType {
  OCR,
  Document,
  Text,
  Webpage,
}

const prompts = {
  [TextToRecipeInputType.OCR]:
    "I have scanned a recipe via OCR and this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Here's the OCR text:\n\n",
  [TextToRecipeInputType.Document]:
    "I have scanned a recipe from a document this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Please include all recipe detail and do not summarize. Here's the document text:\n\n",
  [TextToRecipeInputType.Text]:
    "I have copied some recipe text from the internet. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present in the text. Here's the copied text:\n\n",
  [TextToRecipeInputType.Webpage]:
    "Here's some text from a webpage that contains a recipe. Please grab only the recipe and save it in JSON format in it's original language. Do not add steps, ingredients, or any other content that doesn't exist in the original text. Here's the copied text:\n\n",
} satisfies Record<TextToRecipeInputType, string>;

/**
 * If passed very little text, we're not going to get
 * a meaningful result from ChatGPT. If returned text length is less
 * than this number, processing will abort early.
 */
export const OCR_MIN_VALID_TEXT = 20;

export const OCR_MAX_VALID_TEXT = 20000;

export const textToRecipe = async (
  text: string,
  inputType: TextToRecipeInputType,
) => {
  metrics.convertTextToRecipe.inc();

  if (text.length < OCR_MIN_VALID_TEXT) return;
  if (text.length > OCR_MAX_VALID_TEXT)
    text = text.substring(0, OCR_MAX_VALID_TEXT);

  const llmResponse = await generateText({
    system:
      "You are a data processor utility. Do not summarize or add information, just format and process into the correct shape. Do not insert your own editorial voice, just clean the text and get it into the correct shape. Leave fields that are not present blank. A header can be denoted in the ingredients, instructions, or notes by prefixing the line with a # sign.",
    model: aiProvider(AI_MODEL_LOW),
    temperature: 0,
    prompt: prompts[inputType] + text,
    output: Output.object({
      schema: ocrFormatRecipeSchema,
    }),
  });

  if (llmResponse.totalUsage.totalTokens !== undefined) {
    metrics.llmTokensConsumed.observe(
      {
        category: "textToRecipe_" + inputType,
      },
      llmResponse.totalUsage.totalTokens,
    );
  }

  const markdownHeadersToRS = (line: string) => {
    if (line.startsWith("#")) {
      return `[${line.replace(/^#\s*/, "")}]`;
    }
    return line;
  };

  const entry: StandardizedRecipeImportEntry = {
    recipe: {
      title: llmResponse.output.title || "Unnamed",
      description: llmResponse.output.description || "",
      folder: "main",
      source: "",
      url: "",
      rating: undefined,
      yield: (llmResponse.output.yield || "").replaceAll("<UNKNOWN>", ""),
      activeTime: (llmResponse.output.activeTime || "").replaceAll(
        "<UNKNOWN>",
        "",
      ),
      totalTime: (llmResponse.output.totalTime || "").replaceAll(
        "<UNKNOWN>",
        "",
      ),
      ingredients: (llmResponse.output.ingredients || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      instructions: (llmResponse.output.instructions || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      notes: (llmResponse.output.notes || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      nutritionInfo: llmResponse.output.nutritionInfo || undefined,
    },
    labels: [],
    images: [],
  };

  return entry;
};
