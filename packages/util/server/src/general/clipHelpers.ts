import jsdom from "jsdom";
import { sanitizeRemoveHtmlFromString } from "./sanitizeRemoveHtmlFromString";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No typings available
import RecipeClipper from "@julianpoy/recipe-clipper";

const replaceBrWithBreak = (html: string) => {
  return html.replaceAll(new RegExp(/<br( \/)?>/, "g"), "\n");
};

export async function htmlToRecipeViaRecipeClipper(document: string) {
  if (process.env.RECIPECLIPPER_MINISERVER_URL) {
    const url = new URL(process.env.RECIPECLIPPER_MINISERVER_URL);
    url.pathname = "/api/recipe/extract";
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        html: document.substring(0, 500000),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseJson = await response.json();
    return responseJson.data;
  }

  const dom = new jsdom.JSDOM(document);

  const { window } = dom;

  Object.defineProperty(window.Element.prototype, "innerText", {
    get() {
      const html = replaceBrWithBreak(this.innerHTML);
      return sanitizeRemoveHtmlFromString(html);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.fetch as any) = fetch;

  return await RecipeClipper.clipRecipe({
    window,
    mlClassifyEndpoint: process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL,
    ignoreMLClassifyErrors: true,
  });
}

export async function htmlToBodyInnerText(document: string) {
  if (process.env.RECIPECLIPPER_MINISERVER_URL) {
    const url = new URL(process.env.RECIPECLIPPER_MINISERVER_URL);
    url.pathname = "/api/text/extract";
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        html: document.substring(0, 500000),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseJson = await response.json();
    const rawText = responseJson.data.text;

    return rawText
      .split("\n")
      .filter((el: string) => el.trim())
      .join("\n");
  }

  const dom = new jsdom.JSDOM(document);

  const { window } = dom;

  Object.defineProperty(window.Element.prototype, "innerText", {
    get() {
      const html = replaceBrWithBreak(this.innerHTML);
      return sanitizeRemoveHtmlFromString(html);
    },
  });

  return window.document.body.innerText;
}
