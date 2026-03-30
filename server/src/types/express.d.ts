import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        username: string;
        role: Role;
      };
    }
  }
}

export {};

