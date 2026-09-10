"use client";
/**
 * واجهة إشراف المجتمع — البلاغات + إجراءات الإخفاء/التعليق/الإغلاق.
 * قراءة عبر loadModerationReportsAction (بوابة view) وكتابة عبر أكشنات edit/delete.
 */
import { useCallback, useEffect, useState } from "react";
import { EyeOff, Eye, Ban, CheckCheck, XCircle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  dismissReportAction,
  loadModerationReportsAction,
  resolveReportAction,
  setCommentHiddenAction,
  setMemberSuspendedAction,
  setPostHiddenAction,
} from "@/app/admin/actions/community";
import { formatShortDate } from "@/lib/format";
import { REPORT_REASON_LABELS, type ReportItem } from "@/lib/community/types";

const STATUS_LABELS: Record<ReportItem["status"], string> = {
  open: "مفتوح",
  reviewing: "قيد المراجعة",
  resolved: "مغلق",
  dismissed: "مرفوض",
};

const TARGET_LABELS: Record<ReportItem["targetType"], string> = {
  post: "منشور",
  comment: "تعليق",
  profile: "ملف عضو",
};

export function CommunityModeration() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await loadModerationReportsAction();
      setReports(items);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // التحميل الأول (client component)
  useEffect(() => {
    let cancelled = false;
    void loadModerationReportsAction().then((items) => {
      if (!cancelled) setReports(items);
    }).catch(() => {
      if (!cancelled) toast({ title: "تعذر تحميل البلاغات", variant: "destructive" });
    });
    return () => { cancelled = true; };
  }, []);

  async function run(id: string, runAction: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    setBusyId(id);
    try {
      const result = await runAction() as { ok: boolean; error?: string };
      if (result.ok) {
        toast({ title: successMessage });
        await reload();
      } else {
        toast({ title: "تعذر التنفيذ", description: result.error ?? "", variant: "destructive" });
      }
    } finally {
      setBusyId(null);
    }
  }

  if (reports === null) {
    return (
      <div className="flex justify-center p-10" role="status" aria-label="جارٍ التحميل">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const open = reports.filter((r) => r.status === "open" || r.status === "reviewing");
  const closed = reports.filter((r) => r.status === "resolved" || r.status === "dismissed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {open.length} بلاغ مفتوح من إجمالي {reports.length}
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={refreshing}>
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          تحديث
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          لا بلاغات بعد — المجتمع نظيف حتى الآن.
        </div>
      ) : null}

      {[
        { label: "بلاغات مفتوحة", items: open },
        { label: "بلاغات مغلقة", items: closed },
      ].map((group) =>
        group.items.length > 0 ? (
          <section key={group.label} className="space-y-3" aria-label={group.label}>
            <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
            <ul className="space-y-3">
              {group.items.map((report) => (
                <li key={report.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                      {STATUS_LABELS[report.status]}
                    </Badge>
                    <Badge variant="outline">{TARGET_LABELS[report.targetType]}</Badge>
                    <span className="text-sm font-medium">{REPORT_REASON_LABELS[report.reason]}</span>
                    <span className="ms-auto text-xs text-muted-foreground">
                      بلاغ من @{report.reporterUsername} · {formatShortDate(report.createdAt)}
                    </span>
                  </div>
                  <p className="rounded-lg bg-muted p-3 text-sm" dir="auto">
                    {report.targetPreview}
                  </p>
                  {report.details ? (
                    <p className="text-xs text-muted-foreground">تفاصيل البلّاغ: {report.details}</p>
                  ) : null}
                  {report.status === "open" || report.status === "reviewing" ? (
                    <div className="flex flex-wrap gap-2">
                      {report.targetType === "post" ? (
                        <>
                          <Button size="sm" variant="destructive" disabled={busyId === report.id}
                            onClick={() => run(report.id, () => setPostHiddenAction(report.targetId, true), "تم إخفاء المنشور")}>
                            <EyeOff className="size-4" /> إخفاء المنشور
                          </Button>
                          <Button size="sm" variant="outline" disabled={busyId === report.id}
                            onClick={() => run(report.id, () => setPostHiddenAction(report.targetId, false), "تم استرجاع المنشور")}>
                            <Eye className="size-4" /> استرجاع
                          </Button>
                        </>
                      ) : null}
                      {report.targetType === "comment" ? (
                        <>
                          <Button size="sm" variant="destructive" disabled={busyId === report.id}
                            onClick={() => run(report.id, () => setCommentHiddenAction(report.targetId, true), "تم إخفاء التعليق")}>
                            <EyeOff className="size-4" /> إخفاء التعليق
                          </Button>
                          <Button size="sm" variant="outline" disabled={busyId === report.id}
                            onClick={() => run(report.id, () => setCommentHiddenAction(report.targetId, false), "تم استرجاع التعليق")}>
                            <Eye className="size-4" /> استرجاع
                          </Button>
                        </>
                      ) : null}
                      {report.targetType === "profile" ? (
                        <Button size="sm" variant="destructive" disabled={busyId === report.id}
                          onClick={() => run(report.id, () => setMemberSuspendedAction(report.targetId, true), "تم تعليق العضو")}>
                          <Ban className="size-4" /> تعليق العضو
                        </Button>
                      ) : null}
                      <Button size="sm" disabled={busyId === report.id}
                        onClick={() => run(report.id, () => resolveReportAction(report.id), "أُغلق البلاغ بعد المعالجة")}>
                        <CheckCheck className="size-4" /> إغلاق البلاغ
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === report.id}
                        onClick={() => run(report.id, () => dismissReportAction(report.id), "رُفض البلاغ")}>
                        <XCircle className="size-4" /> رفض البلاغ
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
