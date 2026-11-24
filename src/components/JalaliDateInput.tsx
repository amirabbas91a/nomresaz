"use client";
import { useMemo } from "react";
import { JALALI_MONTHS, fa, jalaliMonthLength, jalaliToDate, toJalali } from "@/lib/jalali";

/** Jalali date(+time) picker. value/onChange use ISO strings (UTC); input interpreted as Asia/Tehran time. */
export function JalaliDateInput({
  value,
  onChange,
  withTime = false,
  label,
  clearable = true,
}: {
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  withTime?: boolean;
  label?: string;
  clearable?: boolean;
}) {
  const nowJ = useMemo(() => toJalali(new Date()), []);
  const cur = value ? toJalali(new Date(value)) : null;
  const years = useMemo(() => Array.from({ length: 8 }, (_, i) => nowJ.jy - 2 + i), [nowJ.jy]);
  const jy = cur?.jy ?? nowJ.jy;
  const jm = cur?.jm ?? nowJ.jm;
  const jd = cur?.jd ?? nowJ.jd;
  const h = cur?.h ?? 8;
  const mi = cur?.mi ?? 0;

  const emit = (y: number, m: number, d: number, hh: number, mm: number) => {
    const day = Math.min(d, jalaliMonthLength(y, m));
    onChange(jalaliToDate(y, m, day, withTime ? hh : 0, withTime ? mm : 0).toISOString());
  };
  const yearsAll = years.includes(jy) ? years : [jy, ...years];

  return (
    <div role="group" aria-label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input !w-auto min-w-[78px] flex-1" aria-label="روز" value={cur ? jd : ""} onChange={(e) => emit(jy, jm, +e.target.value, h, mi)}>
          {!cur && <option value="">روز</option>}
          {Array.from({ length: jalaliMonthLength(jy, jm) }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{fa(d)}</option>
          ))}
        </select>
        <select className="input !w-auto min-w-[110px] flex-[1.4]" aria-label="ماه" value={cur ? jm : ""} onChange={(e) => emit(jy, +e.target.value, jd, h, mi)}>
          {!cur && <option value="">ماه</option>}
          {JALALI_MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select className="input !w-auto min-w-[88px] flex-1" aria-label="سال" value={cur ? jy : ""} onChange={(e) => emit(+e.target.value, jm, jd, h, mi)}>
          {!cur && <option value="">سال</option>}
          {yearsAll.map((y) => (
            <option key={y} value={y}>{fa(y)}</option>
          ))}
        </select>
        {withTime && (
          <input type="time" className="input !w-auto ltr" aria-label="ساعت" value={`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`} onChange={(e) => {
            const [hh, mm] = e.target.value.split(":").map(Number);
            emit(jy, jm, jd, hh || 0, mm || 0);
          }} />
        )}
        {clearable && cur && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>پاک‌کردن</button>
        )}
      </div>
    </div>
  );
}
