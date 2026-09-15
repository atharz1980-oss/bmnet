"use client";

/**
 * BlogBlocksEditor — محرر كتل محتوى المقال (المهمة #15)
 * -------------------------------------------------------
 * Structured Editor بسيط بلا Rich Text Editor ولا HTML خام (قرار D-24):
 * أنواع الكتل: paragraph / heading / image / quote / list.
 * كل كتلة: id + type + محتوى — والترتيب موقعها في المصفوفة.
 * إضافة / حذف (بتأكيد) / ترتيب ↑↓ — بلا Dependencies جديدة.
 */
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Heading2,
  ImagePlus,
  List,
  Plus,
  Quote,
  Text,
  Trash2,
} from "lucide-react";

import type { BlogBlockType, BlogContentBlock } from "@/data/admin/types";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const BLOCK_TYPE_META: Record<
  BlogBlockType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  paragraph: { label: "فقرة", icon: Text },
  heading: { label: "عنوان فرعي", icon: Heading2 },
  image: { label: "صورة", icon: ImagePlus },
  quote: { label: "اقتباس", icon: Quote },
  list: { label: "قائمة نقطية", icon: List },
};

function newBlock(type: BlogBlockType, index: number): BlogContentBlock {
  const id = `block-local-${Date.now().toString(36)}-${index}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  switch (type) {
    case "paragraph":
    case "heading":
    case "quote":
      return { id, type, text: "" };
    case "list":
      return { id, type, items: [""] };
    case "image":
      return { id, type, image: "", imageAlt: "" };
  }
}

interface BlogBlocksEditorProps {
  blocks: BlogContentBlock[];
  onChange: (blocks: BlogContentBlock[]) => void;
}

export function BlogBlocksEditor({ blocks, onChange }: BlogBlocksEditorProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleting = blocks.find((block) => block.id === deleteId);

  function addBlock(type: BlogBlockType) {
    onChange([...blocks, newBlock(type, blocks.length)]);
  }

  function update(id: string, patch: Partial<BlogContentBlock>) {
    onChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {blocks.map((block, index) => {
          const meta = BLOCK_TYPE_META[block.type];
          const Icon = meta.icon;
          return (
            <li
              key={block.id}
              className={cn(
                "rounded-xl border border-border bg-white p-3 sm:p-4",
                block.type === "quote" && "bg-surface/40",
              )}
            >
              {/* رأس الكتلة: النوع + الترتيب + الحذف */}
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
                >
                  {index + 1}
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-charcoal-600">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {meta.label}
                </span>

                <div className="ms-auto flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`نقل ${meta.label} ${index + 1} للأعلى`}
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                    onClick={() => move(index, 1)}
                    disabled={index === blocks.length - 1}
                    aria-label={`نقل ${meta.label} ${index + 1} للأسفل`}
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 lg:h-8 lg:w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                    onClick={() => setDeleteId(block.id)}
                    aria-label={`حذف ${meta.label} ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* محتوى الكتلة حسب نوعها */}
              {block.type === "paragraph" ? (
                <Textarea
                  value={block.text ?? ""}
                  onChange={(event) => update(block.id, { text: event.target.value })}
                  rows={3}
                  placeholder="نص الفقرة…"
                  aria-label={`نص الفقرة ${index + 1}`}
                />
              ) : null}

              {block.type === "heading" ? (
                <Input
                  value={block.text ?? ""}
                  onChange={(event) => update(block.id, { text: event.target.value })}
                  placeholder="عنوان فرعي داخل المقال…"
                  aria-label={`العنوان الفرعي ${index + 1}`}
                  className="text-base font-semibold"
                />
              ) : null}

              {block.type === "quote" ? (
                <Textarea
                  value={block.text ?? ""}
                  onChange={(event) => update(block.id, { text: event.target.value })}
                  rows={2}
                  placeholder="نص الاقتباس…"
                  aria-label={`نص الاقتباس ${index + 1}`}
                  className="border-brand-200 bg-white"
                />
              ) : null}

              {block.type === "image" ? (
                <ImageUpload
              folder="blog"
                  id={`block-image-${block.id}`}
                  label="صورة داخل المقال"
                  value={block.image ?? ""}
                  alt={block.imageAlt ?? ""}
                  aspect="video"
                  onChange={({ value, alt }) =>
                    update(block.id, { image: value, imageAlt: alt })
                  }
                  hint="رفع تجريبي — معاينة محلية فقط، ولا يُخزَّن Object URL."
                />
              ) : null}

              {block.type === "list" ? (
                <div className="space-y-2">
                  {(block.items ?? []).map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-charcoal-300"
                      />
                      <Input
                        value={item}
                        onChange={(event) =>
                          update(block.id, {
                            items: (block.items ?? []).map((entry, i) =>
                              i === itemIndex ? event.target.value : entry,
                            ),
                          })
                        }
                        placeholder={`عنصر القائمة ${itemIndex + 1}…`}
                        aria-label={`عنصر القائمة ${index + 1}-${itemIndex + 1}`}
                        className="bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 lg:h-8 lg:w-8 shrink-0 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                        onClick={() =>
                          update(block.id, {
                            items: (block.items ?? []).filter((_, i) => i !== itemIndex),
                          })
                        }
                        aria-label={`حذف العنصر ${itemIndex + 1} من القائمة ${index + 1}`}
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => update(block.id, { items: [...(block.items ?? []), ""] })}
                  >
                    <Plus aria-hidden="true" className="me-1.5 h-3.5 w-3.5" />
                    إضافة عنصر
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* إضافة كتلة */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            إضافة كتلة
            <ChevronDown aria-hidden="true" className="ms-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(Object.keys(BLOCK_TYPE_META) as BlogBlockType[]).map((type) => {
            const meta = BLOCK_TYPE_META[type];
            const ItemIcon = meta.icon;
            return (
              <DropdownMenuItem key={type} onClick={() => addBlock(type)}>
                <ItemIcon className="me-2 h-4 w-4" aria-hidden="true" />
                {meta.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-charcoal-200 p-4 text-center text-xs text-muted-foreground">
          لا كتل محتوى بعد — أضف أول كتلة (فقرة، عنوان، صورة، اقتباس أو قائمة).
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="حذف الكتلة؟"
        description={
          deleting
            ? `سيُحذف ${BLOCK_TYPE_META[deleting.type].label} من محتوى المقال. يمكن التراجع بإلغاء الحفظ قبل اعتماد التغييرات.`
            : ""
        }
        confirmLabel="حذف"
        destructive
        onConfirm={() => {
          if (deleteId) onChange(blocks.filter((block) => block.id !== deleteId));
          setDeleteId(null);
        }}
      />
    </div>
  );
}
