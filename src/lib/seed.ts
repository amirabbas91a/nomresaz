import { count } from "drizzle-orm";
import { db } from "@/db";
import { roles, subjects } from "@/db/schema";
import { DEFAULT_ROLES } from "./permissions";

// Initial editable data. Everything here can be changed from the admin panel.
const INITIAL_SUBJECTS: { name: string; teacher: string | null }[] = [
  { name: "فارسی", teacher: "استاد قاسمی" },
  { name: "ریاضی", teacher: null },
  { name: "علوم تجربی", teacher: "استاد صادقی" },
  { name: "مطالعات اجتماعی", teacher: null },
  { name: "عربی", teacher: null },
  { name: "زبان انگلیسی", teacher: null },
  { name: "پیام‌های آسمان", teacher: "آقای آبادی" },
  { name: "قرآن", teacher: null },
  { name: "آمادگی دفاعی", teacher: null },
  { name: "کار و فناوری", teacher: null },
  { name: "نگارش", teacher: "استاد صابری" },
  { name: "فن بیان", teacher: "آقای عابدی" },
  { name: "کمک‌های اولیه", teacher: "آقای جباری" },
  { name: "مشاوره", teacher: "آقای عاطفی‌پور" },
];

const g = globalThis as typeof globalThis & { __nmSeeded?: Promise<void> };

export function ensureSeed() {
  if (!g.__nmSeeded) {
    g.__nmSeeded = (async () => {
      await db.insert(roles).values(DEFAULT_ROLES).onConflictDoNothing();
      const [{ n }] = await db.select({ n: count() }).from(subjects);
      if (n === 0) {
        await db.insert(subjects).values(INITIAL_SUBJECTS.map((s, i) => ({ ...s, sortOrder: i + 1 })));
      }
    })().catch((e) => {
      g.__nmSeeded = undefined;
      throw e;
    });
  }
  return g.__nmSeeded;
}
