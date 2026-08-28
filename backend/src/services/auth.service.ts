import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiryDate,
  signAccessToken,
} from "../utils/jwt";
import type { RegisterInput, LoginInput } from "../validators/auth.validator";

function toPublicUser(user: { id: string; name: string; email: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function issueTokens(userId: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(),
    },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Same message as "wrong password" would be more enumeration-resistant,
      // but for a public register endpoint, confirming an email is taken
      // is a normal, accepted UX tradeoff (unlike on login).
      throw AppError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        profile: { create: { stylePreferences: [], favouriteColors: [] } },
      },
    });

    const tokens = await issueTokens(user.id, user.email);
    return { user: toPublicUser(user), tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Constant-shape response whether the user exists or not, to avoid
    // leaking account existence via timing/response differences.
    const passwordHash = user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const valid = await verifyPassword(input.password, passwordHash);

    if (!user || !valid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const tokens = await issueTokens(user.id, user.email);
    return { user: toPublicUser(user), tokens };
  },

  async refresh(rawToken: string) {
    const tokenHash = hashRefreshToken(rawToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw AppError.unauthorized("Invalid or expired refresh token");

    // Rotate: revoke the used token and issue a new pair. Prevents replay
    // of a stolen refresh token after the legitimate user has refreshed once.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await issueTokens(user.id, user.email);
    return { user: toPublicUser(user), tokens };
  },

  async logout(rawToken: string) {
    const tokenHash = hashRefreshToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
