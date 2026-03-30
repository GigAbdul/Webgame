import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, FieldLabel, Input, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../types/models';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: (payload) => {
      setAuth(payload.token, payload.user);
      navigate(location.state?.from ?? '/levels');
    },
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel className="game-screen flex min-h-[560px] flex-col justify-between bg-transparent">
        <div className="space-y-6">
          <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Pilot Access</p>
          <h2 className="font-display text-5xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]">
            Return
            <br />
            To The
            <br />
            Arcade
          </h2>
          <p className="max-w-xl text-sm leading-8 text-white/78">
            Загрузи профиль, верни свои звёзды, черновики и доступ к official runs без ощущения обычной auth-страницы.
          </p>
        </div>

        <div className="space-y-4">
          <div className="game-stat px-4 py-4">
            <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">Demo Admin</p>
            <p className="mt-2 text-sm text-white">admin@example.com</p>
            <p className="text-sm text-[#caff45]">Admin123!</p>
          </div>
          <div className="game-stat px-4 py-4">
            <p className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a]">What Unlocks</p>
            <p className="mt-2 text-sm text-white/76">Official runs, profile stats, editor drafts and admin moderation.</p>
          </div>
        </div>
      </Panel>

      <Panel className="game-screen space-y-5 bg-transparent">
        <div className="space-y-3">
          <p className="font-display text-[11px] tracking-[0.3em] text-[#ffd44a]">Authentication</p>
          <h2 className="font-display text-4xl leading-[0.95] text-white">Login</h2>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input {...form.register('email')} placeholder="admin@example.com" />
            <FormError message={form.formState.errors.email?.message} />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <Input type="password" {...form.register('password')} placeholder="Admin123!" />
            <FormError message={form.formState.errors.password?.message} />
          </div>

          {loginMutation.isError ? (
            <p className="arcade-button bg-magmarose/15 px-4 py-3 text-sm text-magmarose">
              {loginMutation.error instanceof Error ? loginMutation.error.message : 'Login failed'}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing In...' : 'Login'}
          </Button>
        </form>

        <p className="text-sm text-white/72">
          Need an account?{' '}
          <Link to="/register" className="font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white">
            Register Here
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
