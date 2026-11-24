import { z } from "zod";
import type { ExamQuestion } from "@/db/schema";
import { normalizeFa } from "./utils";

export const questionSchema = z.object({
  id: z.string().min(1).max(30),
  type: z.enum(["mcq", "tf", "blank", "short", "essay", "multi"]),
  text: z.string().trim().min(1, "متن سؤال خالی است.").max(2000),
  options: z.array(z.string().trim().max(500)).max(8).optional(),
  correct: z.union([z.number(), z.array(z.number()), z.boolean(), z.string().max(500)]).optional(),
  marks: z.number().min(0).max(100),
  explanation: z.string().max(2000).optional(),
});

export const examSchema = z.object({
  title: z.string().trim().min(2, "عنوان آزمون را وارد کنید.").max(200),
  description: z.string().max(3000).nullable().optional(),
  subjectId: z.number().int().positive().nullable().optional(),
  chapter: z.string().max(200).nullable().optional(),
  durationMin: z.number().int().min(1).max(300),
  maxAttempts: z.number().int().min(1).max(10),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  showResult: z.boolean(),
  awardPoints: z.number().int().min(0).max(1000),
  status: z.enum(["draft", "published", "archived"]),
  questions: z.array(questionSchema).max(100, "حداکثر ۱۰۰ سؤال مجاز است."),
});

/** Returns an error message if the exam cannot be published. */
export function publishProblem(questions: ExamQuestion[]) {
  if (questions.length === 0) return "آزمون بدون سؤال قابل انتشار نیست.";
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    if (q.type === "mcq" || q.type === "multi") {
      if (!q.options || q.options.filter((o) => o.trim()).length < 2) return `سؤال ${n}: حداقل دو گزینه لازم است.`;
      if (q.type === "mcq" && (typeof q.correct !== "number" || q.correct < 0 || q.correct >= q.options.length)) return `سؤال ${n}: گزینه صحیح مشخص نشده است.`;
      if (q.type === "multi" && (!Array.isArray(q.correct) || q.correct.length === 0)) return `سؤال ${n}: پاسخ‌های صحیح مشخص نشده‌اند.`;
    }
    if (q.type === "tf" && typeof q.correct !== "boolean") return `سؤال ${n}: پاسخ درست/نادرست مشخص نشده است.`;
    if ((q.type === "blank" || q.type === "short") && (typeof q.correct !== "string" || !q.correct.trim())) return `سؤال ${n}: پاسخ صحیح مشخص نشده است.`;
  }
  return null;
}

const norm = (s: string) => normalizeFa(s).toLowerCase().replace(/[\s\u200c]+/g, "");

/** Returns score (null = needs manual grading). */
export function gradeQuestion(q: ExamQuestion, answer: unknown): number | null {
  switch (q.type) {
    case "mcq":
      return typeof answer === "number" && answer === q.correct ? q.marks : 0;
    case "tf":
      return typeof answer === "boolean" && answer === q.correct ? q.marks : 0;
    case "multi": {
      if (!Array.isArray(answer) || !Array.isArray(q.correct)) return 0;
      const a = [...new Set(answer as number[])].sort().join(",");
      const c = [...new Set(q.correct)].sort().join(",");
      return a === c ? q.marks : 0;
    }
    case "blank":
    case "short": {
      if (typeof answer !== "string" || !answer.trim() || typeof q.correct !== "string") return 0;
      const ok = q.correct.split("|").some((c) => norm(c) === norm(answer));
      return ok ? q.marks : 0;
    }
    case "essay":
      return null;
  }
}

export function computeAttempt(questions: ExamQuestion[], answers: Record<string, unknown>, manual: Record<string, number>) {
  let score = 0;
  let max = 0;
  let pending = false;
  const detail: Record<string, number | null> = {};
  for (const q of questions) {
    max += q.marks;
    const g = gradeQuestion(q, answers[q.id]);
    if (g === null) {
      const m = manual[q.id];
      if (m === undefined) {
        pending = !!(answers[q.id] && String(answers[q.id]).trim()) ? true : pending;
        detail[q.id] = null;
        // unanswered essays count as 0 and don't block grading
        if (!(answers[q.id] && String(answers[q.id]).trim())) detail[q.id] = 0;
      } else {
        const v = Math.max(0, Math.min(q.marks, m));
        score += v;
        detail[q.id] = v;
      }
    } else {
      score += g;
      detail[q.id] = g;
    }
  }
  return { score, max, pending, detail };
}

export function stripAnswers(questions: ExamQuestion[]) {
  return questions.map((q) => ({ id: q.id, type: q.type, text: q.text, options: q.options, marks: q.marks }));
}

export const QUESTION_TYPES: Record<string, string> = {
  mcq: "چهارگزینه‌ای",
  tf: "درست / نادرست",
  blank: "جای خالی",
  short: "پاسخ کوتاه",
  essay: "تشریحی",
  multi: "چندپاسخی",
};
