import type { ReactNode } from "react";

type Tone = "neutral" | "ok" | "warn" | "danger" | "olive";
const tones: Record<Tone, string> = {
  neutral: "bg-line/60 text-ink-2",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  olive: "bg-olive-soft text-olive",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
