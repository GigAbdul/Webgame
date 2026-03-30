import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AuthTokenPayload = {
  sub: string;
  role: 'USER' | 'ADMIN';
  email: string;
  username: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

