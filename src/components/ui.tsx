import type { ReactNode } from "react";
import { Inbox, Lock } from "lucide-react";
import { fa } from "@/lib/jalali";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-extrabold md:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="m-0 mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: number | string; hint?: string; icon?: ReactNode; tone?: "brand" | "teal" | "warn" | "ok" }) {
  const color = { brand: "var(--brand)", teal: "var(--teal)", warn: "var(--warn)", ok: "var(--ok)" }[tone];
  const numeric = typeof value === "number";
  return (
    <div className="glass card-hover fade-up relative overflow-hidden p-5">
      <span className="stat-glow" aria-hidden />
      <div className="flex items-start justify-between">
        <div className="text-sm font-semibold text-muted">{label}</div>
        {icon && (
          <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
            {icon}
          </span>
        )}
      </div>
      <div className="stat-value mt-2 text-3xl font-extrabold">{numeric ? fa(value.toLocaleString("en-US")) : value}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </div>
  );
}

export function Empty({ title = "داده‌ای ثبت نشده", text, action }: { title?: string; text?: string; action?: ReactNode }) {
  return (
    <div className="glass-2 grid place-items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-brand">
        <Inbox size={26} />
      </span>
      <div className="font-bold">{title}</div>
      {text && <p className="m-0 max-w-md text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function Disabled({ text = "این بخش در حال حاضر در دسترس نیست." }: { text?: string }) {
  return (
    <div className="glass-2 grid place-items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--warn-bg)] text-warn">
        <Lock size={26} />
      </span>
      <div className="font-bold">غیرفعال</div>
      <p className="m-0 text-sm text-muted">{text}</p>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="m-0 text-lg font-extrabold">{children}</h2>
      {right}
    </div>
  );
}

export function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label="نمودار ستونی">
      {data.map((d) => (
        <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${fa(d.value)}`}>
          <span className="text-[11px] font-bold text-muted">{fa(d.value)}</span>
          <div className="bar w-full max-w-9 rounded-t-xl" style={{ height: `${Math.max(4, (d.value / max) * (height - 40))}px`, background: "linear-gradient(180deg, var(--brand-2), var(--brand))" }} />
          <span className="text-[11px] text-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "پیش‌نویس", cls: "badge" },
  published: { label: "منتشرشده", cls: "badge badge-ok" },
  archived: { label: "بایگانی", cls: "badge badge-warn" },
  active: { label: "فعال", cls: "badge badge-ok" },
  pending: { label: "در انتظار تأیید", cls: "badge badge-warn" },
  failed: { label: "ناموفق", cls: "badge badge-danger" },
  new: { label: "جدید", cls: "badge badge-info" },
  reviewed: { label: "بررسی‌شده", cls: "badge badge-ok" },
  closed: { label: "بسته", cls: "badge" },
  in_progress: { label: "در حال انجام", cls: "badge badge-info" },
  submitted: { label: "در انتظار تصحیح", cls: "badge badge-warn" },
  graded: { label: "تصحیح‌شده", cls: "badge badge-ok" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: "badge" };
  return <span className={s.cls}>{s.label}</span>;
}
