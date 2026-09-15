"use client";

/**
 * SessionsTab — إدارة مواعيد الدورة (المهمة #11)
 * ------------------------------------------------
 * Course ≠ CourseSession: الدورة ثابتة وكل موعد دفعة مستقلة
 * (Capacity/Registered/Remaining — والـ Remaining محسوب فقط، D-09).
 * - عرض مرتب بأقرب تاريخ بداية (الترتيب الزمني منطقي — لا إعادة ترتيب يدوية).
 * - الحالة المعروضة مشتقة (Derived Status): اكتمال المقاعد يعرض «ممتلئة»
 *   دون تغيير الحالة المخزنة تلقائيًا.
 * - العمليات: إضافة / تعديل / حذف (بتأكيد) / تكرار.
 */
import { useState } from "react";
import { CalendarClock, Copy, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";

import type { CourseSession } from "@/data/admin/types";
import type { CourseInput } from "@/context/admin-store";
import {
  getDerivedSessionStatus,
  getSessionFillPercent,
  getSessionRemainingSeats,
} from "@/data/admin/selectors";
import { formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { SessionDialog } from "./session-dialog";

interface SessionsTabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
}

export function SessionsTab({ draft, update, errors }: SessionsTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CourseSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseSession | null>(null);

  const sessions = [...draft.sessions].sort((a, b) => a.startDate.localeCompare(b.startDate));

  function saveSessions(next: CourseSession[]) {
    update({ sessions: next });
  }

  function handleSave(session: CourseSession) {
    const exists = draft.sessions.some((entry) => entry.id === session.id);
    saveSessions(
      exists
        ? draft.sessions.map((entry) => (entry.id === session.id ? session : entry))
        : [...draft.sessions, session],
    );
    toast({
      title: exists ? "تم تعديل الموعد" : "تمت إضافة الموعد",
      description: `${formatDate(session.startDate)} — المقاعد المتبقية: ${formatNumber(
        Math.max(0, session.seats - session.registered),
      )}`,
    });
  }

  function handleDuplicate(session: CourseSession) {
    const copy: CourseSession = {
      ...session,
      id: `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      batchName: session.batchName ? `${session.batchName} (نسخة)` : "دفعة (نسخة)",
    };
    saveSessions([...draft.sessions, copy]);
    toast({ title: "تم تكرار الموعد", description: "عدّل التواريخ والمقاعد ثم احفظ الدورة." });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    saveSessions(draft.sessions.filter((entry) => entry.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          كل موعد دفعة انعقاد مستقلة — بسعرها ومقاعدها وحالتها.
        </p>
        <Button
          type="button"
          onClick={() => {
            setEditTarget(null);
            setDialogOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
          إضافة موعد
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="لا مواعيد بعد"
          description="أضف أول موعد انعقاد لهذه الدورة ليظهر في الموقع ولوحة التحكم."
          icon={CalendarClock}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2" aria-label="مواعيد الدورة">
          {sessions.map((session) => {
            const remaining = getSessionRemainingSeats(session);
            const fill = getSessionFillPercent(session);
            const derivedStatus = getDerivedSessionStatus(session);
            const autoFilled = derivedStatus === "full" && session.status !== "full";
            return (
              <li key={session.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal-900">
                      {session.batchName ?? "دفعة بدون اسم"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="num-ltr">
                        {formatDate(session.startDate)}
                        {session.endDate ? ` — ${formatDate(session.endDate)}` : ""}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="num-ltr">
                        {session.startTime}–{session.endTime}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                      {session.location}
                      {/* تجنّب تكرار المدينة إن كانت مضمنة أصلًا في نص المكان */}
                      {!session.location.includes(session.city)
                        ? ` — ${session.city}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={derivedStatus} />
                    {autoFilled ? (
                      <span className="text-[10px] text-charcoal-400">
                        ممتلئة تلقائيًا (المقاعد اكتملت)
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-surface/60 px-2 py-2">
                    <dt className="text-muted-foreground">المقاعد</dt>
                    <dd className="mt-0.5 font-bold text-charcoal-800 num-ltr">
                      {formatNumber(session.seats)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-surface/60 px-2 py-2">
                    <dt className="text-muted-foreground">المسجلون</dt>
                    <dd className="mt-0.5 flex items-center justify-center gap-1 font-bold text-charcoal-800 num-ltr">
                      <Users aria-hidden="true" className="h-3 w-3 text-charcoal-400" />
                      {formatNumber(session.registered)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-brand-50/70 px-2 py-2">
                    <dt className="text-muted-foreground">المتبقي</dt>
                    <dd className="mt-0.5 font-bold text-brand-700 num-ltr">
                      {formatNumber(remaining)}
                    </dd>
                  </div>
                </dl>
                <Progress value={fill} className="mt-2 h-1.5" aria-hidden="true" />

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <span className="text-xs text-muted-foreground">
                    {session.price !== undefined ? (
                      <>
                        سعر الدفعة: <span className="num-ltr">{formatNumber(session.price)}</span> ريال
                      </>
                    ) : (
                      "سعر الدورة الأساسي"
                    )}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                      onClick={() => {
                        setEditTarget(session);
                        setDialogOpen(true);
                      }}
                      aria-label={`تعديل موعد ${session.batchName ?? formatDate(session.startDate)}`}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                      onClick={() => handleDuplicate(session)}
                      aria-label={`تكرار موعد ${session.batchName ?? formatDate(session.startDate)}`}
                    >
                      <Copy aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => setDeleteTarget(session)}
                      aria-label={`حذف موعد ${session.batchName ?? formatDate(session.startDate)}`}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {errors.sessions ? (
        <p role="alert" className="text-xs font-medium text-brand-700">
          {errors.sessions}
        </p>
      ) : null}

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editTarget}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف الموعد"
        description={
          deleteTarget
            ? `سيتم حذف موعد ${deleteTarget.batchName ?? formatDate(deleteTarget.startDate)} مع بيانات مقاعده ومسجليه. هل أنت متأكد؟`
            : ""
        }
        confirmLabel="حذف الموعد"
        onConfirm={handleDelete}
      />
    </div>
  );
}
