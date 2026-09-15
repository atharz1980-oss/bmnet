"use client";

/**
 * MediaLibrary — مكتبة الوسائط (#17 — Mock)
 * ------------------------------------------
 * Grid/List + بحث (الاسم/النص البديل) + فلترة (المصدر) + ترتيب
 * (الأحدث/الأقدم/الاسم/الحجم) + تحرير بيانات + نسخ رابط Mock + حذف
 * بحماية المراجع: إن كانت الصورة مستخدمة في كيانات يُعرض تحذير يعدّد
 * المواضع قبل التأكيد (لا حذف صامت أبدًا).
 */
import { useMemo, useState } from "react";
import {
  Copy,
  ImageOff,
  Info,
  Pencil,
  Trash2,
} from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { MediaItem } from "@/data/admin/types";
import {
  getMediaEntityLabel,
  getMediaReferences,
  type MediaReferenceLocation,
} from "@/data/admin/selectors";
import { formatBytes, formatShortDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { MediaEditDialog } from "@/components/admin/media/media-edit-dialog";
import { CopyUrlDialog } from "@/components/admin/media/copy-url-dialog";

type ViewMode = "grid" | "list";
type SourceFilter = "all" | "seed" | "local-preview";
type SortKey = "newest" | "oldest" | "name" | "size";

function dimensionsLabel(item: MediaItem): string {
  return item.width && item.height ? `${item.width} × ${item.height}` : "—";
}

function AltStatus({ item }: { item: MediaItem }) {
  return item.altText.trim() ? (
    <Badge
      variant="outline"
      className="border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-50"
    >
      نص بديل مكتمل
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-charcoal-200 bg-surface text-charcoal-500 hover:bg-surface"
    >
      <ImageOff aria-hidden="true" className="me-1 h-3 w-3" />
      بلا نص بديل
    </Badge>
  );
}

function SourceBadge({ item }: { item: MediaItem }) {
  return item.source === "local-preview" ? (
    <Badge variant="outline" className="border-charcoal-200 bg-white text-charcoal-500">
      معاينة محلية
    </Badge>
  ) : (
    <Badge variant="outline" className="border-charcoal-200 bg-white text-charcoal-500">
      من النظام
    </Badge>
  );
}

function MediaActions({
  item,
  onEdit,
  onCopy,
  onRequestDelete,
}: {
  item: MediaItem;
  onEdit: (item: MediaItem) => void;
  onCopy: (item: MediaItem) => void;
  onRequestDelete: (item: MediaItem) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onEdit(item)}
        aria-label={`تحرير بيانات ${item.name}`}
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onCopy(item)}
        aria-label={`نسخ رابط ${item.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(item)}
        aria-label={`حذف ${item.name}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface MediaLibraryProps {
  items: MediaItem[];
  viewMode: ViewMode;
}

export function MediaLibrary({ items, viewMode }: MediaLibraryProps) {
  const data = useAdminData();
  const { updateMedia, deleteMedia } = useAdminActions();
  const { toast } = useToast();

  const [editTarget, setEditTarget] = useState<MediaItem | null>(null);
  const [copyTarget, setCopyTarget] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  /* حماية الحذف: فحص المراجع لحظة طلب الحذف — لا Architecture معقد */
  const deleteReferences = useMemo<MediaReferenceLocation[]>(
    () => (deleteTarget ? getMediaReferences(deleteTarget, data) : []),
    [deleteTarget, data],
  );

  async function handleSaveMetadata(id: string, patch: Pick<MediaItem, "altText" | "caption">) {
    const result = await updateMedia(id, { ...patch, updatedAt: new Date().toISOString() });
    if (result.ok) {
      toast({ title: "حُفظت البيانات الوصفية", description: "النص البديل والوصف محدثان." });
    } else {
      toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const result = await deleteMedia(target.id);
    if (result.ok) {
      toast({
        title: "حُذفت الصورة",
        description: "أُزيلت من المكتبة ومن التخزين — المواضع التي كانت تستخدمها ستعود إلى placeholder.",
      });
    } else {
      toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="لا صور مطابقة"
        description="لم يُعثر على صور بهذه الفلاتر — جرّب مسح البحث أو تغيير الفلتر."
      />
    );
  }

  return (
    <>
      {viewMode === "grid" ? (
        /* ── شبكة ── */
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-white"
            >
              <div className="aspect-video w-full overflow-hidden bg-surface">
                <img
                  src={item.previewUrl}
                  alt={item.altText || `معاينة ${item.name}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="truncate text-sm font-medium text-charcoal-800" title={item.name}>
                  {item.name}
                </p>
                <p className="flex items-center gap-2 text-xs text-charcoal-500">
                  <span className="num-ltr">{formatBytes(item.size)}</span>
                  <span aria-hidden="true" className="text-charcoal-300">·</span>
                  <span className="num-ltr">{dimensionsLabel(item)}</span>
                </p>
                <AltStatus item={item} />
                <p className="text-xs text-charcoal-400">
                  {formatShortDate(item.createdAt.slice(0, 10))}
                </p>
                <MediaActions
                  item={item}
                  onEdit={setEditTarget}
                  onCopy={setCopyTarget}
                  onRequestDelete={setDeleteTarget}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        /* ── قائمة ── */
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:h-16 sm:w-16">
                  <img
                    src={item.previewUrl}
                    alt={item.altText || `معاينة ${item.name}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal-800" title={item.name}>
                    {item.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-charcoal-500">
                    <span className="num-ltr">{formatBytes(item.size)}</span>
                    <span aria-hidden="true" className="text-charcoal-300">·</span>
                    <span className="num-ltr">{dimensionsLabel(item)}</span>
                    <span aria-hidden="true" className="text-charcoal-300">·</span>
                    <span>{formatShortDate(item.createdAt.slice(0, 10))}</span>
                    <span aria-hidden="true" className="text-charcoal-300">·</span>
                    <SourceBadge item={item} />
                  </p>
                </div>
                <div className="hidden sm:block">
                  <AltStatus item={item} />
                </div>
                <MediaActions
                  item={item}
                  onEdit={setEditTarget}
                  onCopy={setCopyTarget}
                  onRequestDelete={setDeleteTarget}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── حوارات ── */}
      <MediaEditDialog
        item={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSave={handleSaveMetadata}
      />

      <CopyUrlDialog
        url={copyTarget?.previewUrl ?? null}
        onOpenChange={(open) => {
          if (!open) setCopyTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteReferences.length > 0 ? `هذه الصورة مستخدمة في ${formatNumber(deleteReferences.length)} ${deleteReferences.length === 1 ? "موضع" : "مواضع"}` : "حذف الصورة"}
        description={
          deleteTarget
            ? deleteReferences.length > 0
              ? `سيتم حذف «${deleteTarget.name}» من المكتبة. المواضع المرتبطة ستفقد الصورة وتعود إلى placeholder حتى تحديثها: ${deleteReferences
                  .slice(0, 6)
                  .map((ref) => `${getMediaEntityLabel(ref.entityType)} «${ref.label}» — ${ref.detail}`)
                  .join("، ")}${deleteReferences.length > 6 ? " وغيرها" : ""}.`
              : `سيتم حذف «${deleteTarget.name}» من المكتبة نهائيًا. لا يمكن التراجع.`
            : ""
        }
        confirmLabel={deleteReferences.length > 0 ? "حذف رغم المراجع" : "حذف نهائي"}
        onConfirm={handleConfirmDelete}
      />

      {/* تنبيه المراجع داخل الحوار يظهر في الوصف — وملاحظة توضيحية ثابتة */}
      <p className={cn("mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground", deleteTarget && "hidden")}>
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        حذف صورة مستخدمة في الدورات أو الرئيسية أو المقالات يعرض تحذيرًا يعدّد المواضع قبل التأكيد.
      </p>
    </>
  );
}
