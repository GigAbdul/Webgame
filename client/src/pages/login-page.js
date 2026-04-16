import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, FieldLabel, Input, Panel } from '../components/ui';
import { apiRequest } from '../services/api';
import { useAuthStore } from '../store/auth-store';
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const setAuth = useAuthStore((state) => state.setAuth);
    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });
    const loginMutation = useMutation({
        mutationFn: (values) => apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(values),
        }),
        onSuccess: (payload) => {
            setAuth(payload.token, payload.user);
            navigate(location.state?.from ?? '/levels');
        },
    });
    return (_jsxs("div", { className: "mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.95fr_1.05fr]", children: [_jsxs(Panel, { className: "game-screen flex min-h-[560px] flex-col justify-between bg-transparent", children: [_jsxs("div", { className: "space-y-6", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "Pilot Access" }), _jsxs("h2", { className: "font-display text-5xl leading-[0.9] text-[#caff45] drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]", children: ["Return", _jsx("br", {}), "To The", _jsx("br", {}), "Arcade"] }), _jsx("p", { className: "max-w-xl text-sm leading-8 text-white/78", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u0432\u0435\u0440\u043D\u0438 \u0441\u0432\u043E\u0438 \u0437\u0432\u0451\u0437\u0434\u044B, \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0438 \u0438 \u0434\u043E\u0441\u0442\u0443\u043F \u043A official runs \u0431\u0435\u0437 \u043E\u0449\u0443\u0449\u0435\u043D\u0438\u044F \u043E\u0431\u044B\u0447\u043D\u043E\u0439 auth-\u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "Demo Admin" }), _jsx("p", { className: "mt-2 text-sm text-white", children: "admin@example.com" }), _jsx("p", { className: "text-sm text-[#caff45]", children: "Admin123!" })] }), _jsxs("div", { className: "game-stat px-4 py-4", children: [_jsx("p", { className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a]", children: "What Unlocks" }), _jsx("p", { className: "mt-2 text-sm text-white/76", children: "Official runs, profile stats, editor drafts and admin moderation." })] })] })] }), _jsxs(Panel, { className: "game-screen space-y-5 bg-transparent", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-display text-[11px] tracking-[0.3em] text-[#ffd44a]", children: "Authentication" }), _jsx("h2", { className: "font-display text-4xl leading-[0.95] text-white", children: "Login" })] }), _jsxs("form", { className: "space-y-4", onSubmit: form.handleSubmit((values) => loginMutation.mutate(values)), children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "Email" }), _jsx(Input, { ...form.register('email'), placeholder: "admin@example.com" }), _jsx(FormError, { message: form.formState.errors.email?.message })] }), _jsxs("div", { children: [_jsx(FieldLabel, { children: "Password" }), _jsx(Input, { type: "password", ...form.register('password'), placeholder: "Admin123!" }), _jsx(FormError, { message: form.formState.errors.password?.message })] }), loginMutation.isError ? (_jsx("p", { className: "arcade-button bg-magmarose/15 px-4 py-3 text-sm text-magmarose", children: loginMutation.error instanceof Error ? loginMutation.error.message : 'Login failed' })) : null, _jsx(Button, { type: "submit", className: "w-full", disabled: loginMutation.isPending, children: loginMutation.isPending ? 'Signing In...' : 'Login' })] }), _jsxs("p", { className: "text-sm text-white/72", children: ["Need an account?", ' ', _jsx(Link, { to: "/register", className: "font-display text-[10px] tracking-[0.22em] text-[#ffd44a] hover:text-white", children: "Register Here" }), "."] })] })] }));
}
function FormError({ message }) {
    if (!message) {
        return null;
    }
    return _jsx("p", { className: "mt-2 text-sm text-magmarose", children: message });
}
