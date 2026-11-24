// Jalali (Persian) calendar helpers. Dates are stored as UTC timestamps; Jalali is for display/input only.
const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < bl; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}
export function gregorianToJalali(gy: number, gm: number, gd: number) {
  return d2j(g2d(gy, gm, gd));
}
export function isJalaliLeap(jy: number) {
  return jalCal(jy).leap === 0;
}
export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

type TehranParts = { y: number; m: number; d: number; h: number; mi: number; weekday: number };

export function tehranParts(date: Date): TehranParts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(date)) if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  const { jy, jm, jd } = gregorianToJalali(p.year, p.month, p.day);
  void jy; void jm; void jd;
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = Sunday
  return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, mi: p.minute, weekday: (wd + 1) % 7 };
}

export function toJalali(date: Date) {
  const t = tehranParts(date);
  const j = gregorianToJalali(t.y, t.m, t.d);
  return { ...j, h: t.h, mi: t.mi, weekday: t.weekday };
}

/** Build a Date from Jalali Y/M/D and time, interpreted in Asia/Tehran (UTC+03:30, no DST). */
export function jalaliToDate(jy: number, jm: number, jd: number, h = 0, mi = 0) {
  const g = toGregorian(jy, jm, jd);
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${g.gy}-${pad(g.gm)}-${pad(g.gd)}T${pad(h)}:${pad(mi)}:00+03:30`);
}

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
export function fa(n: number | string | null | undefined) {
  if (n === null || n === undefined) return "";
  return String(n).replace(/\d/g, (d) => faDigits[+d]);
}

export function formatJalali(date: Date | string | null | undefined, withTime = false) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const j = toJalali(d);
  const base = `${fa(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${fa(j.jy)}`;
  if (!withTime) return base;
  return `${base}، ${fa(String(j.h).padStart(2, "0"))}:${fa(String(j.mi).padStart(2, "0"))}`;
}

export function todayJalaliString() {
  const j = toJalali(new Date());
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
}

export function formatJalaliString(s: string) {
  const m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return s;
  return `${fa(+m[3])} ${JALALI_MONTHS[+m[2] - 1] ?? ""} ${fa(m[1])}`;
}
