import * as Sentry from "@sentry/node";

import { prisma } from "@recipesage/prisma";
import { indexRecipes as searchIndexRecipes } from "@recipesage/util/server/search";

const waitFor = async (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

const runIndexOp = async (batchSize: number) => {
  let lt = new Date();
  lt.setDate(lt.getDate() - 7);

  if (process.env.INDEX_BEFORE) {
    lt = new Date(process.env.INDEX_BEFORE);
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [
        {
          indexedAt: null,
        },
        {
          indexedAt: {
            lt,
          },
        },
      ],
    },
    take: batchSize,
  });

  if (!recipes || recipes.length === 0) {
    console.log("Index complete!");
    return false;
  }

  await searchIndexRecipes(recipes);

  const ids = recipes.map((r) => r.id);
  await prisma.recipe.updateMany({
    data: {
      indexedAt: new Date(),
    },
    where: {
      id: {
        in: ids,
      },
    },
  });

  return true;
};

const runPostgresBackfill = async (
  batchSize: number,
  batchInterval: number,
) => {
  while (true) {
    const result = await prisma.$executeRaw`
      UPDATE "Recipes" SET tsv =
        setweight(to_tsvector('simple', left(coalesce(title, ''), 255)), 'A') ||
        setweight(to_tsvector('simple', left(coalesce(description, ''), 255)), 'B') ||
        setweight(to_tsvector('simple', left(coalesce(ingredients, ''), 3000)), 'B') ||
        setweight(to_tsvector('simple', left(coalesce(source, ''), 255)), 'C') ||
        setweight(to_tsvector('simple', left(coalesce(notes, ''), 3000)), 'C') ||
        setweight(to_tsvector('simple', left(coalesce(instructions, ''), 3000)), 'C')
      WHERE id IN (
        SELECT id FROM "Recipes" WHERE tsv IS NULL LIMIT ${batchSize}
      )
    `;

    if (result === 0) {
      console.log("Postgres FTS backfill complete!");
      return;
    }

    console.log(`Backfilled ${result} recipes`);

    await waitFor(batchInterval * 1000);
  }
};

export const indexRecipes = async (args: {
  batchSize: number;
  batchInterval: number;
}) => {
  try {
    if (process.env.SEARCH_PROVIDER === "postgres") {
      await runPostgresBackfill(args.batchSize, args.batchInterval);
      return;
    }

    while (await runIndexOp(args.batchSize)) {
      await waitFor(args.batchInterval * 1000);
    }
  } catch (e) {
    Sentry.captureException(e);
    console.log("Error while indexing", e);
    throw e;
  }
};
