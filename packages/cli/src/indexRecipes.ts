import * as Sentry from "@sentry/node";

import { Prisma, prisma } from "@recipesage/prisma";
import { indexRecipes as searchIndexRecipes } from "@recipesage/util/server/search";

const waitFor = async (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

const RECIPES_TSV = Prisma.sql`
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(title, ''), 255))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(description, ''), 255))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(ingredients, ''), 3000))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(source, ''), 255))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(notes, ''), 3000))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(instructions, ''), 3000))), 'C')
`;

const DISCOVER_RECIPES_TSV = Prisma.sql`
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(title, ''), 255))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(description, ''), 255))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(ingredients, ''), 3000))), 'B') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(notes, ''), 3000))), 'C') ||
  setweight(to_tsvector('simple', immutable_unaccent(left(coalesce(instructions, ''), 3000))), 'C')
`;

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

const backfillTsv = async (
  table: Prisma.Sql,
  expr: Prisma.Sql,
  batchSize: number,
  batchInterval: number,
) => {
  let lastId = "00000000-0000-0000-0000-000000000000";

  while (true) {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM ${table} WHERE id > ${lastId}::uuid ORDER BY id LIMIT ${batchSize}
    `);

    if (rows.length === 0) return;

    lastId = rows[rows.length - 1].id;

    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE ${table} SET tsv = ${expr}
      WHERE id = ANY(${rows.map((r) => r.id)}::uuid[])
        AND tsv IS DISTINCT FROM (${expr})
    `);

    if (updated > 0) {
      console.log(`Backfilled ${updated} rows through ${lastId}`);
    }

    await waitFor(batchInterval * 1000);
  }
};

const runPostgresBackfill = async (
  batchSize: number,
  batchInterval: number,
) => {
  await backfillTsv(
    Prisma.sql`"Recipes"`,
    RECIPES_TSV,
    batchSize,
    batchInterval,
  );
  await backfillTsv(
    Prisma.sql`"Discover_Recipes"`,
    DISCOVER_RECIPES_TSV,
    batchSize,
    batchInterval,
  );

  console.log("Postgres FTS backfill complete!");
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
