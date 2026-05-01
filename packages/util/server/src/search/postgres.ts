import { prisma } from "@recipesage/prisma";
import { SearchProvider } from "./";

export const indexRecipes = async () => {
  return Promise.resolve();
};

export const deleteRecipes = async () => {
  return Promise.resolve();
};

export const searchRecipes = async (userIds: string[], queryString: string) => {
  if (!userIds.length || !queryString.trim()) return [];

  const tsquery = queryString
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 0)
    .map((t) => `${t}:*`)
    .join(" & ");

  if (!tsquery) return [];

  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "Recipes"
    WHERE "userId" = ANY(${userIds}::uuid[])
      AND tsv @@ to_tsquery('simple', ${tsquery})
    ORDER BY ts_rank(tsv, to_tsquery('simple', ${tsquery})) DESC
    LIMIT 500
  `;

  return results.map((r) => r.id);
};

export default {
  indexRecipes,
  deleteRecipes,
  searchRecipes,
} satisfies SearchProvider;
