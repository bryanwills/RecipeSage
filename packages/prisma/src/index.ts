import { PrismaClient, Prisma } from "./prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import cursorStream from "prisma-cursorstream";
import client from "prom-client";

const prismaQuery = new client.Histogram({
  name: "prisma_query",
  help: "Every time a query is made by the prisma client",
  labelNames: [],
  buckets: [3, 5, 10, 20, 40, 70, 100, 200, 500, 1000, 5000], // Each of these is tracked in milliseconds
});

export * from "./types";
export * from "./prisma/generated/client";

const log: Prisma.LogDefinition[] = [
  {
    level: "error",
    emit: "stdout",
  },
  {
    level: "info",
    emit: "stdout",
  },
  {
    level: "warn",
    emit: "stdout",
  },
  {
    level: "query",
    emit: "event",
  },
];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? true
      : {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
        },
});

const _prisma = new PrismaClient({
  adapter,
  log,
});

_prisma.$on("query", (e) => {
  if (process.env.PRISMA_DEBUG_ENABLE === "true") {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  }
  prismaQuery.observe(e.duration);
});

export const prisma = _prisma;
/**
 * A separate export of Prisma for cursorStream functionality since extends modifies the base type very oddly.
 */
export const prismaCursorStream = _prisma.$extends(cursorStream);

export type PrismaTransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];
