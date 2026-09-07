"use client";

/**
 * محررات القوائم في الصفحة الرئيسية — الإحصائيات، لماذا نحن، الاعتمادات/الشركاء
 * ------------------------------------------------------------------------------
 * Repeater بأزرار ↑↓ فقط (بدون drag & drop — قرار D-05)، وDelete عبر
 * ConfirmDialog حيث يلزم. الاعتمادات والشركاء يتشاركان مكوّنًا واحدًا
 * (OrganizationEntry — نفس الشكل في نموذج البيانات).
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import type {
  OrganizationEntry,
  StatEntry,
  WhyUsItem,
} from "@/data/admin/types";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WHY_US_ICONS, whyUsIcon } from "./why-us-icons";

/** زر ترتيب صغير مشترك */
function MoveButtons({
  index,
  count,
  onMove,
  labelPrefix,
}: {
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
  labelPrefix: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500"
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        aria-label={`نقل ${labelPrefix} ${index + 1} للأعلى`}
      >
        <ArrowUp aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500"
        onClick={() => onMove(index, 1)}
        disabled={index === count - 1}
        aria-label={`نقل ${labelPrefix} ${index + 1} للأسفل`}
      >
        <ArrowDown aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ─────────────────────────── الإحصائيات ─────────────────────────── */

interface StatisticsEditorProps {
  statistics: StatEntry[];
  onChange: (statistics: StatEntry[]) => void;
}

export function StatisticsEditor({ statistics, onChange }: StatisticsEditorProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleting = statistics.find((stat) => stat.id === deleteId);

  function addStat() {
    onChange([
      ...statistics,
      { id: `stat-local-${Date.now().toString(36)}-${statistics.length}`, label: "", value: 0, suffix: "", enabled: true },
    ]);
  }

  function update(id: string, patch: Partial<StatEntry>) {
    onChange(statistics.map((stat) => (stat.id === id ? { ...stat, ...patch } : stat)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= statistics.length) return;
    const next = [...statistics];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        كل عنصر: الرقم + بادئة/لاحقة اختيارية + التسمية. مثال: بادئة «+» وقيمة 4500
        وتسمية «متدرب» تظهر «+4,500 متدرب».
      </p>

      <ul className="space-y-3">
        {statistics.map((stat, index) => {
          return (
            <li
              key={stat.id}
              className="rounded-xl border border-border bg-white p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
                >
                  {index + 1}
                </span>

                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[80px_80px_1fr]">
                  <Field id={`stat-prefix-${stat.id}`} label="البادئة" compact>
                    <Input
                      id={`stat-prefix-${stat.id}`}
                      value={stat.prefix ?? ""}
                      onChange={(event) => update(stat.id, { prefix: event.target.value })}
                      placeholder="＋"
                      className="num-ltr"
                      aria-label={`بادئة الإحصائية ${index + 1}`}
                    />
                  </Field>
                  <Field id={`stat-value-${stat.id}`} label="القيمة" compact>
                    <Input
                      id={`stat-value-${stat.id}`}
                      type="number"
                      min={0}
                      value={stat.value}
                      onChange={(event) =>
                        update(stat.id, { value: Math.max(0, Number(event.target.value) || 0) })
                      }
                      className="num-ltr"
                      aria-label={`قيمة الإحصائية ${index + 1}`}
                    />
                  </Field>
                  <Field id={`stat-label-${stat.id}`} label="التسمية" compact>
                    <Input
                      id={`stat-label-${stat.id}`}
                      value={stat.label}
                      onChange={(event) => update(stat.id, { label: event.target.value })}
                      placeholder="متدرب"
                      aria-label={`تسمية الإحصائية ${index + 1}`}
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-charcoal-600">
                    <Switch
                      checked={stat.enabled}
                      onCheckedChange={(checked) => update(stat.id, { enabled: checked })}
                      aria-label={`تفعيل الإحصائية ${index + 1}`}
                    />
                    مُعرَض
                  </label>
                  <MoveButtons
                    index={index}
                    count={statistics.length}
                    onMove={move}
                    labelPrefix="الإحصائية"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                    onClick={() => setDeleteId(stat.id)}
                    aria-label={`حذف الإحصائية ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={addStat}>
        <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
        إضافة إحصائية
      </Button>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="حذف الإحصائية؟"
        description={
          deleting
            ? `سيُحذف «${deleting.prefix ?? ""}${deleting.value} ${deleting.label}» من شريط الإحصائيات. يمكن التراجع بإلغاء الحفظ قبل اعتماد التغييرات.`
            : ""
        }
        confirmLabel="حذف"
        destructive
        onConfirm={() => {
          if (deleteId) onChange(statistics.filter((stat) => stat.id !== deleteId));
          setDeleteId(null);
        }}
      />
    </div>
  );
}

/* ─────────────────────────── لماذا نحن ─────────────────────────── */

interface WhyUsItemsEditorProps {
  items: WhyUsItem[];
  onChange: (items: WhyUsItem[]) => void;
}

export function WhyUsItemsEditor({ items, onChange }: WhyUsItemsEditorProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleting = items.find((item) => item.id === deleteId);

  function add() {
    onChange([
      ...items,
      { id: `why-local-${Date.now().toString(36)}-${items.length}`, title: "", description: "", enabled: true },
    ]);
  }

  function update(id: string, patch: Partial<WhyUsItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item, index) => {
          const Icon = whyUsIcon(item.iconKey);
          return (
            <li key={item.id} className="rounded-xl border border-border bg-white p-3 sm:p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
                >
                  {index + 1}
                </span>

                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Field id={`why-title-${item.id}`} label="العنوان" compact>
                    <Input
                      id={`why-title-${item.id}`}
                      value={item.title}
                      onChange={(event) => update(item.id, { title: event.target.value })}
                      aria-label={`عنوان الميزة ${index + 1}`}
                    />
                  </Field>
                  <Field
                    id={`why-icon-${item.id}`}
                    label="الأيقونة"
                    compact
                    hint="مفاتيح معروفة فقط — لا رفع SVG"
                  >
                    <Select
                      value={item.iconKey ?? "none"}
                      onValueChange={(value) =>
                        update(item.id, { iconKey: value === "none" ? undefined : value })
                      }
                    >
                      <SelectTrigger id={`why-icon-${item.id}`} aria-label={`أيقونة الميزة ${index + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بلا أيقونة</SelectItem>
                        {WHY_US_ICONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            <span className="flex items-center gap-2">
                              <option.icon aria-hidden="true" className="h-4 w-4" />
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-charcoal-600">
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) => update(item.id, { enabled: checked })}
                      aria-label={`تفعيل الميزة ${index + 1}`}
                    />
                    مُعرَض
                  </label>
                  <MoveButtons index={index} count={items.length} onMove={move} labelPrefix="الميزة" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                    onClick={() => setDeleteId(item.id)}
                    aria-label={`حذف الميزة ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Field
                id={`why-desc-${item.id}`}
                label="الوصف"
                compact
                className="mt-3"
              >
                <Textarea
                  id={`why-desc-${item.id}`}
                  value={item.description}
                  onChange={(event) => update(item.id, { description: event.target.value })}
                  rows={2}
                  aria-label={`وصف الميزة ${index + 1}`}
                />
              </Field>

              {/* معاينة مصغرة بنفس لغة التصميم */}
              {Icon ? (
                <span
                  aria-hidden="true"
                  className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
        إضافة ميزة
      </Button>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="حذف الميزة؟"
        description={
          deleting ? `سيُحذف «${deleting.title || "عنصر بلا عنوان"}» من قسم لماذا نحن.` : ""
        }
        confirmLabel="حذف"
        destructive
        onConfirm={() => {
          if (deleteId) onChange(items.filter((item) => item.id !== deleteId));
          setDeleteId(null);
        }}
      />
    </div>
  );
}

/* ─────────────── الاعتمادات / الشركاء (نفس الشكل) ─────────────── */

interface OrganizationsEditorProps {
  organizations: OrganizationEntry[];
  onChange: (organizations: OrganizationEntry[]) => void;
  kindLabel: string;
  /** الشركاء يسمح بوصف قصير — الاعتمادات لا */
  withDescription?: boolean;
}

export function OrganizationsEditor({
  organizations,
  onChange,
  kindLabel,
  withDescription = false,
}: OrganizationsEditorProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleting = organizations.find((org) => org.id === deleteId);

  function add() {
    onChange([
      ...organizations,
      {
        id: `org-local-${Date.now().toString(36)}-${organizations.length}`,
        name: "",
        logo: "",
        order: organizations.length + 1,
        visible: true,
      },
    ]);
  }

  function update(id: string, patch: Partial<OrganizationEntry>) {
    onChange(organizations.map((org) => (org.id === id ? { ...org, ...patch } : org)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= organizations.length) return;
    const next = [...organizations];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        الشعارات Placeholder في هذه المرحلة — لا تُضاف شعارات حقيقية من الإنترنت.
        إن غاب الشعار يُعرض البديل النصي الحالي.
      </p>

      <ul className="space-y-3">
        {organizations.map((org, index) => (
          <li key={org.id} className="rounded-xl border border-border bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
              >
                {index + 1}
              </span>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <Field id={`org-name-${org.id}`} label="الاسم" compact required>
                  <Input
                    id={`org-name-${org.id}`}
                    value={org.name}
                    onChange={(event) => update(org.id, { name: event.target.value })}
                    aria-label={`اسم ${kindLabel} ${index + 1}`}
                  />
                </Field>
                <Field id={`org-url-${org.id}`} label="الرابط" compact>
                  <Input
                    id={`org-url-${org.id}`}
                    value={org.url ?? ""}
                    dir="ltr"
                    className="font-latin"
                    onChange={(event) => update(org.id, { url: event.target.value })}
                    placeholder="https://…"
                    aria-label={`رابط ${kindLabel} ${index + 1}`}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-charcoal-600">
                  <Switch
                    checked={org.visible}
                    onCheckedChange={(checked) => update(org.id, { visible: checked })}
                    aria-label={`إظهار ${kindLabel} ${index + 1}`}
                  />
                  ظاهر
                </label>
                <MoveButtons index={index} count={organizations.length} onMove={move} labelPrefix={kindLabel} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => setDeleteId(org.id)}
                  aria-label={`حذف ${kindLabel} ${index + 1}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
              <ImageUpload
                id={`org-logo-${org.id}`}
                label="الشعار"
                value={org.logo}
                alt={org.name}
                withAlt={false}
                aspect="square"
                onChange={({ value }) => update(org.id, { logo: value })}
                hint="رفع تجريبي — معاينة محلية فقط."
              />
              {withDescription ? (
                <Field id={`org-desc-${org.id}`} label="وصف قصير">
                  <Textarea
                    id={`org-desc-${org.id}`}
                    value={org.description ?? ""}
                    onChange={(event) => update(org.id, { description: event.target.value })}
                    rows={2}
                    aria-label={`وصف ${kindLabel} ${index + 1}`}
                  />
                </Field>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
        إضافة {kindLabel}
      </Button>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`حذف ${kindLabel}؟`}
        description={deleting ? `سيُحذف «${deleting.name || "عنصر بلا اسم"}» من القائمة.` : ""}
        confirmLabel="حذف"
        destructive
        onConfirm={() => {
          if (deleteId) onChange(organizations.filter((org) => org.id !== deleteId));
          setDeleteId(null);
        }}
      />
    </div>
  );
}
