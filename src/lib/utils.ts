export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function normalizeFa(s: string) {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c{2,}/g, "\u200c")
    .replace(/[ \t]+$/gm, "")
    .replace(/ {2,}/g, " ")
    .replace(/ ([،؛:؟!.])/g, "$1")
    .replace(/(^|\s)(می|نمی) (?=[\u0600-\u06FF])/g, "$1$2\u200c")
    .trim();
}

export function fileSizeLabel(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function slugify(s: string) {
  const base = s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `page-${Date.now().toString(36)}`;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
