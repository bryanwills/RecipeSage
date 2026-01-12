import type {
  ImageFindFirstArgs,
  ImageGetPayload,
} from "../prisma/generated/models";

export const imageSummary = {
  select: {
    id: true,
    location: true,
  },
} satisfies ImageFindFirstArgs;

export type ImageSummary = ImageGetPayload<typeof imageSummary>;
