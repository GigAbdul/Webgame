import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { Role } from '@prisma/client';
import { sendEmailVerificationCode } from '../../lib/mailer';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { signAuthToken } from '../../utils/auth-token';
import type {
  LoginInput,
  RegisterInput,
  ResendEmailVerificationInput,
  VerifyEmailInput,
} from './auth.schemas';

const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

async function issueEmailVerificationCode(userId: string, email: string) {
  const code = createVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS);
  const sentAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCodeHash: codeHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationSentAt: sentAt,
    },
  });

  await sendEmailVerificationCode(email, code);

  return {
    expiresAt,
  };
}

function buildVerificationRequiredPayload(email: string, expiresAt?: Date | null) {
  return {
    requiresEmailVerification: true,
    email,
    expiresAt: expiresAt?.toISOString() ?? null,
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: input.username }],
      },
    });

    if (existing) {
      throw new ApiError(409, 'Email or username already in use');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    const verification = await issueEmailVerificationCode(user.id, user.email);

    return buildVerificationRequiredPayload(user.email, verification.expiresAt);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: normalizeEmail(input.email),
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new ApiError(
        403,
        'Email verification required',
        buildVerificationRequiredPayload(user.email, user.emailVerificationExpiresAt),
      );
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

  async verifyEmail(input: VerifyEmailInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: normalizeEmail(input.email),
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid verification code');
    }

    if (user.emailVerifiedAt) {
      return buildAuthPayload({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        totalStars: user.totalStars,
        completedOfficialLevels: user.completedOfficialLevels,
      });
    }

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      throw new ApiError(400, 'Verification code expired. Request a new code.');
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new ApiError(400, 'Verification code expired. Request a new code.');
    }

    const isCodeValid = await bcrypt.compare(input.code, user.emailVerificationCodeHash);

    if (!isCodeValid) {
      throw new ApiError(400, 'Invalid verification code');
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationSentAt: null,
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

    return buildAuthPayload(verifiedUser);
  },

  async resendEmailVerification(input: ResendEmailVerificationInput) {
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        emailVerificationSentAt: true,
      },
    });

    if (!user) {
      return {
        email,
        sent: true,
      };
    }

    if (user.emailVerifiedAt) {
      return {
        email: user.email,
        alreadyVerified: true,
      };
    }

    if (
      user.emailVerificationSentAt &&
      user.emailVerificationSentAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS > Date.now()
    ) {
      throw new ApiError(429, 'Wait a minute before requesting another code');
    }

    const verification = await issueEmailVerificationCode(user.id, user.email);

    return {
      ...buildVerificationRequiredPayload(user.email, verification.expiresAt),
      sent: true,
    };
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

