import type { Prisma } from "../prisma/generated/client";

export const labelSummary = {
  select: {
    id: true,
    userId: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    labelGroupId: true,
    labelGroup: {
      select: {
        id: true,
        userId: true,
        title: true,
        warnWhenNotPresent: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    _count: {
      select: {
        recipeLabels: true,
      },
    },
  },
} satisfies Prisma.LabelFindFirstArgs;

export type LabelSummary = Prisma.LabelGetPayload<typeof labelSummary>;
