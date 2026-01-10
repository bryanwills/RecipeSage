import type { Prisma } from "../prisma/generated/client";

export const userPublic = {
  select: {
    id: true,
    name: true,
    handle: true,
    enableProfile: true,
    profileImages: {
      select: {
        order: true,
        imageId: true,
        image: {
          select: {
            id: true,
            location: true,
          },
        },
      },
    },
  },
} satisfies Prisma.UserFindFirstArgs;

export type UserPublic = Prisma.UserGetPayload<typeof userPublic>;
