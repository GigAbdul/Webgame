import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../src/modules/auth/auth.schemas';

describe('auth schemas', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      username: 'player_one',
      email: 'player@gmail.com',
      password: 'StrongPass1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({
      username: 'player_one',
      email: 'player@gmail.com',
      password: 'weak',
    });

    expect(result.success).toBe(false);
  });

  it('rejects registration email domains outside the allow list', () => {
    const result = registerSchema.safeParse({
      username: 'player_one',
      email: 'player@example.com',
      password: 'StrongPass1',
    });

    expect(result.success).toBe(false);
  });

  it('requires a valid email on login', () => {
    const result = loginSchema.safeParse({
      email: 'nope',
      password: 'StrongPass1',
    });

    expect(result.success).toBe(false);
  });

  it('accepts existing shorter passwords on login', () => {
    const result = loginSchema.safeParse({
      email: 'player@gmail.com',
      password: 'OldPass1',
    });

    expect(result.success).toBe(true);
  });
});

