import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 h-9 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-paper",
  ghost: "text-ink-2 hover:bg-line/50",
  danger: "border border-danger/40 text-danger hover:bg-danger-soft",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
