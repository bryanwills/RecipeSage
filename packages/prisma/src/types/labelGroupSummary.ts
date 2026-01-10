import type { Prisma } from "../prisma/generated/client";

export const labelGroupSummary = {
  select: {
    id: true,
    userId: true,
    title: true,
    warnWhenNotPresent: true,
    createdAt: true,
    updatedAt: true,
    labels: {
      select: {
        labelGroupId: true,
      },
    },
  },
} satisfies Prisma.LabelGroupFindFirstArgs;

export type LabelGroupSummary = Prisma.LabelGroupGetPayload<
  typeof labelGroupSummary
>;
