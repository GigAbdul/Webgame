import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, FieldLabel, Input, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
const registerSchema = z.object({
    username: z.string().min(3).max(24),
    email: z.string().email(),
    password: z.string().min(8),
});
export function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const form = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
        },
    });
    const registerMutation = useMutation({
        mutationFn: (values) => apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(values),
        }),
        onSuccess: (payload) => {
            setAuth(payload.token, payload.user);
            navigate('/levels');
        },
    });
    return (_jsxs("div", { className: "mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.95fr_1.05fr]", children: [_jsxs(Panel, { className: "game-screen flex min-h-[560px] flex-col justify-between bg-transparent", children: [_jsxs("div", { className: "space-y-6", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "New Pilot" }), _jsxs("h2", { className: "font-display text-5xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]", children: ["Create", _jsx("br", {}), "Your", _jsx("br", {}), "Runner ID"] }), _jsx("p", { className: "max-w-xl text-sm leading-8 text-white/78", children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0432\u043E\u0439\u0434\u0438 \u0432 official gauntlet \u0438 \u043E\u0442\u043A\u0440\u043E\u0439 forge \u0434\u043B\u044F \u0441\u0432\u043E\u0438\u0445 \u043A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0445 stage-\u043E\u0432." })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Progress" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: "Stars Saved" })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Creation" }), _jsx("p", { className: "mt-2 font-display text-xl text-white", children: "Forge Open" })] })] })] }), _jsxs(Panel, { className: "game-screen space-y-5 bg-transparent", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "New Player" }), _jsx("h2", { className: "font-display text-4xl leading-[0.95] text-white", children: "Register" })] }), _jsxs("form", { className: "space-y-4", onSubmit: form.handleSubmit((values) => registerMutation.mutate(values)), children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Username" }), _jsx(Input, { ...form.register('username'), placeholder: "nova_runner" }), _jsx(FormError, { message: form.formState.errors.username?.message })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Email" }), _jsx(Input, { ...form.register('email'), placeholder: "nova@example.com" }), _jsx(FormError, { message: form.formState.errors.email?.message })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Password" }), _jsx(Input, { type: "password", ...form.register('password'), placeholder: "StrongPass1" }), _jsx(FormError, { message: form.formState.errors.password?.message })] }), registerMutation.isError ? (_jsx("p", { className: "arcade-button bg-magmarose/15 px-4 py-3 text-sm text-magmarose", children: registerMutation.error instanceof Error ? registerMutation.error.message : 'Registration failed' })) : null, _jsx(Button, { type: "submit", className: "w-full", disabled: registerMutation.isPending, children: registerMutation.isPending ? 'Creating Account...' : 'Register' })] }), _jsxs("p", { className: "text-sm text-white/72", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white", children: "Log In" }), "."] })] })] }));
}
function FormError({ message }) {
    if (!message) {
        return null;
    }
    return _jsx("p", { className: "mt-2 text-sm text-magmarose", children: message });
}
