import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import type { UpdateProfileInput } from "../validators/auth.validator";

export const userService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw AppError.notFound("User not found");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      profile: user.profile
        ? {
            id: user.profile.id,
            userId: user.profile.userId,
            stylePreferences: user.profile.stylePreferences,
            favouriteColors: user.profile.favouriteColors,
            createdAt: user.profile.createdAt.toISOString(),
            updatedAt: user.profile.updatedAt.toISOString(),
          }
        : null,
    };
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const { name, ...profileFields } = input;

    await prisma.$transaction(async (tx) => {
      if (name) {
        await tx.user.update({ where: { id: userId }, data: { name } });
      }
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileFields },
        update: profileFields,
      });
    });

    return this.getProfile(userId);
  },
};
