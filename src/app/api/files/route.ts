import { db } from "@/db";
import { files } from "@/db/schema";
import { handler, HttpError, needUser, rateLimit } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isTelegramStorageConfigured, uploadToTelegram } from "@/lib/telegram";

const MAX_FILE = 20 * 1024 * 1024; // Vercel limit / Telegram supports up to 50MB, but client upload can be larger with Telegram

const ALLOWED: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/msword": ["doc"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "text/plain": ["txt"],
  "video/mp4": ["mp4"],
  "audio/webm": ["webm"],
  "audio/mpeg": ["mp3"],
  "audio/mp4": ["m4a", "mp4"],
  "audio/wav": ["wav"],
  "audio/ogg": ["ogg"],
};

function magicOk(mime: string, b: Buffer) {
  if (mime === "application/pdf") return b.subarray(0, 4).toString() === "%PDF";
  if (mime === "image/png") return b[0] === 0x89 && b.subarray(1, 4).toString() === "PNG";
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (mime === "image/gif") return b.subarray(0, 3).toString() === "GIF";
  if (mime === "image/webp") return b.subarray(8, 12).toString() === "WEBP";
  if (mime.includes("openxmlformats")) return b[0] === 0x50 && b[1] === 0x4b;
  return true;
}

export const POST = handler(async (req) => {
  const user = await needUser();
  rateLimit(`upload:${user.id}`, 40, 10 * 60_000);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "فایلی ارسال نشده است.");
  if (file.size === 0) throw new HttpError(400, "فایل خالی است.");
  if (file.size > MAX_FILE) throw new HttpError(413, "حجم فایل بیش از ۲۰ مگابایت است.");
  const mime = file.type.split(";")[0];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = ALLOWED[mime];
  if (!allowedExt || !allowedExt.includes(ext)) throw new HttpError(415, "نوع فایل مجاز نیست.");
  const isAdmin = user.permissions.length > 0;
  const isMedia = mime.startsWith("image/") || mime.startsWith("audio/");
  if (!isAdmin && !isMedia) throw new HttpError(403, "دانش‌آموزان فقط می‌توانند تصویر یا صدا بارگذاری کنند.");
  const data = Buffer.from(await file.arrayBuffer());
  if (!magicOk(mime, data)) throw new HttpError(415, "محتوای فایل با نوع اعلام‌شده مطابقت ندارد.");
  const makePublic = isAdmin && form.get("public") === "1" && mime.startsWith("image/");

  let telegramFileId: string | null = null;
  let fileBufferToStore: Buffer | null = data;

  if (isTelegramStorageConfigured()) {
    try {
      telegramFileId = await uploadToTelegram(file, file.name);
      fileBufferToStore = null; // Do not bloat Postgres if Telegram storage succeeded
    } catch (err) {
      console.error("Failed to upload to Telegram, falling back to database buffer:", err);
      fileBufferToStore = data;
    }
  }

  const [row] = await db
    .insert(files)
    .values({
      name: file.name.slice(0, 200),
      mime,
      size: file.size,
      data: fileBufferToStore,
      telegramFileId,
      ownerId: user.id,
      isPublic: makePublic,
    })
    .returning({ id: files.id, name: files.name, size: files.size, mime: files.mime });

  await logAudit({ user, action: "file.upload", entity: "files", entityId: row.id });
  return { file: row, url: `/api/files/${row.id}` };
});
