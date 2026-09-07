import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "bm-media";
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export const MEDIA_FOLDERS = [
  "courses",
  "trainers",
  "paths",
  "blog",
  "homepage",
  "testimonials",
  "site",
  "misc",
] as const;

export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

const EXTENSION_BY_MIME: Record<MediaMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export interface MediaMetadataRow {
  id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaReference {
  table: string;
  column: string;
  rowId: string;
}

export interface OrphanReport {
  metadataWithoutObjects: Array<{ id: string; storagePath: string }>;
  objectsWithoutMetadata: string[];
}

export type MediaValidationResult =
  | { ok: true; mimeType: MediaMimeType }
  | { ok: false; code: "invalid-mime" | "oversize" | "empty"; message: string };

export function validateMediaFile(
  file: Pick<File, "size" | "type">,
): MediaValidationResult {
  if (file.size <= 0) {
    return { ok: false, code: "empty", message: "الملف فارغ." };
  }
  if (!MEDIA_MIME_TYPES.includes(file.type as MediaMimeType)) {
    return { ok: false, code: "invalid-mime", message: "نوع الصورة غير مدعوم." };
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return { ok: false, code: "oversize", message: "حجم الصورة يتجاوز 10 MB." };
  }
  return { ok: true, mimeType: file.type as MediaMimeType };
}

export function createMediaStoragePath(
  folder: MediaFolder,
  mimeType: MediaMimeType,
  id = crypto.randomUUID(),
): string {
  return `${folder}/${id}.${EXTENSION_BY_MIME[mimeType]}`;
}

export function getMediaPublicUrl(client: SupabaseClient, storagePath: string): string {
  return client.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

const REFERENCE_COLUMNS = [
  ["courses", "image_path"],
  ["trainers", "image_path"],
  ["learning_paths", "image_path"],
  ["blog_posts", "cover_path"],
  ["homepage_hero", "image_path"],
  ["homepage_categories", "image_path"],
  ["homepage_accreditations", "logo_path"],
  ["homepage_partners", "logo_path"],
  ["homepage_cta", "background_image_path"],
  ["site_settings", "logo_dark_path"],
  ["site_settings", "logo_light_path"],
  ["site_settings", "favicon_path"],
  ["seo_settings", "og_image_path"],
  ["seo_settings", "social_image_path"],
] as const;

export async function findMediaReferences(
  client: SupabaseClient,
  storagePath: string,
): Promise<MediaReference[]> {
  const references: MediaReference[] = [];
  for (const [table, column] of REFERENCE_COLUMNS) {
    const { data, error } = await client.from(table).select("id").eq(column, storagePath);
    if (error) throw new Error(`تعذر فحص مراجع الوسائط في ${table}.${column}.`);
    for (const row of data ?? []) {
      const id = (row as { id: string | number }).id;
      references.push({ table, column, rowId: String(id) });
    }
  }

  const blogBlocks = await client
    .from("blog_content_blocks")
    .select("id,content")
    .eq("block_type", "image");
  if (blogBlocks.error) throw new Error("تعذر فحص مراجع صور كتل المقالات.");
  for (const row of blogBlocks.data ?? []) {
    const content = (row as { id: string; content: { image?: string } }).content;
    if (content.image === storagePath) {
      references.push({ table: "blog_content_blocks", column: "content.image", rowId: row.id });
    }
  }
  return references;
}

interface UploadMediaInput {
  file: File;
  folder: MediaFolder;
  altText: string;
  caption?: string;
  width?: number;
  height?: number;
}

export async function uploadMedia(
  client: SupabaseClient,
  input: UploadMediaInput,
): Promise<MediaMetadataRow> {
  const validation = validateMediaFile(input.file);
  if (!validation.ok) throw new Error(validation.message);

  const storagePath = createMediaStoragePath(input.folder, validation.mimeType);
  const upload = await client.storage.from(MEDIA_BUCKET).upload(storagePath, input.file, {
    contentType: validation.mimeType,
    upsert: false,
  });
  if (upload.error) throw new Error("تعذر رفع الصورة إلى Storage.");

  const metadata = await client
    .from("media")
    .insert({
      bucket: MEDIA_BUCKET,
      storage_path: storagePath,
      file_name: input.file.name,
      mime_type: validation.mimeType,
      size_bytes: input.file.size,
      alt_text: input.altText.trim(),
      caption: input.caption?.trim() || null,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .select("*")
    .single();

  if (metadata.error || !metadata.data) {
    const cleanup = await client.storage.from(MEDIA_BUCKET).remove([storagePath]);
    if (cleanup.error) {
      throw new Error("فشل حفظ metadata وفشل تنظيف object؛ يلزم تشغيل orphan scan.");
    }
    throw new Error("فشل حفظ metadata؛ تم تنظيف object المرفوع.");
  }

  return metadata.data as MediaMetadataRow;
}

export type DeleteMediaResult =
  | { ok: true }
  | { ok: false; reason: "referenced"; references: MediaReference[] }
  | { ok: false; reason: "object-delete-failed" | "metadata-delete-failed" };

export async function deleteMedia(
  client: SupabaseClient,
  mediaId: string,
): Promise<DeleteMediaResult> {
  const lookup = await client.from("media").select("*").eq("id", mediaId).single();
  if (lookup.error || !lookup.data) throw new Error("عنصر الوسائط غير موجود.");
  const row = lookup.data as MediaMetadataRow;

  const references = await findMediaReferences(client, row.storage_path);
  if (references.length) return { ok: false, reason: "referenced", references };

  const objectDelete = await client.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
  if (objectDelete.error) return { ok: false, reason: "object-delete-failed" };

  const metadataDelete = await client.from("media").delete().eq("id", mediaId);
  if (metadataDelete.error) {
    return { ok: false, reason: "metadata-delete-failed" };
  }
  return { ok: true };
}

interface ReplaceMediaInput extends Omit<UploadMediaInput, "altText"> {
  mediaId: string;
}

export interface ReplaceMediaResult {
  media: MediaMetadataRow;
  staleObjectPath?: string;
}

export async function replaceMedia(
  client: SupabaseClient,
  input: ReplaceMediaInput,
): Promise<ReplaceMediaResult> {
  const validation = validateMediaFile(input.file);
  if (!validation.ok) throw new Error(validation.message);

  const current = await client.from("media").select("*").eq("id", input.mediaId).single();
  if (current.error || !current.data) throw new Error("عنصر الوسائط غير موجود.");
  const oldRow = current.data as MediaMetadataRow;
  const newPath = createMediaStoragePath(input.folder, validation.mimeType);

  const upload = await client.storage.from(MEDIA_BUCKET).upload(newPath, input.file, {
    contentType: validation.mimeType,
    upsert: false,
  });
  if (upload.error) throw new Error("تعذر رفع الصورة البديلة.");

  const update = await client
    .from("media")
    .update({
      storage_path: newPath,
      file_name: input.file.name,
      mime_type: validation.mimeType,
      size_bytes: input.file.size,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .eq("id", input.mediaId)
    .select("*")
    .single();

  if (update.error || !update.data) {
    await client.storage.from(MEDIA_BUCKET).remove([newPath]);
    throw new Error("فشل تحديث metadata؛ تم الاحتفاظ بالصورة القديمة.");
  }

  const oldDelete = await client.storage.from(MEDIA_BUCKET).remove([oldRow.storage_path]);
  return {
    media: update.data as MediaMetadataRow,
    staleObjectPath: oldDelete.error ? oldRow.storage_path : undefined,
  };
}

export async function scanMediaOrphans(client: SupabaseClient): Promise<OrphanReport> {
  const metadata = await client.from("media").select("id,bucket,storage_path");
  if (metadata.error) throw new Error("تعذر قراءة media metadata.");

  const objectPaths: string[] = [];
  for (const folder of MEDIA_FOLDERS) {
    const listed = await client.storage.from(MEDIA_BUCKET).list(folder, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (listed.error) throw new Error(`تعذر فحص مجلد ${folder}.`);
    for (const object of listed.data ?? []) {
      if (object.name !== ".emptyFolderPlaceholder") {
        objectPaths.push(`${folder}/${object.name}`);
      }
    }
  }

  const rows = (metadata.data ?? []) as Array<{
    id: string;
    bucket: string;
    storage_path: string;
  }>;
  const metadataPaths = new Set(
    rows.filter((row) => row.bucket === MEDIA_BUCKET).map((row) => row.storage_path),
  );
  const objectPathSet = new Set(objectPaths);

  return {
    metadataWithoutObjects: rows
      .filter(
        (row) => row.bucket === MEDIA_BUCKET && !objectPathSet.has(row.storage_path),
      )
      .map((row) => ({ id: row.id, storagePath: row.storage_path })),
    objectsWithoutMetadata: objectPaths.filter((path) => !metadataPaths.has(path)),
  };
}
