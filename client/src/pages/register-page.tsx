import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, FieldLabel, Input, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../types/models';

const registerSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(8),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      apiRequest<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: (payload) => {
      setAuth(payload.token, payload.user);
      navigate('/levels');
    },
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel className="game-screen flex min-h-[560px] flex-col justify-between bg-transparent">
        <div className="space-y-6">
          <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">New Pilot</p>
          <h2 className="font-display text-5xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]">
            Create
            <br />
            Your
            <br />
            Runner ID
          </h2>
          <p className="max-w-xl text-sm leading-8 text-white/78">
            Зарегистрируй профиль, войди в official gauntlet и открой forge для своих кастомных stage-ов.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="game-stat px-4 py-4">
            <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Progress</p>
            <p className="mt-2 font-display text-xl text-white">Stars Saved</p>
          </div>
          <div className="game-stat px-4 py-4">
            <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Creation</p>
            <p className="mt-2 font-display text-xl text-white">Forge Open</p>
          </div>
        </div>
      </Panel>

      <Panel className="game-screen space-y-5 bg-transparent">
        <div className="space-y-3">
          <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">New Player</p>
          <h2 className="font-display text-4xl leading-[0.95] text-white">Register</h2>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}>
          <div>
            <FieldLabel>Username</FieldLabel>
            <Input {...form.register('username')} placeholder="nova_runner" />
            <FormError message={form.formState.errors.username?.message} />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input {...form.register('email')} placeholder="nova@example.com" />
            <FormError message={form.formState.errors.email?.message} />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <Input type="password" {...form.register('password')} placeholder="StrongPass1" />
            <FormError message={form.formState.errors.password?.message} />
          </div>

          {registerMutation.isError ? (
            <p className="arcade-button bg-magmarose/15 px-4 py-3 text-sm text-magmarose">
              {registerMutation.error instanceof Error ? registerMutation.error.message : 'Registration failed'}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Creating Account...' : 'Register'}
          </Button>
        </form>

        <p className="text-sm text-white/72">
          Already have an account?{' '}
          <Link to="/login" className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white">
            Log In
          </Link>
          .
        </p>
      </Panel>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-magmarose">{message}</p>;
}
