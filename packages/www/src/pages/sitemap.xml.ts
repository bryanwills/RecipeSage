import type { APIRoute } from "astro";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  toBcp47,
} from "../i18n/translations";

const PAGES = ["/", "/about", "/pricing", "/download"];

const priorityFor = (path: string) => (path === "/" ? "1.0" : "0.8");

const urlForLocale = (site: URL, loc: string, path: string) => {
  const prefix = loc === DEFAULT_LOCALE ? "" : `/${loc}`;
  const full = path === "/" ? `${prefix}/` : `${prefix}${path}`;
  return new URL(full, site).toString();
};

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("astro.config.mjs `site` must be set");

  const urls: string[] = [];
  for (const path of PAGES) {
    const alternates = [
      ...SUPPORTED_LOCALES.map(
        (loc) =>
          `    <xhtml:link rel="alternate" hreflang="${toBcp47(loc)}" href="${urlForLocale(site, loc, path)}" />`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlForLocale(site, DEFAULT_LOCALE, path)}" />`,
    ].join("\n");

    for (const loc of SUPPORTED_LOCALES) {
      urls.push(
        [
          "  <url>",
          `    <loc>${urlForLocale(site, loc, path)}</loc>`,
          `    <changefreq>weekly</changefreq>`,
          `    <priority>${priorityFor(path)}</priority>`,
          alternates,
          "  </url>",
        ].join("\n"),
      );
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls.join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
