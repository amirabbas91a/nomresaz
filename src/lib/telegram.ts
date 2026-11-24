export function isTelegramStorageConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function uploadToTelegram(file: File | Blob, filename: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set");
  }

  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", file, filename);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as { ok: boolean; result?: { document?: { file_id: string } }; description?: string };
  if (!data.ok || !data.result?.document?.file_id) {
    throw new Error(`Telegram upload failed: ${data.description || "Unknown error"}`);
  }

  return data.result.document.file_id;
}

export async function getTelegramFileStream(fileId: string): Promise<Response> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const fileInfo = (await fileInfoRes.json()) as { ok: boolean; result?: { file_path: string }; description?: string };
  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    throw new Error(`Failed to retrieve file info from Telegram: ${fileInfo.description || "Unknown error"}`);
  }

  const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download file from Telegram: ${fileRes.statusText}`);
  }

  return fileRes;
}
