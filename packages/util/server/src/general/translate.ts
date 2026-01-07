import { readdir, readFile } from "fs/promises";
import { join, parse } from "path";
import acceptLanguage from "accept-language";
import { SupportedLanguages } from "@recipesage/util/shared";
acceptLanguage.languages(Object.values(SupportedLanguages));

const loadedLanguageFileMap: Record<string, Record<string, string>> = {};

const FRONTEND_I18N_PATH = process.env.FRONTEND_I18N_PATH;
if (!FRONTEND_I18N_PATH) throw new Error("FRONTEND_I18N_PATH must be provided");

const loadPromise = (async () => {
  const fileNames = await readdir(FRONTEND_I18N_PATH);
  for (const fileName of fileNames) {
    const filePath = join(FRONTEND_I18N_PATH, fileName);
    const languageCode = parse(filePath).name;
    const fileContents = await readFile(filePath, "utf8");
    loadedLanguageFileMap[languageCode] = JSON.parse(fileContents);
  }
})();

export const translate = async (
  acceptLanguageHeader: string,
  key: string,
): Promise<string> => {
  const lang = acceptLanguage.get(acceptLanguageHeader);
  if (!lang) return key;

  await loadPromise;

  const translations = loadedLanguageFileMap[lang] || {};

  if (translations[key]) return translations[key];
  if (lang !== "en-us") return translate("en-us", key);
  return key;
};
