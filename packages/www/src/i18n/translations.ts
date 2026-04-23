export const DEFAULT_LOCALE = "en-us";

export const LOCALE_NAMES: Record<string, string> = {
  "en-us": "English",
  cs: "Čeština",
  "da-dk": "Dansk",
  "de-de": "Deutsch",
  el: "Ελληνικά",
  "es-es": "Español",
  eu: "Euskara",
  fi: "Suomi",
  "fr-fr": "Français",
  he: "עברית",
  "hu-hu": "Magyar",
  "it-it": "Italiano",
  ja: "日本語",
  lt: "Lietuvių",
  nl: "Nederlands",
  pl: "Polski",
  "pt-br": "Português (Brasil)",
  "pt-pt": "Português (Portugal)",
  ro: "Română",
  "ru-ru": "Русский",
  sv: "Svenska",
  "uk-ua": "Українська",
  "zh-cn": "中文 (简体)",
};

const i18nModules = import.meta.glob<Record<string, string>>(
  "../../../frontend/src/assets/i18n/*.json",
  { eager: true, import: "default" },
);

const i18nByLocale: Record<string, Record<string, string>> = {};
for (const [path, dict] of Object.entries(i18nModules)) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (!match) continue;
  i18nByLocale[match[1]] = dict;
}

export const SUPPORTED_LOCALES = Object.keys(i18nByLocale).sort();

export type Translator = (key: string) => string;

export function makeTranslator(locale: string): Translator {
  const dict = i18nByLocale[locale] ?? {};
  const fallback =
    locale === DEFAULT_LOCALE ? null : (i18nByLocale[DEFAULT_LOCALE] ?? null);
  return (key) => dict[key] ?? fallback?.[key] ?? key;
}

export function localePath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path}`;
}

export function toBcp47(locale: string): string {
  const [lang, region] = locale.split("-");
  return region ? `${lang}-${region.toUpperCase()}` : lang;
}
