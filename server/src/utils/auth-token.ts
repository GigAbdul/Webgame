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
    audience: env.JWT_AUDIENCE,
    expiresIn: '7d',
    issuer: env.JWT_ISSUER,
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET, {
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER,
  }) as AuthTokenPayload;
}

