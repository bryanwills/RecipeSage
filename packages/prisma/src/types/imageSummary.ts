import { Prisma } from "@prisma/client";

export const imageSummary = Prisma.validator<Prisma.ImageFindFirstArgs>()({
  select: {
    id: true,
    location: true,
  },
});

export type ImageSummary = Prisma.ImageGetPayload<typeof imageSummary>;
