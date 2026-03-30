import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { signAuthToken } from '../../utils/auth-token';
import type { LoginInput, RegisterInput } from './auth.schemas';

function buildAuthPayload(user: {
  id: string;
  username: string;
  email: string;
  role: Role;
  totalStars: number;
  completedOfficialLevels: number;
}) {
  return {
    token: signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    }),
    user,
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email.toLowerCase() }, { username: input.username }],
      },
    });

    if (existing) {
      throw new ApiError(409, 'Email or username already in use');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        totalStars: true,
        completedOfficialLevels: true,
      },
    });

    return buildAuthPayload(user);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email.toLowerCase(),
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    return buildAuthPayload({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      totalStars: user.totalStars,
      completedOfficialLevels: user.completedOfficialLevels,
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        totalStars: true,
        completedOfficialLevels: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },
};

