import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }
  return createClient(url, key);
}

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "pickleball-images";
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: JPG, PNG, WebP";
  }
  if (file.size > MAX_SIZE) {
    return "File too large. Max 5MB";
  }
  return null;
}

export async function uploadImage(file: File, path: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteStorageFile(path: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket();
  await supabase.storage.from(bucket).remove([path]);
}
