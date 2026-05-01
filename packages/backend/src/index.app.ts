import "./sentry-init.js";
import * as Sentry from "@sentry/node";
import { program } from "commander";

import { indexRecipes } from "@recipesage/util/server/search";

import { prisma } from "@recipesage/prisma";

program
  .option("-b, --batch-size [size]", "Batch size", "1000")
  .option("-i, --batch-interval [interval]", "Batch interval in seconds", "1")
  .parse(process.argv);
const opts = program.opts();
const options = {
  batchSize: parseInt(opts.batchSize, 10),
  batchInterval: parseFloat(opts.batchInterval),
};

const waitFor = async (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

const runIndexOp = async () => {
  try {
    let lt = new Date();
    lt.setDate(lt.getDate() - 7);

    if (process.env.INDEX_BEFORE) {
      lt = new Date(process.env.INDEX_BEFORE); // Must be in '2020-03-01 22:20' format
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
      take: options.batchSize,
    });

    if (!recipes || recipes.length === 0) {
      console.log("Index complete!");
      process.exit(0);
    }

    await indexRecipes(recipes);

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
  } catch (e) {
    Sentry.captureException(e);
    console.log("Error while indexing", e);
    process.exit(1);
  }
};

const runPostgresBackfill = async () => {
  const always = true;
  while (always) {
    try {
      const result = await prisma.$executeRaw`
        UPDATE "Recipes" SET tsv =
          setweight(to_tsvector('simple', left(coalesce(title, ''), 255)), 'A') ||
          setweight(to_tsvector('simple', left(coalesce(description, ''), 255)), 'B') ||
          setweight(to_tsvector('simple', left(coalesce(ingredients, ''), 3000)), 'B') ||
          setweight(to_tsvector('simple', left(coalesce(source, ''), 255)), 'C') ||
          setweight(to_tsvector('simple', left(coalesce(notes, ''), 3000)), 'C') ||
          setweight(to_tsvector('simple', left(coalesce(instructions, ''), 3000)), 'C')
        WHERE id IN (
          SELECT id FROM "Recipes" WHERE tsv IS NULL LIMIT ${options.batchSize}
        )
      `;

      if (result === 0) {
        console.log("Postgres FTS backfill complete!");
        process.exit(0);
      }

      console.log(`Backfilled ${result} recipes`);
    } catch (e) {
      Sentry.captureException(e);
      console.log("Error during postgres FTS backfill", e);
      process.exit(1);
    }

    await waitFor(options.batchInterval * 1000);
  }
};

const run = async () => {
  if (process.env.SEARCH_PROVIDER === "postgres") {
    return runPostgresBackfill();
  }

  const always = true;
  while (always) {
    await runIndexOp();
    await waitFor(options.batchInterval * 1000);
  }
};
run();

process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  process.exit(0);
});
