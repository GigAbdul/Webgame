import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '../utils/cn';
export function Panel({ className, children, }) {
    return _jsx("div", { className: cn('arcade-panel', className), children: children });
}
export function Button({ className, variant = 'primary', ...props }) {
    return (_jsx("button", { className: cn('arcade-btn', `arcade-btn--${variant}`, className), ...props }));
}
export function FieldLabel({ children }) {
    return _jsx("label", { className: "arcade-field-label", children: children });
}
export const Input = forwardRef(function Input(props, ref) {
    return _jsx("input", { ref: ref, ...props, className: cn('arcade-input', props.className) });
});
export const Textarea = forwardRef(function Textarea(props, ref) {
    return _jsx("textarea", { ref: ref, ...props, className: cn('arcade-input arcade-textarea', props.className) });
});
export const Select = forwardRef(function Select(props, ref) {
    return _jsx("select", { ref: ref, ...props, className: cn('arcade-input arcade-select', props.className) });
});
export function Badge({ children, tone = 'default', }) {
    return _jsx("span", { className: cn('arcade-badge', `arcade-badge--${tone}`), children: children });
}
export function SectionHeading({ eyebrow, title, description, }) {
    return (_jsxs("div", { className: "arcade-section-heading", children: [eyebrow ? _jsx("p", { className: "arcade-eyebrow", children: eyebrow }) : null, _jsx("h2", { className: "arcade-heading", children: title }), description ? _jsx("p", { className: "arcade-description", children: description }) : null] }));
}
export function StatCard({ label, value, accent, }) {
    return (_jsxs(Panel, { className: "arcade-stat-card", children: [_jsx("p", { className: "arcade-stat-label", children: label }), _jsxs("div", { className: "arcade-stat-row", children: [_jsx("p", { className: "arcade-stat-value", children: value }), accent ? _jsx("p", { className: "arcade-stat-accent", children: accent }) : null] })] }));
}
export function EmptyState({ title, description, action, }) {
    return (_jsx(Panel, { className: "arcade-empty-state", children: _jsxs("div", { className: "arcade-empty-state-body", children: [_jsx("h3", { className: "arcade-empty-state-title", children: title }), _jsx("p", { className: "arcade-empty-state-description", children: description }), action] }) }));
}
