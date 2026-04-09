import type {
  ButtonHTMLAttributes,
  ForwardedRef,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export function Panel({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('arcade-panel', className)}>{children}</div>;
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={cn('arcade-btn', `arcade-btn--${variant}`, className)}
      {...props}
    />
  );
}

export function FieldLabel({ children }: PropsWithChildren) {
  return <label className="arcade-field-label">{children}</label>;
}

export const Input = forwardRef(function Input(
  props: InputHTMLAttributes<HTMLInputElement>,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return <input ref={ref} {...props} className={cn('arcade-input', props.className)} />;
});

export const Textarea = forwardRef(function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
  ref: ForwardedRef<HTMLTextAreaElement>,
) {
  return <textarea ref={ref} {...props} className={cn('arcade-input arcade-textarea', props.className)} />;
});

export const Select = forwardRef(function Select(
  props: SelectHTMLAttributes<HTMLSelectElement>,
  ref: ForwardedRef<HTMLSelectElement>,
) {
  return <select ref={ref} {...props} className={cn('arcade-input arcade-select', props.className)} />;
});

export function Badge({
  children,
  tone = 'default',
}: PropsWithChildren<{ tone?: 'default' | 'accent' | 'success' | 'danger' }>) {
  return <span className={cn('arcade-badge', `arcade-badge--${tone}`)}>{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="arcade-section-heading">
      {eyebrow ? <p className="arcade-eyebrow">{eyebrow}</p> : null}
      <h2 className="arcade-heading">{title}</h2>
      {description ? <p className="arcade-description">{description}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <Panel className="arcade-stat-card">
      <p className="arcade-stat-label">{label}</p>
      <div className="arcade-stat-row">
        <p className="arcade-stat-value">{value}</p>
        {accent ? <p className="arcade-stat-accent">{accent}</p> : null}
      </div>
    </Panel>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="arcade-empty-state">
      <div className="arcade-empty-state-body">
        <h3 className="arcade-empty-state-title">{title}</h3>
        <p className="arcade-empty-state-description">{description}</p>
        {action}
      </div>
    </Panel>
  );
}
