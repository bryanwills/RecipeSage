/* eslint-disable @typescript-eslint/no-explicit-any */

import fetch from "node-fetch";
import * as Sentry from "@sentry/node";
import * as he from "he";
import * as url from "url";
import { dedent } from "ts-dedent";

import puppeteer, { Browser } from "puppeteer-core";

import * as jsdom from "jsdom";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No typings available
import * as RecipeClipper from "@julianpoy/recipe-clipper";

const INTERCEPT_PLACEHOLDER_URL = "https://example.com/intercept-me";
import * as sanitizeHtml from "sanitize-html";
import { fetchURL } from "./fetch";
import { StandardizedRecipeImportEntry } from "../db";

interface RecipeClipperResult {
  imageURL: string | undefined;
  title: string | undefined;
  description: string | undefined;
  source: string | undefined;
  yield: string | undefined;
  activeTime: string | undefined;
  totalTime: string | undefined;
  ingredients: string | undefined;
  instructions: string | undefined;
  notes: string | undefined;
}

const disconnectPuppeteer = async (browser: Browser) => {
  try {
    await browser.disconnect();
  } catch (e) {
    Sentry.captureException(e);
  }
};

const clipRecipeUrlWithPuppeteer = async (clipUrl: string) => {
  let browser;
  try {
    let browserWSEndpoint = `ws://${process.env.BROWSERLESS_HOST}:${process.env.BROWSERLESS_PORT}?stealth&blockAds&--disable-web-security`;

    if (process.env.BROWSERLESS_TOKEN) {
      browserWSEndpoint += `&token=${process.env.BROWSERLESS_TOKEN}`;
    }

    if (process.env.CLIP_PROXY_URL) {
      const proxyUrl = url.parse(process.env.CLIP_PROXY_URL);
      console.log(proxyUrl);
      browserWSEndpoint += `&--proxy-server="https=${proxyUrl.host}"`;
    }

    browser = await puppeteer.connect({
      browserWSEndpoint,
    });

    const page = await browser.newPage();

    if (process.env.CLIP_PROXY_USERNAME && process.env.CLIP_PROXY_PASSWORD) {
      await page.authenticate({
        username: process.env.CLIP_PROXY_USERNAME,
        password: process.env.CLIP_PROXY_PASSWORD,
      });
    }

    await page.setBypassCSP(true);

    await page.setRequestInterception(true);
    page.on("request", async (interceptedRequest) => {
      if (interceptedRequest.url() === INTERCEPT_PLACEHOLDER_URL) {
        try {
          const ingredientInstructionClassifierUrl =
            process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL;
          if (!ingredientInstructionClassifierUrl)
            throw new Error(
              "INGREDIENT_INSTRUCTION_CLASSIFIER_URL not set in env",
            );

          const response = await fetch(ingredientInstructionClassifierUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: interceptedRequest.postData(),
          });

          const text = await response.text();

          interceptedRequest.respond({
            contentType: "application/json",
            body: text,
          });
        } catch (e) {
          console.log("Error while classifying", e);
          interceptedRequest.abort();
        }
      } else {
        interceptedRequest.continue();
      }
    });

    try {
      await page.goto(clipUrl, {
        waitUntil: "networkidle2",
        timeout: 20000,
      });
    } catch (err) {
      try {
        (err as any).status = 400;
      } catch (e) {
        // Do nothing
      }

      Sentry.captureException(err, {
        extra: {
          clipUrl,
        },
      });

      throw err;
    }

    await page.evaluate(dedent`() => {
      try {
        // Force lazyload for content listening to scroll
        window.scrollTo(0, document.body.scrollHeight);
      } catch(e) {}

      try {
        // Fix UMD for sites that define reserved names globally
        window.define = null;
        window.exports = null;
      } catch(e) {}
    }`);

    await page.addScriptTag({
      path: "./node_modules/@julianpoy/recipe-clipper/dist/recipe-clipper.umd.js",
    });
    const recipeData = await page.evaluate((interceptUrl) => {
      return (window as any).RecipeClipper.clipRecipe({
        mlClassifyEndpoint: interceptUrl,
        ignoreMLClassifyErrors: true,
      });
    }, INTERCEPT_PLACEHOLDER_URL);

    disconnectPuppeteer(browser);

    return recipeData;
  } catch (e) {
    if (browser) disconnectPuppeteer(browser);

    throw e;
  }
};

const replaceBrWithBreak = (html: string) => {
  return html.replaceAll(new RegExp(/<br( \/)?>/, "g"), "\n");
};

const clipRecipeHtmlWithJSDOM = async (document: string) => {
  const dom = new jsdom.JSDOM(document);

  const { window } = dom;

  Object.defineProperty(window.Element.prototype, "innerText", {
    get() {
      const html = replaceBrWithBreak(this.innerHTML);
      return sanitizeHtml(html, {
        allowedTags: [], // remove all tags and return text content only
        allowedAttributes: {}, // remove all tags and return text content only
      });
    },
  });

  (window.fetch as any) = fetch;

  return await RecipeClipper.clipRecipe({
    window,
    mlClassifyEndpoint: process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL,
    ignoreMLClassifyErrors: true,
  });
};

const clipRecipeUrlWithJSDOM = async (clipUrl: string) => {
  const response = await fetchURL(clipUrl);

  const document = await response.text();

  return await clipRecipeHtmlWithJSDOM(document);
};

export const clipUrl = async (
  url: string,
): Promise<StandardizedRecipeImportEntry> => {
  const recipeDataBrowser = await clipRecipeUrlWithPuppeteer(url).catch((e) => {
    console.log(e);
    Sentry.captureException(e);
  });

  let results = recipeDataBrowser;
  if (
    !recipeDataBrowser ||
    !recipeDataBrowser.ingredients ||
    !recipeDataBrowser.instructions
  ) {
    const recipeDataJSDOM = await clipRecipeUrlWithJSDOM(url).catch((e) => {
      console.log(e);
      Sentry.captureException(e);
    });

    if (recipeDataJSDOM) {
      results = recipeDataJSDOM;

      // Merge results (browser overrides JSDOM due to accuracy)
      Object.entries(recipeDataBrowser || {}).forEach((entry) => {
        if (entry[1]) results[entry[0]] = entry[1];
      });
    }
  }

  // Decode all html entities from fields
  Object.entries(results).forEach((entry) => {
    results[entry[0]] = he.decode(entry[1] as any);
  });

  const typedResults = results as RecipeClipperResult;

  return {
    recipe: {
      title: typedResults.title || "",
      description: typedResults.description || "",
      source: typedResults.source || "",
      yield: typedResults.yield || "",
      activeTime: typedResults.activeTime || "",
      totalTime: typedResults.totalTime || "",
      ingredients: typedResults.ingredients || "",
      instructions: typedResults.instructions || "",
      notes: typedResults.notes || "",
    },
    images: typedResults.imageURL ? [typedResults.imageURL] : [],
    labels: [],
  } satisfies StandardizedRecipeImportEntry;
};

export const clipHtml = async (
  document: string,
): Promise<StandardizedRecipeImportEntry> => {
  const results = await clipRecipeHtmlWithJSDOM(document).catch((e) => {
    console.log(e);
    Sentry.captureException(e);
  });

  // Decode all html entities from fields
  Object.entries(results).forEach((entry) => {
    results[entry[0]] = he.decode(entry[1] as any);
  });

  const typedResults = results as RecipeClipperResult;

  return {
    recipe: {
      title: typedResults.title || "",
      description: typedResults.description || "",
      source: typedResults.source || "",
      yield: typedResults.yield || "",
      activeTime: typedResults.activeTime || "",
      totalTime: typedResults.totalTime || "",
      ingredients: typedResults.ingredients || "",
      instructions: typedResults.instructions || "",
      notes: typedResults.notes || "",
    },
    images: typedResults.imageURL ? [typedResults.imageURL] : [],
    labels: [],
  } satisfies StandardizedRecipeImportEntry;
};
