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
  return (
    <div
      className={cn(
        'arcade-panel p-5 shadow-arcade backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const variantClasses = {
    primary:
      'border-[3px] border-[#173300] bg-[linear-gradient(180deg,#caff52,#69d70d)] text-[#173300] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.14),0_6px_0_#295500,0_12px_20px_rgba(0,0,0,0.28)] hover:brightness-105',
    secondary:
      'border-[3px] border-[#734700] bg-[linear-gradient(180deg,#ffe45e,#ffbb1f)] text-[#6f4300] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.14),0_6px_0_#8a5200,0_12px_20px_rgba(0,0,0,0.28)] hover:brightness-105',
    ghost:
      'border-[3px] border-[#37105d] bg-[linear-gradient(180deg,#7e2ae6,#5910be)] text-white shadow-[inset_0_0_0_3px_rgba(255,255,255,0.08),0_6px_0_#2c0a53,0_12px_20px_rgba(0,0,0,0.24)] hover:brightness-110',
    danger:
      'border-[3px] border-[#6b1328] bg-[linear-gradient(180deg,#ff7c8f,#eb375a)] text-white shadow-[inset_0_0_0_3px_rgba(255,255,255,0.12),0_6px_0_#8d1732,0_12px_20px_rgba(0,0,0,0.28)] hover:brightness-105',
  };

  return (
    <button
      className={cn(
        'arcade-button font-display inline-flex items-center justify-center px-5 py-3 text-[11px] font-bold tracking-[0.24em] uppercase transition duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({ children }: PropsWithChildren) {
  return <label className="font-display mb-2 block text-[11px] font-medium tracking-[0.22em] text-[#ffd44a]">{children}</label>;
}

export const Input = forwardRef(function Input(
  props: InputHTMLAttributes<HTMLInputElement>,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        'arcade-button w-full border-[3px] border-[#39105f] bg-[linear-gradient(180deg,rgba(42,10,79,0.95),rgba(18,6,40,0.96))] px-4 py-3 text-sm text-white outline-none ring-0 transition placeholder:text-white/35 focus:border-[#69d70d] focus:shadow-[0_0_0_1px_rgba(105,215,13,0.28)]',
        props.className,
      )}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
  ref: ForwardedRef<HTMLTextAreaElement>,
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        'arcade-button w-full border-[3px] border-[#39105f] bg-[linear-gradient(180deg,rgba(42,10,79,0.95),rgba(18,6,40,0.96))] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#69d70d] focus:shadow-[0_0_0_1px_rgba(105,215,13,0.28)]',
        props.className,
      )}
    />
  );
});

export const Select = forwardRef(function Select(
  props: SelectHTMLAttributes<HTMLSelectElement>,
  ref: ForwardedRef<HTMLSelectElement>,
) {
  return (
    <select
      ref={ref}
      {...props}
      className={cn(
        'arcade-button w-full border-[3px] border-[#39105f] bg-[linear-gradient(180deg,rgba(42,10,79,0.95),rgba(18,6,40,0.96))] px-4 py-3 text-sm text-white outline-none transition focus:border-[#69d70d] focus:shadow-[0_0_0_1px_rgba(105,215,13,0.28)]',
        props.className,
      )}
    />
  );
});

export function Badge({
  children,
  tone = 'default',
}: PropsWithChildren<{ tone?: 'default' | 'accent' | 'success' | 'danger' }>) {
  const tones = {
    default: 'border-[3px] border-[#35105a] bg-[linear-gradient(180deg,#7b29df,#5710b8)] text-white',
    accent: 'border-[3px] border-[#734700] bg-[linear-gradient(180deg,#ffe45e,#ffbb1f)] text-[#734700]',
    success: 'border-[3px] border-[#173300] bg-[linear-gradient(180deg,#caff52,#69d70d)] text-[#173300]',
    danger: 'border-[3px] border-[#6b1328] bg-[linear-gradient(180deg,#ff7c8f,#eb375a)] text-white',
  };

  return <span className={cn('font-display arcade-button inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-[0.18em] uppercase shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)]', tones[tone])}>{children}</span>;
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
    <div className="space-y-2">
      {eyebrow ? <p className="font-display text-[11px] tracking-[0.32em] text-[#ffd44a]">{eyebrow}</p> : null}
      <h2 className="font-display text-3xl leading-[0.95] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.38)] md:text-5xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-7 text-white/76">{description}</p> : null}
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
    <Panel className="space-y-3 bg-[linear-gradient(180deg,rgba(141,38,220,0.32),rgba(28,7,59,0.94))]">
      <p className="font-display text-[10px] tracking-[0.24em] text-[#ffd44a]">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <p className="font-display text-4xl leading-none text-[#caff45] drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]">{value}</p>
        {accent ? <p className="text-xs text-white/70">{accent}</p> : null}
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
    <Panel className="text-center bg-[linear-gradient(180deg,rgba(131,31,214,0.28),rgba(28,7,59,0.94))]">
      <div className="mx-auto max-w-md space-y-3 py-8">
        <h3 className="font-display text-2xl text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]">{title}</h3>
        <p className="text-sm leading-7 text-white/75">{description}</p>
        {action}
      </div>
    </Panel>
  );
}
